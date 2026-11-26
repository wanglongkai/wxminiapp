/* ============================================================
   天地图 · web-view 实验台 — 应用逻辑
   模块：工具 / 日志 / 环境探测 / 天地图引擎 / 地图控制 /
         微信 JSSDK 调试 / 面板交互
   ============================================================ */
'use strict'

/* ---------- 工具 ---------- */
const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
const fmt = (n, d = 6) => Number(n).toFixed(d)
const now = () => new Date().toTimeString().slice(0, 8)

const DEFAULT_CENTER = { lng: 116.407526, lat: 39.904030 } // 北京
const DEFAULT_ZOOM = 12
const SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7']
const CITIES = [
  { name: '北京', lng: 116.407526, lat: 39.904030 },
  { name: '上海', lng: 121.473701, lat: 31.230416 },
  { name: '广州', lng: 113.264434, lat: 23.129162 },
  { name: '成都', lng: 104.066541, lat: 30.572269 },
  { name: '西安', lng: 108.940174, lat: 34.341568 },
  { name: '拉萨', lng: 91.140856, lat: 29.645554 },
  { name: '乌鲁木齐', lng: 87.616848, lat: 43.825592 },
  { name: '哈尔滨', lng: 126.534967, lat: 45.803775 },
  { name: '三亚', lng: 109.511909, lat: 18.252847 },
  { name: '武汉', lng: 114.305392, lat: 30.593098 },
]

const state = {
  tk: localStorage.getItem('tianditu_tk') || '',
  mapReady: false,
  baseType: 'vec',
  annoOn: true,
  markers: [],
  markBatch: 5,
  msgSent: 0,
  chosenImages: [],
  env: { miniprogram: false, wechat: false, platform: '未知', appid: '', foreground: null },
  logFilter: 'all',
}

let map = null
let baseLayer = null
let annoLayer = null

/* ---------- 日志 ---------- */
const logs = []
const logList = $('#logList')
const logEmpty = $('#logEmpty')

function log(kind, tag, msg, cat = 'sys') {
  const entry = { time: now(), kind, tag, msg, cat }
  logs.unshift(entry)
  if (logs.length > 300) logs.pop()
  renderLog()
  const con = kind === 'error' ? console.error : kind === 'warn' ? console.warn : console.log
  con(`[tianditu][${tag}] ${msg}`)
}

function renderLog() {
  const f = state.logFilter
  const visible = logs.filter((e) => {
    if (f === 'all') return true
    if (f === 'error') return e.kind === 'error'
    return e.cat === f
  })
  logEmpty.style.display = visible.length ? 'none' : 'block'
  $$('.log-item', logList).forEach((n) => n.remove())
  const frag = document.createDocumentFragment()
  for (const e of visible) {
    const div = document.createElement('div')
    div.className = 'log-item'
    div.dataset.kind = e.kind
    div.innerHTML = `<span class="log-item__time">${e.time}</span><span class="log-item__tag">${e.tag}</span><span class="log-item__msg">${e.msg}</span>`
    frag.appendChild(div)
  }
  logList.appendChild(frag)
}

/* ---------- Toast ---------- */
const toastStack = $('#toastStack')
function toast(msg, kind = 'info') {
  const el = document.createElement('div')
  el.className = 'toast'
  el.dataset.kind = kind
  el.textContent = msg
  toastStack.appendChild(el)
  setTimeout(() => {
    el.classList.add('out')
    setTimeout(() => el.remove(), 320)
  }, 2200)
}

/* ---------- 环境探测 ---------- */
const envPill = $('#envPill')
const envPillText = $('#envPillText')

function detectPlatform(ua) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/ArkWeb/i.test(ua) && /MicroMessenger/i.test(ua)) return 'HarmonyOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac OS X/i.test(ua)) return 'macOS'
  return '未知'
}

