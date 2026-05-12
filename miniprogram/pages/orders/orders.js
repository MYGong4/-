const api = require('../../utils/api');

Page({
  data: {
    orders: [],
    loading: true,
    manageMode: false,
    selectedOrderIds: []
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
          return Object.assign({}, order, { time, itemCount, shortId });
        });
        const selectedSet = this.data.selectedOrderIds.reduce((map, id) => {
          map[id] = true;
          return map;
        }, {});
        this.setData({
          orders: orders.map((order) => Object.assign({}, order, {
            selected: Boolean(selectedSet[order._id])
          }))
        });
      })
      .catch(() => {
        wx.showToast({
          title: '订单加载失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  toggleManageMode() {
    const next = !this.data.manageMode;
    this.setData({
      manageMode: next,
      selectedOrderIds: next ? this.data.selectedOrderIds : [],
      orders: this.data.orders.map((order) => Object.assign({}, order, { selected: false }))
    });
  },

  toggleSelect(event) {
    if (!this.data.manageMode) return;
    const id = event.currentTarget.dataset.id;
    const selectedOrderIds = this.data.selectedOrderIds.includes(id)
      ? this.data.selectedOrderIds.filter((item) => item !== id)
      : this.data.selectedOrderIds.concat(id);
    const selectedSet = selectedOrderIds.reduce((map, item) => {
      map[item] = true;
      return map;
    }, {});
    this.setData({
      selectedOrderIds,
      orders: this.data.orders.map((order) => Object.assign({}, order, {
        selected: Boolean(selectedSet[order._id])
      }))
    });
  },

  selectAll() {
    const allSelected = this.data.selectedOrderIds.length === this.data.orders.length;
    const selectedOrderIds = allSelected ? [] : this.data.orders.map((order) => order._id);
    const selectedSet = selectedOrderIds.reduce((map, id) => {
      map[id] = true;
      return map;
    }, {});
    this.setData({
      selectedOrderIds,
      orders: this.data.orders.map((order) => Object.assign({}, order, {
        selected: Boolean(selectedSet[order._id])
      }))
    });
  },

  deleteOrder(event) {
    const id = event.currentTarget.dataset.id;
    this.confirmDelete([id]);
  },

  deleteSelected() {
    this.confirmDelete(this.data.selectedOrderIds);
  },

  confirmDelete(ids) {
    const targets = ids.filter(Boolean);
    if (!targets.length) {
      wx.showToast({
        title: '先选择订单',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '删除订单',
      content: `确定删除 ${targets.length} 笔订单吗？`,
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return;
        api.deleteOrders(targets)
          .then(() => {
            wx.showToast({
              title: '已删除',
              icon: 'success'
            });
            this.setData({
              selectedOrderIds: [],
              manageMode: false
            });
            this.loadOrders();
          })
          .catch(() => {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
      }
    });
  },

  goMenu() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  }
});
