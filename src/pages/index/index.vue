<script setup lang="ts">
import { markRaw } from 'wevu'
import { createRouter } from 'wevu/router'

definePageJson({
  navigationBarTitleText: '功能测试菜单',
})

interface MenuItem {
  title: string
  desc: string
  path: string
  tag: string
}

// 功能模块注册表：新增测试模块时，在 src/pages/<模块名>/index.vue 中实现页面，
// 然后在这里登记一项即可（路径与自动路由 pages/<目录>/index 一致）。
const menuItems: MenuItem[] = [
  {
    title: '登录与用户信息',
    desc: 'wx.login 换 code → 服务端 code2session → JWT 登录态，以及 wx.getUserProfile 用户信息',
    path: 'pages/login/index',
    tag: '账号',
  },
  {
    title: '设备能力',
    desc: 'wx.getLocation 定位、wx.scanCode 扫码、wx.chooseMedia 相机与相册',
    path: 'pages/device/index',
    tag: '设备',
  },
]

// 首次在 setup() 中创建 router 实例并注册为活动 router，
// 后续组件/页面可用 useRouter() 获取同一实例。
// router 内部含冻结的 options 快照（tabBarEntries 等），必须 markRaw 排除响应式包装，
// 否则挂载时克隆快照会触发 Proxy 只读属性不变量错误。
const router = markRaw(createRouter())

async function openModule(item: MenuItem) {
  try {
    await router.push(item.path)
  }
  catch (error) {
    // 导航失败（如页面栈已满）时提示，不中断菜单页
    console.error('打开模块失败:', error)
  }
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero__eyebrow">
        WeChat Mini Program Lab
      </view>
      <view class="hero__title">
        微信小程序功能测试台
      </view>
      <view class="hero__desc">
        这里是功能导航菜单。每个功能都在独立的模块页面中实现，点开测试后可通过模块页顶部的「返回菜单」回到这里。
      </view>
    </view>

    <view class="menu">
      <view
        v-for="item in menuItems"
        :key="item.path"
        class="menu-item"
        hover-class="menu-item--hover"
        @tap="openModule(item)"
      >
        <view class="menu-item__main">
          <view class="menu-item__title">
            {{ item.title }}
          </view>
          <text class="menu-item__desc">
            {{ item.desc }}
          </text>
        </view>
        <view class="menu-item__aside">
          <text class="menu-item__tag">
            {{ item.tag }}
          </text>
          <text class="menu-item__arrow">
            ›
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style>
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28rpx 28rpx 40rpx;
}

.hero {
  padding: 28rpx;
  background: linear-gradient(160deg, #eff6ff 0%, #dbeafe 100%);
  border: 2rpx solid #bfdbfe;
  border-radius: 28rpx;
  box-shadow: 0 12rpx 32rpx rgb(15 23 42 / 4%);
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

.hero__desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #475569;
}

.menu {
  margin-top: 20rpx;
}

.menu-item {
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  margin-top: 20rpx;
  background: rgb(255 255 255 / 92%);
  border: 2rpx solid rgb(226 232 240 / 88%);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 32rpx rgb(15 23 42 / 4%);
}

.menu-item--hover {
  background: #f1f5f9;
}

.menu-item__main {
  flex: 1;
  min-width: 0;
}

.menu-item__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
}

.menu-item__desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #475569;
}

.menu-item__aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 20rpx;
}

.menu-item__tag {
  padding: 4rpx 16rpx;
  font-size: 20rpx;
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 999rpx;
}

.menu-item__arrow {
  margin-top: 12rpx;
  font-size: 36rpx;
  color: #94a3b8;
}
</style>
