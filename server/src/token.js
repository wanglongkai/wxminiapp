import { createHmac, timingSafeEqual } from 'node:crypto'

// 自签名 token（JWT 风格的 header.payload.signature），
// 使用 HMAC-SHA256 签名，零依赖实现。

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

/**
 * 签发 token。
 * @param {object} payload 载荷，需包含 exp（Unix 秒级过期时间）
 * @param {string} secret 签名密钥
 */
export function signToken(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url')
  return `${header}.${body}.${signature}`
}

/**
 * 校验 token，合法且未过期时返回载荷，否则返回 null。
 * @param {string} token
 * @param {string} secret 签名密钥
 */
export function verifyToken(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3)
    return null
  const [header, body, signature] = parts

  const expected = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url')

  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer))
    return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now())
      return null
    return payload
  }
  catch {
    return null
  }
}
