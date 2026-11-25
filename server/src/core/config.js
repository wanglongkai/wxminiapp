import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 极简 .env 解析（KEY=VALUE 每行一条），避免引入 dotenv 依赖。
// 已存在的真实环境变量优先于 .env 文件中的值。
function loadEnvFile() {
  try {
    const content = readFileSync(resolve(__dirname, '../../.env'), 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const matched = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
      if (!matched)
        continue
      const [, key, value] = matched
      if (process.env[key] === undefined)
        process.env[key] = value.replace(/^["']|["']$/g, '')
    }
  }
  catch {
    // .env 不存在时忽略，仅使用真实环境变量
  }
}

loadEnvFile()

export const config = {
  port: Number(process.env.PORT ?? 3000),
  appid: process.env.WX_APPID ?? '',
  secret: process.env.WX_SECRET ?? '',
  tokenSecret: process.env.TOKEN_SECRET ?? '',
}

/**
 * 校验必需配置，缺失时抛出带 statusCode 500 的错误（由入口统一兜底响应）。
 * @param {...('appid'|'secret'|'tokenSecret')} keys 该接口依赖的配置项
 */
export function assertConfigured(...keys) {
  const labels = {
    appid: 'WX_APPID',
    secret: 'WX_SECRET',
    tokenSecret: 'TOKEN_SECRET',
  }
  for (const key of keys) {
    if (!config[key]) {
      throw Object.assign(
        new Error(`服务端未配置 ${labels[key]}，请复制 server/.env.example 为 server/.env 并填写`),
        { statusCode: 500 },
      )
    }
  }
}
