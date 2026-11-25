<script setup lang="ts">
import { onLoad, ref } from 'wevu'

definePageJson({
  navigationBarTitleText: '微信登录',
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

onLoad(() => {
  void checkLogin()
})
</script>

<template>
  <view class="page">
    <view class="card">
      <view v-if="phase === 'checking'" class="hint">
        正在检查登录状态…
      </view>

      <template v-else-if="phase === 'logined'">
        <view class="hero__title">
          登录成功
        </view>
        <view class="hero__desc">
          openid：{{ user?.openid }}
        </view>
        <view class="hero__desc">
          注册时间：{{ user?.createdAt }}
        </view>
        <view class="hero__desc">
          最近登录：{{ user?.lastLoginAt }}
        </view>
        <button class="action-btn action-btn--ghost" @tap="handleLogout">
          退出登录
        </button>
      </template>

      <template v-else>
        <view class="hero__title">
          微信登录
        </view>
        <view class="hero__desc">
          点击下方按钮，使用微信账号登录本小程序。
        </view>
        <button class="action-btn" @tap="handleLogin">
          微信一键登录
        </button>
        <view v-if="errorMsg" class="error">
          {{ errorMsg }}
        </view>
      </template>
    </view>
  </view>
</template>

<style>
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 32rpx;
  background: #f3f6fb;
}

.card {
  padding: 32rpx;
  background: #fff;
  border: 2rpx solid #e2e8f0;
  border-radius: 24rpx;
}

.hero__title {
  font-size: 36rpx;
  font-weight: 700;
  color: #0f172a;
}

.hero__desc {
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #475569;
  word-break: break-all;
}

.hint {
  font-size: 26rpx;
  color: #475569;
}

.action-btn {
  margin-top: 24rpx;
  color: #fff;
  background: #0f172a;
  border-radius: 999rpx;
}

.action-btn--ghost {
  color: #0f172a;
  background: #fff;
  border: 2rpx solid #0f172a;
}

.error {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #dc2626;
  word-break: break-all;
}
</style>
