import { createServer } from 'node:http'
import { config } from './config.js'
import { code2session } from './wechat.js'
import { signToken, verifyToken } from './token.js'
import { userStore } from './userStore.js'

const TOKEN_TTL_SECONDS = 7 * 24 * 3600 // 登录态有效期 7 天

function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(data))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1e6)
        req.destroy() // 请求体过大，直接断开
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      }
      catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

function bearerToken(req) {
  const header = req.headers.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

function assertConfigured() {
  if (!config.appid || !config.secret) {
    throw Object.assign(new Error('服务端未配置 WX_APPID / WX_SECRET，请复制 server/.env.example 为 server/.env 并填写'), { statusCode: 500 })
  }
  if (!config.tokenSecret) {
    throw Object.assign(new Error('服务端未配置 TOKEN_SECRET'), { statusCode: 500 })
  }
}

const server = createServer(async (req, res) => {
  // 简单 CORS：本地 dev:web 调试或第三方 H5 调用时放行
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  try {
    // 健康检查
    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, { ok: true, service: 'wx-login-server' })
      return
    }

    // 登录：小程序 code 换登录态
    if (req.method === 'POST' && url.pathname === '/api/login') {
      assertConfigured()
      const body = await readJsonBody(req)
      if (typeof body.code !== 'string' || !body.code) {
        json(res, 400, { error: '缺少参数 code' })
        return
      }
      try {
        const { openid, session_key } = await code2session({
          appid: config.appid,
          secret: config.secret,
          code: body.code,
        })
        const user = userStore.upsert(openid, session_key)
        const token = signToken(
          { openid, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS },
          config.tokenSecret,
        )
        // 注意：session_key 只保存在服务端，绝不下发给小程序端
        json(res, 200, { token, openid, user })
      }
      catch (error) {
        json(res, 502, { error: error.message, code: error.code })
      }
      return
    }

    // 获取当前登录用户（校验登录态示例）
    if (req.method === 'GET' && url.pathname === '/api/user') {
      assertConfigured()
      const payload = verifyToken(bearerToken(req), config.tokenSecret)
      if (!payload) {
        json(res, 401, { error: '登录态无效或已过期' })
        return
      }
      const user = userStore.get(payload.openid)
      if (!user) {
        json(res, 404, { error: '用户不存在' })
        return
      }
      json(res, 200, { user })
      return
    }

    json(res, 404, { error: 'Not Found' })
  }
  catch (error) {
    json(res, error.statusCode ?? 500, { error: error.message })
  }
})

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[wx-login-server] listening on http://127.0.0.1:${config.port}`)
  if (!config.appid || !config.secret) {
    // eslint-disable-next-line no-console
    console.warn('[wx-login-server] 警告: 未配置 WX_APPID / WX_SECRET，登录接口暂不可用，请配置 server/.env')
  }
  if (!config.tokenSecret) {
    // eslint-disable-next-line no-console
    console.warn('[wx-login-server] 警告: 未配置 TOKEN_SECRET，请配置 server/.env')
  }
})