function detectEnv() {
  const ua = navigator.userAgent
  const isMini = window.__wxjs_environment === 'miniprogram' || /miniProgram/i.test(ua)
  const isWechat = /MicroMessenger/i.test(ua)
  const appidMatch = ua.match(/miniProgram\/(\w+)/i)
  state.env.miniprogram = isMini
  state.env.wechat = isWechat
  state.env.platform = detectPlatform(ua)
  state.env.appid = appidMatch ? appidMatch[1] : ''

  const envName = isMini ? 'miniprogram' : isWechat ? 'wechat' : 'browser'
  envPill.dataset.env = envName
  envPillText.textContent = isMini ? '小程序 web-view' : isWechat ? '微信浏览器' : '普通浏览器'

  $('#uaBox').textContent = ua
  renderEnvCards()

  // JSSDK getEnv 二次确认
  if (window.wx && wx.miniProgram && typeof wx.miniProgram.getEnv === 'function') {
    wx.miniProgram.getEnv((res) => {
      state.env.getEnv = res.miniprogram
      renderEnvCards()
      log('info', 'ENV', `wx.miniProgram.getEnv → miniprogram=<code>${res.miniprogram}</code>`, 'env')
    })
  }

  // 前台状态监听（微信 7.0.3+）
  if (window.WeixinJSBridge && typeof WeixinJSBridge.on === 'function') {
    try {
      WeixinJSBridge.on('onPageStateChange', (res) => {
        state.env.foreground = res.active
        renderEnvCards()
        log('info', 'ENV', `页面状态变化 → active=<code>${res.active}</code>`, 'env')
      })
    } catch (e) { /* 忽略不支持的环境 */ }
  }
  log('info', 'ENV', `环境探测完成：${envPillText.textContent} / ${state.env.platform}`, 'env')
}

function envCard(k, v, tone = '') {
  return `<div class="env-card ${tone ? 'env-card--' + tone : ''}"><div class="env-card__k">${k}</div><div class="env-card__v">${v}</div></div>`
}

function renderEnvCards() {
  const e = state.env
  const jssdk = window.wx ? '已加载' : '未加载'
  const mpApi = window.wx && wx.miniProgram ? '可用' : '不可用'
  const html = [
    envCard('运行环境', e.miniprogram ? '小程序 web-view' : e.wechat ? '微信内置浏览器' : '普通浏览器', e.miniprogram ? 'ok' : 'warn'),
    envCard('window.__wxjs_environment', String(window.__wxjs_environment ?? 'undefined')),
    envCard('getEnv 结果', e.getEnv === undefined ? '探测中…' : `miniprogram: ${e.getEnv}`, e.getEnv ? 'ok' : ''),
    envCard('小程序 AppID', e.appid || '未携带（微信 Android 8.0.16 / iOS 8.0.17+ 携带）', e.appid ? 'ok' : ''),
    envCard('操作系统平台', e.platform),
    envCard('前台状态', e.foreground === null ? '未监听 / 未知' : e.foreground ? '前台 active' : '后台 inactive', e.foreground === false ? 'warn' : ''),
    envCard('JSSDK / miniProgram', `${jssdk} · wx.miniProgram ${mpApi}`, window.wx ? 'ok' : 'warn'),
  ].join('')
  $('#envCards').innerHTML = html
}

/* ---------- 天地图引擎 ---------- */
const mapOverlay = $('#mapOverlay')
const gateCard = $('#gateCard')

function tileUrl(type, tk) {
  // 天地图 4.0 的 T.TileLayer 不识别 subdomains 选项（内部固定 "abc"，会拼出
  // 不存在的 ta/tb/tc.tianditu.gov.cn 导致瓦片全部 DNS 失败），
  // 因此不用 {s} 模板，直接随机选用可用的 t0~t7 子域。
  const s = SUBDOMAINS[Math.floor(Math.random() * SUBDOMAINS.length)]
  return `https://t${s}.tianditu.gov.cn/${type}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${type}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`
}
const ANNO_OF = { vec: 'cva', img: 'cia', ter: 'cta' }

function showGate(message) {
  mapOverlay.hidden = false
  gateCard.style.display = 'block'
  $('#tkInput').value = state.tk
  if (message) {
    let p = $('#gateError')
    if (!p) {
      p = document.createElement('p')
      p.id = 'gateError'
      p.style.cssText = 'margin:12px 0 0;font-size:12px;color:var(--rose)'
      gateCard.appendChild(p)
    }
    p.textContent = message
  }
}

