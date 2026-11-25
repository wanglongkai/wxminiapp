const CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session'

/**
 * 用小程序登录凭证 code 换取 openid 与 session_key。
 * 登录接口专属工具，其他接口如需使用请复制或沉淀到 core/。
 * 官方文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
 *
 * @param {{ appid: string, secret: string, code: string }} options
 * @returns {Promise<{ openid: string, session_key: string, unionid?: string }>}
 */
export async function code2session({ appid, secret, code }) {
  const query = new URLSearchParams({
    appid,
    secret,
    js_code: code,
    grant_type: 'authorization_code',
  })
  const response = await fetch(`${CODE2SESSION_URL}?${query}`)
  if (!response.ok) {
    throw new Error(`微信接口请求失败: HTTP ${response.status}`)
  }
  const data = await response.json()
  if (data.errcode) {
    const error = new Error(`code2session 失败: ${data.errcode} ${data.errmsg}`)
    error.code = data.errcode
    throw error
  }
  return data
}
