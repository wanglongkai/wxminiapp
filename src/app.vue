<script setup lang="ts">
import autoRoutes from 'weapp-vite/auto-routes'

defineAppJson({
  pages: autoRoutes.pages,
  window: {
    navigationBarTitleText: 'Wevu 模板',
    navigationBarBackgroundColor: '#0f172a',
    navigationBarTextStyle: 'white',
  },
  style: 'v2',
  componentFramework: 'glass-easel',
  // 定位能力需要声明用途说明，否则 wx.getLocation 会直接失败
  permission: {
    'scope.userLocation': {
      desc: '用于测试定位能力，展示当前位置坐标',
    },
  },
  // lazyCodeLoading: 'requiredComponents',
  sitemapLocation: 'sitemap.json',
})
</script>

<style>
page {
  color: #0f172a;
  background: #f3f6fb;
}
</style>