function loadTianditu(tk) {
  state.tk = tk
  localStorage.setItem('tianditu_tk', tk)
  log('info', 'MAP', `正在加载天地图 JS API v4.0 …`, 'map')
  mapOverlay.hidden = false
  gateCard.style.display = 'none'

  if (window.T && typeof window.T.Map === 'function') {
    initMap()
    return
  }
  const script = document.createElement('script')
  script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${encodeURIComponent(tk)}`
  script.onload = () => {
    if (window.T && typeof window.T.Map === 'function') initMap()
    else showGate('API 已加载但未检测到 T.Map，请检查密钥类型是否为「浏览器端」。')
  }
  script.onerror = () => {
    showGate('天地图 API 加载失败，请检查网络或密钥是否有效。')
    log('error', 'MAP', '天地图 API 脚本加载失败', 'map')
  }
  document.head.appendChild(script)
}

function makeLayer(type, tk) {
  return new T.TileLayer(tileUrl(type, tk), { minZoom: 1, maxZoom: 18 })
}

function applyBaseLayer() {
  if (!map) return
  if (baseLayer) map.removeLayer(baseLayer)
  if (annoLayer) { map.removeLayer(annoLayer); annoLayer = null }
  baseLayer = makeLayer(state.baseType, state.tk)
  map.addLayer(baseLayer)
  if (state.annoOn) {
    annoLayer = makeLayer(ANNO_OF[state.baseType], state.tk)
    map.addLayer(annoLayer)
  }
}

function initMap() {
  try {
    map = new T.Map('map')
    map.centerAndZoom(new T.LngLat(DEFAULT_CENTER.lng, DEFAULT_CENTER.lat), DEFAULT_ZOOM)
    // 清除可能存在的默认底图，避免图层叠加
    if (typeof map.getLayers === 'function') {
      map.getLayers().slice().forEach((l) => { try { map.removeLayer(l) } catch (e) {} })
    }
    applyBaseLayer()
    if (T.Control && T.Control.Scale) map.addControl(new T.Control.Scale())

    map.addEventListener('click', onMapClick)
    map.addEventListener('zoomend', syncHud)
    map.addEventListener('moveend', syncHud)

    state.mapReady = true
    mapOverlay.hidden = true
    syncHud()
    syncZoomRange()
    log('success', 'MAP', `地图初始化完成，中心 <code>${fmt(DEFAULT_CENTER.lng)}, ${fmt(DEFAULT_CENTER.lat)}</code> zoom ${DEFAULT_ZOOM}`, 'map')
    toast('天地图加载成功', 'success')
  } catch (err) {
    showGate('地图初始化异常：' + err.message)
    log('error', 'MAP', '地图初始化异常：' + err.message, 'map')
  }
}

/* ---------- 地图控制 ---------- */
function lnglatOf(obj) {
  if (!obj) return null
  const lng = typeof obj.getLng === 'function' ? obj.getLng() : obj.lng
  const lat = typeof obj.getLat === 'function' ? obj.getLat() : obj.lat
  return { lng, lat }
}

function syncHud() {
  if (!map) return
  const c = lnglatOf(map.getCenter())
  if (c) {
    $('#hudLng').textContent = fmt(c.lng)
    $('#hudLat').textContent = fmt(c.lat)
  }
  $('#hudZoom').textContent = map.getZoom()
  $('#hudMarkers').textContent = state.markers.length
  $('#markerCount').textContent = state.markers.length + ' 个'
}

function syncZoomRange() {
  if (!map) return
  const z = map.getZoom()
  const range = $('#zoomRange')
  range.value = z
  $('#zoomOutVal').textContent = z
  paintRange(range)
}

function paintRange(range) {
  const min = +range.min, max = +range.max, val = +range.value
  range.style.setProperty('--fill', ((val - min) / (max - min)) * 100 + '%')
}

function addMarker(lng, lat, label) {
  if (!map) return
  const marker = new T.Marker(new T.LngLat(lng, lat))
  map.addOverLay(marker)
  const content = `<div style="font:12px/1.6 'JetBrains Mono',monospace;color:#0a1a2b;padding:2px 4px"><b>${label || '标记点'}</b><br/>${fmt(lng)}, ${fmt(lat)}</div>`
  marker.addEventListener('click', () => {
    const info = new T.InfoWindow(content, { offset: new T.Point(0, -24) })
    marker.openInfoWindow(info)
  })
  state.markers.push(marker)
  syncHud()
  return marker
}

function onMapClick(e) {
  const ll = lnglatOf(e.lnglat || e.latlng)
  if (!ll) return
  addMarker(ll.lng, ll.lat, '点击落点')
  log('info', 'MAP', `点击落点 <code>${fmt(ll.lng)}, ${fmt(ll.lat)}</code>`, 'map')
}

function clearMarkers() {
  state.markers.forEach((m) => { try { map.removeOverLay(m) } catch (e) {} })
  state.markers = []
  syncHud()
  log('warn', 'MAP', '已清空全部标记', 'map')
  toast('标记已清空', 'warn')
}

function randomMarkers() {
  if (!map) return toast('请先加载地图', 'warn')
  const c = lnglatOf(map.getCenter())
  const span = 0.08
  for (let i = 0; i < state.markBatch; i++) {
    const lng = c.lng + (Math.random() - 0.5) * span
    const lat = c.lat + (Math.random() - 0.5) * span
    addMarker(lng, lat, `随机 #${i + 1}`)
  }
  log('success', 'MAP', `批量生成 ${state.markBatch} 个随机标记`, 'map')
  toast(`已生成 ${state.markBatch} 个标记`, 'success')
}

