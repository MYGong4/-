const cart = require('../../utils/cart');

Page({
  data: {
    items: [],
    summary: {
      count: 0,
      amount: 0
    },
    deliveryFee: 0,
    payable: 0,
    deliveryHint: ''
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const items = cart.getCart();
    const summary = cart.getCartSummary(items);
    const store = getApp().globalData.store;
    const deliveryFee = summary.amount >= store.freeDeliveryAmount || summary.amount === 0 ? 0 : store.deliveryFee;
    const diff = Math.max(store.freeDeliveryAmount - summary.amount, 0);
    this.setData({
      items,
      summary,
      deliveryFee,
      payable: summary.amount + deliveryFee,
      deliveryHint: summary.amount > 0 && diff > 0 ? `还差￥${diff}免配送费` : '已免配送费'
    });
  },

  decrease(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((entry) => entry.productId === id);
    if (!item) return;
    if (item.count <= 1) {
      wx.showModal({
        title: '移除菜品',
        content: `确定从购物车移除「${item.name}」吗？`,
        success: (res) => {
          if (res.confirm) {
            cart.setCount(id, 0);
            this.refresh();
          }
        }
      });
      return;
    }
    cart.setCount(id, item.count - 1);
    this.refresh();
  },

  increase(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((entry) => entry.productId === id);
    if (!item) return;
    cart.setCount(id, item.count + 1);
    this.refresh();
  },

  clear() {
    wx.showModal({
      title: '清空购物车',
      content: '确定删除所有已选菜品吗？',
      success: (res) => {
        if (res.confirm) {
          cart.clearCart();
          this.refresh();
        }
      }
    });
  },

  goMenu() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  goCheckout() {
    if (!this.data.items.length) return;
    wx.navigateTo({
      url: '/pages/checkout/checkout'
    });
  }
});
