<script setup lang="ts">
import { onLoad, ref } from 'wevu'

definePageJson({
  navigationBarTitleText: '登录与用户信息',
})

// 开发环境指向本机服务端（DevTools 需勾选「不校验合法域名」）。
// 真机调试请改为电脑的局域网 IP，例如 http://192.168.x.x:3000；线上请使用 https 域名。
const API_BASE = 'http://127.0.0.1:3000'
const TOKEN_KEY = 'auth_token'

interface UserInfo {
  openid: string
  createdAt: string
  lastLoginAt: string
}

interface LoginResult {
  token: string
  openid: string
  user: UserInfo
}

const phase = ref<'checking' | 'logout' | 'logined'>('checking')
const errorMsg = ref('')
const user = ref<UserInfo | null>(null)
const profileResult = ref('')

function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST', data?: unknown, token?: string } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method: options.method ?? 'GET',
      data: options.data as WechatMiniprogram.IAnyObject,
      header: options.token ? { Authorization: `Bearer ${options.token}` } : {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        }
        else {
          const data = res.data as { error?: string } | undefined
          reject(new Error(data?.error ?? `HTTP ${res.statusCode}`))
        }
      },
      fail: () => reject(new Error('网络请求失败，请确认服务端已启动')),
    })
  })
}

function wxLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        }
        else {
          reject(new Error('wx.login 未返回 code'))
        }
      },
      fail: () => reject(new Error('wx.login 调用失败')),
    })
  })
}

// 静默登录：已有本地 token 则直接用其拉取用户信息
async function checkLogin() {
  const token = wx.getStorageSync(TOKEN_KEY) as string
  if (!token) {
    phase.value = 'logout'
    return
  }
  try {
    const data = await request<{ user: UserInfo }>('/api/user', { token })
    user.value = data.user
    phase.value = 'logined'
  }
  catch {
    // token 无效或已过期，回到未登录态
    wx.removeStorageSync(TOKEN_KEY)
    phase.value = 'logout'
  }
}

// 完整登录：wx.login 拿 code → 服务端换 openid/session_key → 下发登录态 token
async function handleLogin() {
  errorMsg.value = ''
  try {
    const code = await wxLogin()
    const data = await request<LoginResult>('/api/login', {
      method: 'POST',
      data: { code },
    })
    wx.setStorageSync(TOKEN_KEY, data.token)
    user.value = data.user
    phase.value = 'logined'
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  }
}

function handleLogout() {
  wx.removeStorageSync(TOKEN_KEY)
  user.value = null
  phase.value = 'logout'
}

// 获取用户信息：注意微信已回收 wx.getUserProfile 返回真实头像昵称的能力，
// 新基础库下仅返回匿名数据，这里作为 API 调用演示保留。
function handleGetProfile() {
  errorMsg.value = ''
  profileResult.value = ''
  wx.getUserProfile({
    desc: '用于测试用户信息接口',
    success: (res) => {
      profileResult.value = JSON.stringify(res, null, 2)
    },
    fail: (err) => {
      errorMsg.value = `getUserProfile 失败: ${err.errMsg}`
    },
  })
}

onLoad(() => {
  checkLogin()
})
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero__eyebrow">
        Login &amp; Profile
      </view>
      <view class="hero__title">
        登录与用户信息
      </view>
      <view class="hero__desc">
        wx.login 获取 code → 服务端 code2session 换 openid/session_key → 签发 JWT 登录态；本地 token 用于静默登录。
      </view>
    </view>

    <view class="section">
      <view class="section__title">
        当前状态：{{ phase }}
      </view>
      <view
        v-if="phase === 'logined' && user"
        class="user-card"
      >
        <text class="user-card__line">openid: {{ user.openid }}</text>
        <text class="user-card__line">创建时间: {{ user.createdAt }}</text>
        <text class="user-card__line">最近登录: {{ user.lastLoginAt }}</text>
      </view>

      <button
        v-if="phase === 'logout'"
        class="action-btn action-btn--primary"
        @tap="handleLogin"
      >
        微信登录
      </button>
      <button
        v-if="phase === 'logined'"
        class="action-btn action-btn--ghost"
        @tap="handleLogout"
      >
        退出登录
      </button>
    </view>

    <view class="section">
      <view class="section__title">
        wx.getUserProfile
      </view>
      <button class="action-btn" @tap="handleGetProfile">
        获取用户信息
      </button>
      <text
        v-if="profileResult"
        class="section__desc section__desc--mono"
        user-select
      >
        {{ profileResult }}
      </text>
    </view>

    <text
      v-if="errorMsg"
      class="error-tip"
      user-select
    >
      {{ errorMsg }}
    </text>
  </view>
</template>

<style>
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28rpx 28rpx 40rpx;
}

.back-btn {
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 20rpx;
  font-size: 26rpx;
  color: #0f172a;
  text-align: left;
  background: transparent;
  border: 2rpx solid rgb(226 232 240 / 88%);
  border-radius: 999rpx;
}

.back-btn::after {
  border: none;
}

.hero,
.section {
  padding: 28rpx;
  margin-top: 20rpx;
  background: rgb(255 255 255 / 92%);
  border: 2rpx solid rgb(226 232 240 / 88%);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 32rpx rgb(15 23 42 / 4%);
}

.hero {
  margin-top: 0;
  background: linear-gradient(160deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #bfdbfe;
}

.hero__eyebrow {
  font-size: 22rpx;
  font-weight: 600;
  color: #1d4ed8;
}

.hero__title {
  margin-top: 12rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.hero__desc,
.section__desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #475569;
}

.section__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
}

.section__desc--mono {
  padding: 16rpx;
  margin-top: 16rpx;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f8fafc;
  border-radius: 16rpx;
}

.user-card {
  padding: 20rpx;
  margin-top: 16rpx;
  background: #f8fafc;
  border-radius: 16rpx;
}

.user-card__line {
  display: block;
  font-size: 24rpx;
  line-height: 1.8;
  color: #334155;
  word-break: break-all;
}

.action-btn {
  margin-top: 16rpx;
  color: #fff;
  background: #0f172a;
  border-radius: 999rpx;
}

.action-btn--primary {
  background: #2563eb;
}

.action-btn--ghost {
  color: #0f172a;
  background: #e2e8f0;
}

.error-tip {
  display: block;
  padding: 20rpx;
  margin-top: 20rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #b91c1c;
  word-break: break-all;
  background: #fef2f2;
  border: 2rpx solid #fecaca;
  border-radius: 16rpx;
}
</style>