function setZoom(z) {
  if (!map) return
  map.setZoom(clamp(z, 3, 18))
}

function resetView() {
  if (!map) return toast('请先加载地图', 'warn')
  map.centerAndZoom(new T.LngLat(DEFAULT_CENTER.lng, DEFAULT_CENTER.lat), DEFAULT_ZOOM)
  log('info', 'MAP', '视图已重置到北京', 'map')
  toast('视图已重置', 'info')
}

function randomView() {
  if (!map) return toast('请先加载地图', 'warn')
  const city = CITIES[Math.floor(Math.random() * CITIES.length)]
  const z = 9 + Math.floor(Math.random() * 7)
  map.centerAndZoom(new T.LngLat(city.lng, city.lat), z)
  addMarker(city.lng, city.lat, city.name)
  log('info', 'MAP', `随机视角 → ${city.name} zoom ${z}`, 'map')
  toast(`已切换到 ${city.name}`, 'info')
}

async function searchPlace() {
  const q = $('#searchInput').value.trim()
  if (!q) return toast('请输入地名', 'warn')
  if (!state.tk) return toast('请先配置密钥', 'warn')
  log('info', 'MAP', `检索地点：<code>${q}</code>`, 'map')
  try {
    const ds = encodeURIComponent(JSON.stringify({ keyWord: q }))
    const res = await fetch(`https://api.tianditu.gov.cn/geocoder?ds=${ds}&tk=${state.tk}`)
    const data = await res.json()
    const loc = data.location || (data.result && data.result.location)
    if (loc && loc.lon != null) {
      const lng = +loc.lon, lat = +loc.lat
      if (map) {
        map.centerAndZoom(new T.LngLat(lng, lat), 15)
        addMarker(lng, lat, q)
      }
      log('success', 'MAP', `检索命中 <code>${fmt(lng)}, ${fmt(lat)}</code>`, 'map')
      toast(`已定位：${q}`, 'success')
    } else {
      log('warn', 'MAP', `未检索到「${q}」：${JSON.stringify(data).slice(0, 120)}`, 'map')
      toast('未检索到该地点', 'warn')
    }
  } catch (err) {
    log('error', 'MAP', '检索请求失败：' + err.message, 'map')
    toast('检索失败', 'error')
  }
}

function locateMe() {
  if (!map) return toast('请先加载地图', 'warn')
  log('info', 'DEV', '请求定位…', 'dev')
  const done = (lng, lat, src) => {
    map.centerAndZoom(new T.LngLat(lng, lat), 16)
    addMarker(lng, lat, '我的位置')
    log('success', 'DEV', `定位成功（${src}）<code>${fmt(lng)}, ${fmt(lat)}</code>`, 'dev')
    toast('定位成功', 'success')
  }
  const fail = (msg) => { log('error', 'DEV', '定位失败：' + msg, 'dev'); toast('定位失败', 'error') }

  if (state.env.miniprogram && window.wx && wx.getLocation) {
    wx.getLocation({
      type: 'wgs84',
      success: (r) => done(r.longitude, r.latitude, 'wx.getLocation'),
      fail: (e) => fail(e.errMsg || JSON.stringify(e)),
    })
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (p) => done(p.coords.longitude, p.coords.latitude, 'navigator.geolocation'),
      (e) => fail(e.message),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  } else {
    fail('当前环境不支持定位')
  }
}

