export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/list/list',
    'pages/detail/detail'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '',
    navigationBarTextStyle: 'black'
  },
  // 全局网络超时配置
  networkTimeout: {
    request: 30000,
    connectSocket: 30000,
    uploadFile: 30000,
    downloadFile: 30000
  }
  // 注：曾启用 lazyCodeLoading:'requiredComponents'（按需注入）以加速启动，
  // 但在微信开发者工具 + 当前基础库下会触发 "Component is not found (wx://not-found)" 注入告警，
  // 故关闭。项目仅 3 个页面，全量注入对启动速度无实际影响。
})
