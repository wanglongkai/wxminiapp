import { assertConfigured, config } from '../../core/config.js'
import { bearerToken, json } from '../../core/http.js'
import { verifyToken } from '../../core/token.js'
import { userStore } from '../../core/userStore.js'

/**
 * GET /api/user 获取当前登录用户（校验登录态示例）
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handle(req, res) {
  assertConfigured('tokenSecret')
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
}
