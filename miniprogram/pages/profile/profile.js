const api = require('../../utils/api');
const address = require('../../utils/address');

function getStatusLabel(status) {
  if (status === 'completed') return '已完成';
  if (status === 'created') return '未完成';
  return status || '未完成';
}

function formatOrders(list = []) {
  return list.map((order) => {
    const itemCount = (order.items || []).reduce((total, item) => total + item.count, 0);
    return Object.assign({}, order, {
      itemCount,
      shortId: order._id ? String(order._id).slice(-8) : '',
      statusLabel: getStatusLabel(order.status),
      time: api.formatOrderTime(order.createdAt || order.serverCreatedAt)
    });
  });
}

Page({
  data: {
    addresses: [],
    defaultAddress: null,
    orders: [],
    displayOrders: [],
    activeOrderTab: 'unfinished',
    unfinishedCount: 0,
    completedCount: 0,
    loadingOrders: true
  },

  onShow() {
    this.loadAddresses();
    this.loadOrders();
  },

  onPullDownRefresh() {
    Promise.all([this.loadOrders()])
      .finally(() => {
        this.loadAddresses();
        wx.stopPullDownRefresh();
      });
  },

  loadAddresses() {
    const addresses = address.getAddresses();
    this.setData({
      addresses,
      defaultAddress: address.getLastUsedAddress()
    });
  },

  loadOrders() {
    this.setData({ loadingOrders: true });
    return api.getOrders()
      .then((res) => {
        const orders = formatOrders(res.data || []);
        this.setData({ orders }, () => {
          this.refreshOrderTab();
        });
      })
      .catch(() => {
        wx.showToast({ title: '订单加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loadingOrders: false });
      });
  },

  refreshOrderTab() {
    const unfinished = this.data.orders.filter((item) => item.status !== 'completed');
    const completed = this.data.orders.filter((item) => item.status === 'completed');
    this.setData({
      unfinishedCount: unfinished.length,
      completedCount: completed.length,
      displayOrders: this.data.activeOrderTab === 'completed' ? completed : unfinished
    });
  },

  switchOrderTab(e) {
    this.setData({
      activeOrderTab: e.currentTarget.dataset.tab
    }, () => {
      this.refreshOrderTab();
    });
  },

  goAddressManage() {
    wx.navigateTo({ url: '/pages/address/address' });
  },

  goAddressSelect() {
    wx.navigateTo({ url: '/pages/address/address?mode=select' });
  },

  useAddress(e) {
    const id = e.currentTarget.dataset.id;
    address.setLastUsedId(id);
    this.loadAddresses();
    wx.showToast({ title: '下次将自动使用', icon: 'success' });
  },

  goOrders() {
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  goMenu() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
