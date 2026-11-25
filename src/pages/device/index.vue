<script setup lang="ts">
import { ref } from 'wevu'

definePageJson({
  navigationBarTitleText: '设备能力',
})

const resultText = ref('')
const errorText = ref('')

// 定位：需要用户在弹窗中授权 scope.userLocation，
// 且 app.json 中已声明 permission.scope.userLocation 用途说明。
function getLocation() {
  resultText.value = ''
  errorText.value = ''
  wx.getLocation({
    type: 'gcj02',
    success: (res) => {
      resultText.value = [
        `纬度: ${res.latitude}`,
        `经度: ${res.longitude}`,
        `精度: ${res.accuracy} 米`,
      ].join('\n')
    },
    fail: (err) => {
      errorText.value = `getLocation 失败: ${err.errMsg}`
    },
  })
}

// 扫码：调起摄像头识别二维码/条形码，返回识别结果
function scanCode() {
  resultText.value = ''
  errorText.value = ''
  wx.scanCode({
    success: (res) => {
      resultText.value = [
        `结果: ${res.result}`,
        `类型: ${res.scanType}`,
        `字符集: ${res.charSet}`,
      ].join('\n')
    },
    fail: (err) => {
      errorText.value = `scanCode 失败: ${err.errMsg}`
    },
  })
}

// 相机/相册：从相机拍摄或相册选择图片，返回临时文件信息
function chooseMedia() {
  resultText.value = ''
  errorText.value = ''
  wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const file = res.tempFiles[0]
      resultText.value = [
        `临时路径: ${file?.tempFilePath ?? '(空)'}`,
        `大小: ${file?.size ?? 0} 字节`,
        `类型: ${file?.fileType ?? '(空)'}`,
      ].join('\n')
    },
    fail: (err) => {
      errorText.value = `chooseMedia 失败: ${err.errMsg}`
    },
  })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero__eyebrow">
        Device APIs
      </view>
      <view class="hero__title">
        设备能力
      </view>
      <view class="hero__desc">
        定位、扫码、相机与相册等设备相关 API 演示。定位首次调用会弹出授权弹窗，拒绝后需在设置中重新开启。
      </view>
    </view>

    <view class="section">
      <view class="section__title">
        wx.getLocation 定位
      </view>
      <button class="action-btn action-btn--primary" @tap="getLocation">
        获取当前位置
      </button>
    </view>

    <view class="section">
      <view class="section__title">
        wx.scanCode 扫码
      </view>
      <button class="action-btn" @tap="scanCode">
        扫描二维码/条形码
      </button>
    </view>

    <view class="section">
      <view class="section__title">
        wx.chooseMedia 相机相册
      </view>
      <button class="action-btn action-btn--ghost" @tap="chooseMedia">
        拍照 / 从相册选择
      </button>
    </view>

    <view
      v-if="resultText"
      class="result-card"
    >
      <view class="result-card__title">
        调用结果
      </view>
      <text
        class="result-card__text"
        user-select
      >
        {{ resultText }}
      </text>
    </view>

    <text
      v-if="errorText"
      class="error-tip"
      user-select
    >
      {{ errorText }}
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
.section,
.result-card {
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

.hero__desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #475569;
}

.section__title,
.result-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
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

.result-card__text {
  display: block;
  padding: 16rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.8;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f8fafc;
  border-radius: 16rpx;
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
