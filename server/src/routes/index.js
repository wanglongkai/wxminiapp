import { json } from '../core/http.js'
import { handle as handleHealth } from './health/index.js'
import { handle as handleLogin } from './login/index.js'
import { handle as handleUser } from './user/index.js'

/**
 * 路由表：新增接口时按以下步骤操作
 * 1. 在 routes/ 下新建一个目录（如 routes/order/），
 *    目录内放 index.js（导出 handle 函数）和该接口专属的工具函数；
 * 2. 在下方 import 并登记一条 { method, path, handler }。
 * 约定：
 * - handler 签名统一为 (req, res, url)，url 为已解析的 URL 对象（可取 query 参数）；
 * - 接口专属工具放自己的目录，跨接口共享的能力沉淀到 core/；
 * - 业务错误用 json() 直接响应，或 throw httpError(statusCode, message) 交给入口兜底。
 */
const routes = [
  { method: 'GET', path: '/health', handler: handleHealth },
  { method: 'POST', path: '/api/login', handler: handleLogin },
  { method: 'GET', path: '/api/user', handler: handleUser },
]

/**
 * 主分发函数：按 method + pathname 匹配并调用对应接口的 handle。
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 */
export async function dispatch(req, res, url) {
  const route = routes.find(item => item.method === req.method && item.path === url.pathname)
  if (!route) {
    json(res, 404, { error: 'Not Found' })
    return
  }
  await route.handler(req, res, url)
}
