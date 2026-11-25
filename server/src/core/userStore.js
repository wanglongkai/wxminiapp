// 内存用户表：key 为 openid。
// 供 login（写入）与 user（读取）接口共享；接口专属逻辑不要放在这里。
// 演示用途即可满足；生产环境应替换为数据库 + Redis（session_key 不应长期驻留内存）。
const users = new Map()

export const userStore = {
  /**
   * 登录成功后写入/更新用户，并刷新登录时间。
   * @param {string} openid
   * @param {string} sessionKey
   */
  upsert(openid, sessionKey) {
    const existed = users.get(openid)
    const user = {
      openid,
      sessionKey,
      createdAt: existed?.createdAt ?? new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    }
    users.set(openid, user)
    return user
  },

  /**
   * @param {string} openid
   */
  get(openid) {
    return users.get(openid)
  },
}
