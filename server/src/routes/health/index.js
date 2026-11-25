import { json } from '../../core/http.js'

/**
 * GET /health 健康检查
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handle(req, res) {
  json(res, 200, { ok: true, service: 'wx-login-server' })
}