/* ---------- 微信 JSSDK 调试 ---------- */
function mp() {
  return window.wx && wx.miniProgram ? wx.miniProgram : null
}
function requireMini(apiName) {
  if (!window.wx) { log('error', 'JSSDK', '微信 JSSDK 未加载', 'dev'); toast('JSSDK 未加载', 'error'); return false }
  if (!state.env.miniprogram) {
    log('warn', 'NAV', `${apiName} 仅在小程序 web-view 内生效，当前为${envPillText.textContent}`, 'nav')
    toast('仅小程序 web-view 内可用', 'warn')
    return false
  }
  return true
}

function setBtnState(btn, s) {
  if (!btn) return
  if (s) btn.dataset.state = s
  else delete btn.dataset.state
  if (s === 'ok' || s === 'fail') setTimeout(() => { if (btn.dataset.state === s) delete btn.dataset.state }, 1800)
}

const NAV_TARGETS = {
  navigateTo: '/pages/device/index',
  redirectTo: '/pages/login/index',
  reLaunch: '/pages/index/index',
  switchTab: '/pages/index/index',
}

function callNav(api, btn) {
  if (!requireMini(api)) return setBtnState(btn, 'fail')
  const m = mp()
  if (api === 'navigateBack') {
    m.navigateBack({ delta: 1 })
    log('success', 'NAV', '调用 navigateBack(delta:1)', 'nav')
    setBtnState(btn, 'ok')
    return
  }
  const url = NAV_TARGETS[api]
  if (api === 'switchTab') {
    log('warn', 'NAV', `调用 switchTab → ${url}（本应用无 tabBar，预期失败）`, 'nav')
  } else {
    log('success', 'NAV', `调用 ${api} → <code>${url}</code>`, 'nav')
  }
  m[api]({ url })
  setBtnState(btn, api === 'switchTab' ? 'fail' : 'ok')
  toast(`已调用 ${api}`, api === 'switchTab' ? 'warn' : 'success')
}

