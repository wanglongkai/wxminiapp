import { createServer } from 'node:http'
import { config } from './core/config.js'
import { json } from './core/http.js'
import { dispatch } from './routes/index.js'

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
    // 所有接口经 routes/index.js 的主分发函数路由
    await dispatch(req, res, url)
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
