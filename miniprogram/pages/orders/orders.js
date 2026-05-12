const api = require('../../utils/api');

Page({
  data: {
    orders: [],
    loading: true
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadOrders() {
    this.setData({ loading: true });
    return api.getOrders()
      .then((res) => {
        const orders = (res.data || []).map((order) => {
          const time = api.formatOrderTime(order.createdAt || order.serverCreatedAt);
          const itemCount = (order.items || []).reduce((total, item) => total + item.count, 0);
          const shortId = order._id ? String(order._id).slice(-8) : '';
          return Object.assign({}, order, { time, itemCount, shortId, requesting: false });
        });
        this.setData({ orders });
      })
      .catch(() => {
        wx.showToast({ title: '订单加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  requestCancel(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '申请取消订单',
      content: '确定要申请取消这笔订单吗？管理员审核通过后订单将被取消。',
      confirmText: '确定申请',
      cancelText: '再想想',
      confirmColor: '#FF7B89',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({
          orders: this.data.orders.map((order) => (
            order._id === id ? Object.assign({}, order, { requesting: true }) : order
          ))
        });
        api.requestCancelOrder(id)
          .then(() => {
            wx.showToast({ title: '已提交申请', icon: 'success' });
            this.loadOrders();
          })
          .catch(() => {
            wx.showToast({ title: '申请失败，请稍后重试', icon: 'none' });
            this.loadOrders();
          });
      }
    });
  },

  goMenu() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