function postMessage() {
  if (!requireMini('postMessage')) return
  const raw = $('#msgInput').value.trim()
  let data
  try { data = JSON.parse(raw) } catch (e) { data = raw }
  mp().postMessage({ data })
  state.msgSent++
  $('#msgCount').textContent = `已发 ${state.msgSent}`
  log('msg', 'MSG', `postMessage 发送：<code>${escapeHtml(JSON.stringify(data))}</code>（后退/销毁/分享时送达）`, 'msg')
  toast('消息已发送', 'success')
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function callDevice(api, btn) {
  if (!window.wx) { log('error', 'DEV', '微信 JSSDK 未加载', 'dev'); return setBtnState(btn, 'fail') }
  setBtnState(btn, 'loading')
  const ok = (msg) => { log('success', 'DEV', `${api} 成功：${msg}`, 'dev'); setBtnState(btn, 'ok'); toast(`${api} 成功`, 'success') }
  const bad = (msg) => { log('error', 'DEV', `${api} 失败：${msg}`, 'dev'); setBtnState(btn, 'fail'); toast(`${api} 失败`, 'error') }
  const errMsg = (e) => (e && (e.errMsg || e.errmsg)) || JSON.stringify(e)

  switch (api) {
    case 'getEnv':
      if (!mp()) { bad('wx.miniProgram 不可用'); break }
      mp().getEnv((res) => { state.env.getEnv = res.miniprogram; renderEnvCards(); ok(`miniprogram=${res.miniprogram}`) })
      break
    case 'getNetworkType':
      wx.getNetworkType({ success: (r) => ok(`networkType=<code>${r.networkType}</code>`), fail: (e) => bad(errMsg(e)) })
      break
    case 'getLocation':
      wx.getLocation({
        type: 'wgs84',
        success: (r) => {
          ok(`<code>${fmt(r.longitude)}, ${fmt(r.latitude)}</code>`)
          if (map) { map.centerAndZoom(new T.LngLat(r.longitude, r.latitude), 16); addMarker(r.longitude, r.latitude, 'JSSDK 定位') }
        },
        fail: (e) => bad(errMsg(e)),
      })
      break
    case 'openLocation': {
      const c = map ? lnglatOf(map.getCenter()) : DEFAULT_CENTER
      wx.openLocation({
        latitude: c.lat, longitude: c.lng, name: '天地图实验台', address: '当前地图中心点', scale: 15,
        success: () => ok('已打开内置地图'), fail: (e) => bad(errMsg(e)),
      })
      break
    }
    case 'scanQRCode':
      wx.scanQRCode({
        needResult: 1, scanType: ['qrCode', 'barCode'],
        success: (r) => ok(`result=<code>${escapeHtml(r.resultStr || '')}</code>`), fail: (e) => bad(errMsg(e)),
      })
      break
    case 'chooseImage':
      wx.chooseImage({
        count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
        success: (r) => { state.chosenImages = r.localIds || []; ok(`选中 ${state.chosenImages.length} 张`) },
        fail: (e) => bad(errMsg(e)),
      })
      break
    case 'previewImage':
      if (!state.chosenImages.length) { bad('请先 chooseImage 选择图片'); break }
      wx.previewImage({ current: state.chosenImages[0], urls: state.chosenImages, success: () => ok('已预览'), fail: (e) => bad(errMsg(e)) })
      break
    case 'checkJSApi':
      wx.checkJsApi({
        jsApiList: ['getLocation', 'scanQRCode', 'chooseImage', 'previewImage', 'openLocation', 'getNetworkType'],
        success: (r) => ok(`<code>${escapeHtml(JSON.stringify(r.checkResult))}</code>`), fail: (e) => bad(errMsg(e)),
      })
      break
    default:
      bad('未知接口')
  }
}

/* ---------- 面板 / 标签交互 ---------- */
function initTabs() {
  const tabs = $$('.tab')
  const indicator = $('#tabIndicator')
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)))
      indicator.style.transform = `translateX(${i * 100}%)`
      $$('.tab-page').forEach((p) => { p.dataset.active = String(p.dataset.tab === tab.dataset.tab) })
    })
  })
}

function initPanelHandle() {
  const panel = $('#panel')
  const handle = $('#panelHandle')
  let startY = 0, startH = 0, moved = false
  handle.addEventListener('pointerdown', (e) => {
    startY = e.clientY
    startH = panel.getBoundingClientRect().height
    moved = false
    handle.setPointerCapture(e.pointerId)
  })
  handle.addEventListener('pointermove', (e) => {
    if (!handle.hasPointerCapture(e.pointerId)) return
    const dy = startY - e.clientY
    if (Math.abs(dy) > 4) moved = true
    const h = clamp(startH + dy, 46, window.innerHeight * 0.82)
    panel.style.height = h + 'px'
    panel.dataset.collapsed = String(h <= 60)
  })
  handle.addEventListener('pointerup', (e) => {
    if (!moved) {
      const collapsed = panel.dataset.collapsed === 'true'
      panel.dataset.collapsed = String(!collapsed)
      panel.style.height = collapsed ? '' : '46px'
    }
    try { handle.releasePointerCapture(e.pointerId) } catch (err) {}
  })
}

