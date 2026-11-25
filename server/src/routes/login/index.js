import { assertConfigured, config } from '../../core/config.js'
import { json, readJsonBody } from '../../core/http.js'
import { signToken } from '../../core/token.js'
import { userStore } from '../../core/userStore.js'
import { code2session } from './wechat.js'

const TOKEN_TTL_SECONDS = 7 * 24 * 3600 // 登录态有效期 7 天

/**
 * POST /api/login 小程序 code 换登录态
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handle(req, res) {
  assertConfigured('appid', 'secret', 'tokenSecret')
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
}
