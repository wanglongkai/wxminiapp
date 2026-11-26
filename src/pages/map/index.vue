<script setup lang="ts">
import { onLoad, ref } from 'wevu'

definePageJson({
  navigationBarTitleText: '天地图 web-view',
})

// testmap 天地图 H5 实验台的访问地址。
// - 开发者工具模拟器：默认 http://127.0.0.1:5500 即可（需勾选「不校验合法域名」）。
// - 真机调试：改为电脑局域网 IP，例如 http://192.168.x.x:5500；
//   可通过 wx.setStorageSync('webview_base', 'http://192.168.x.x:5500') 覆盖，无需改代码。
// - 线上：必须使用已在小程序管理后台配置的 https 业务域名。
const DEFAULT_BASE = 'http://127.0.0.1:5500'

const src = ref('')
const loadState = ref<'loading' | 'loaded' | 'error'>('loading')
const receivedMessages = ref<unknown[]>([])

interface WebViewMessageEvent {
  detail: { data: unknown[] }
}
interface WebViewLoadEvent {
  detail: { src: string }
}
interface WebViewErrorEvent {
  detail: { url: string, fullUrl?: string }
}

// 网页 postMessage 的消息会在后退、组件销毁、分享、复制链接时统一送达。
function onWebMessage(e: WebViewMessageEvent) {
  const list = e.detail?.data ?? []
  receivedMessages.value.push(...list)
  console.log('[web-view] 收到网页消息:', list)
}

function onWebLoad(e: WebViewLoadEvent) {
  loadState.value = 'loaded'
  console.log('[web-view] 加载成功:', e.detail?.src)
}

function onWebError(e: WebViewErrorEvent) {
  loadState.value = 'error'
  console.error('[web-view] 加载失败:', e.detail?.fullUrl || e.detail?.url)
}

onLoad((options) => {
  const stored = wx.getStorageSync('webview_base') as string
  const base = (options?.base as string) || stored || DEFAULT_BASE
  src.value = `${base.replace(/\/$/, '')}/index.html`
})
</script>

<template>
  <!-- web-view 会自动铺满整个页面并覆盖其它组件，返回依赖原生导航栏与网页内 JSSDK 导航 -->
  <web-view
    :src="src"
    @message="onWebMessage"
    @load="onWebLoad"
    @error="onWebError"
  />
</template>
