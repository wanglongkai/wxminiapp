import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 极简 .env 解析（KEY=VALUE 每行一条），避免引入 dotenv 依赖。
// 已存在的真实环境变量优先于 .env 文件中的值。
function loadEnvFile() {
  try {
    const content = readFileSync(resolve(__dirname, '../.env'), 'utf8')
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
