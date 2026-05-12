let CLOUD_ENV_ID = '';

try {
  ({ CLOUD_ENV_ID } = require('./config/cloud'));
} catch (error) {
  console.warn('未找到云开发配置，当前使用本地数据模式。');
}

App({
  globalData: {
    cloudReady: false,
    store: {
      name: '今天吃什么',
      slogan: '像翻菜单一样慢慢挑，看到喜欢的那页就加购。',
      phone: '138-0000-0000',
      address: '城市中心店 · 10:00-21:30',
      deliveryFee: 3,
      freeDeliveryAmount: 49
    }
  },

  onLaunch() {
    if (wx.onUnhandledRejection) {
      wx.onUnhandledRejection((res) => {
        console.error('[unhandled rejection]', res.reason || res);
      });
    }
    if (wx.onError) {
      wx.onError((error) => {
        console.error('[app error]', error);
      });
    }
    if (wx.onNetworkStatusChange) {
      wx.onNetworkStatusChange((res) => {
        if (!res.isConnected) {
          wx.showToast({
            title: '网络已断开，当前使用本地数据',
            icon: 'none'
          });
        }
      });
    }

    if (wx.cloud && CLOUD_ENV_ID && CLOUD_ENV_ID !== 'your-cloud-env-id') {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
      this.globalData.cloudReady = true;
    } else {
      console.warn('未配置云开发环境 ID，当前将无法连接云数据库和云存储。');
    }
  }
});