/* ---------- 绑定 ---------- */
function bindControls() {
  // 密钥
  $('#keyBtn').addEventListener('click', () => showGate())
  $('#loadMapBtn').addEventListener('click', () => {
    const tk = $('#tkInput').value.trim()
    if (!tk) return toast('请输入天地图密钥', 'warn')
    loadTianditu(tk)
  })
  $('#tkInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#loadMapBtn').click() })

  // 底图分段
  $$('#baseLayerSeg button').forEach((b) => {
    b.addEventListener('click', () => {
      $$('#baseLayerSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
      state.baseType = b.dataset.layer
      applyBaseLayer()
      log('info', 'MAP', `切换底图 → ${b.textContent}`, 'map')
    })
  })

  // 注记开关
  const anno = $('#annoSwitch')
  const toggleAnno = () => {
    state.annoOn = !state.annoOn
    anno.setAttribute('aria-checked', String(state.annoOn))
    applyBaseLayer()
    log('info', 'MAP', `注记标注 ${state.annoOn ? '开启' : '关闭'}`, 'map')
  }
  anno.addEventListener('click', toggleAnno)
  anno.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAnno() } })

  // 缩放
  const zoomRange = $('#zoomRange')
  zoomRange.addEventListener('input', () => {
    $('#zoomOutVal').textContent = zoomRange.value
    paintRange(zoomRange)
    setZoom(+zoomRange.value)
  })

  // 亮度 / 饱和
  const bright = $('#brightRange'), sat = $('#satRange')
  bright.addEventListener('input', () => {
    $('#brightVal').textContent = bright.value + '%'
    paintRange(bright)
    document.documentElement.style.setProperty('--tile-brightness', bright.value / 100)
  })
  sat.addEventListener('input', () => {
    $('#satVal').textContent = sat.value + '%'
    paintRange(sat)
    document.documentElement.style.setProperty('--tile-saturate', sat.value / 100)
  })

  // 标记步进
  $('#markMinus').addEventListener('click', () => { state.markBatch = clamp(state.markBatch - 1, 1, 50); $('#markBatch').textContent = state.markBatch })
  $('#markPlus').addEventListener('click', () => { state.markBatch = clamp(state.markBatch + 1, 1, 50); $('#markBatch').textContent = state.markBatch })
  $('#randomMarkBtn').addEventListener('click', randomMarkers)
  $('#clearMarkBtn').addEventListener('click', clearMarkers)

  // 检索 / 视图
  $('#searchBtn').addEventListener('click', searchPlace)
  $('#searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPlace() })
  $('#randomViewBtn').addEventListener('click', randomView)
  $('#resetViewBtn').addEventListener('click', resetView)
  $('#resetViewBtn2').addEventListener('click', resetView)

  // 工具条
  $('#zoomIn').addEventListener('click', () => { setZoom((map ? map.getZoom() : DEFAULT_ZOOM) + 1); syncZoomRange() })
  $('#zoomOut').addEventListener('click', () => { setZoom((map ? map.getZoom() : DEFAULT_ZOOM) - 1); syncZoomRange() })
  $('#locateBtn').addEventListener('click', locateMe)
  $('#cycleLayerBtn').addEventListener('click', () => {
    const order = ['vec', 'img', 'ter']
    const next = order[(order.indexOf(state.baseType) + 1) % order.length]
    $(`#baseLayerSeg button[data-layer="${next}"]`).click()
  })
  const cross = $('#crosshairBtn')
  cross.addEventListener('click', () => {
    const on = cross.getAttribute('aria-pressed') !== 'true'
    cross.setAttribute('aria-pressed', String(on))
    $('#reticle').dataset.on = String(on)
  })

  // JSSDK 导航 / 设备
  $$('.api-btn[data-api]').forEach((btn) => {
    const api = btn.dataset.api
    btn.addEventListener('click', () => {
      if (NAV_TARGETS[api] || api === 'navigateBack') callNav(api, btn)
      else callDevice(api, btn)
    })
  })
  $('#postMsgBtn').addEventListener('click', postMessage)

  // 环境
  $('#redetectBtn').addEventListener('click', detectEnv)

  // 日志过滤 / 清空
  $$('.chip[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('.chip[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)))
      state.logFilter = chip.dataset.filter
      renderLog()
    })
  })
  $('#clearLogBtn').addEventListener('click', () => { logs.length = 0; renderLog(); toast('日志已清空', 'info') })

  // 滑杆初始填充
  $$('.range').forEach(paintRange)
}

/* ---------- 启动 ---------- */
function boot() {
  initTabs()
  initPanelHandle()
  bindControls()
  detectEnv()
  log('info', 'SYS', '天地图 web-view 实验台已启动', 'sys')
  if (state.tk) {
    loadTianditu(state.tk)
  } else {
    showGate()
    log('warn', 'MAP', '尚未配置天地图密钥，请在地图面板填入 tk', 'map')
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
else boot()