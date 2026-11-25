// 各接口共用的 HTTP 工具函数，接口内不要重复实现。

/**
 * 输出 JSON 响应。
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {unknown} data
 */
export function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(data))
}

/**
 * 读取并解析 JSON 请求体；空请求体返回 {}。
 * 解析失败时 reject 带 statusCode 400 的错误。
 * @param {import('node:http').IncomingMessage} req
 */
export function readJsonBody(req) {
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
        reject(Object.assign(new Error('请求体不是合法 JSON'), { statusCode: 400 }))
      }
    })
    req.on('error', reject)
  })
}

/**
 * 从 Authorization 头中取出 Bearer token，无则返回空字符串。
 * @param {import('node:http').IncomingMessage} req
 */
export function bearerToken(req) {
  const header = req.headers.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

/**
 * 构造带 HTTP 状态码的错误，接口内直接 throw 即可，由入口统一兜底响应。
 * @param {number} statusCode
 * @param {string} message
 */
export function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode })
}
