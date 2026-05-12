const api = require('../../utils/api');
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
    form: {
      contactName: '',
      phone: '',
      address: '',
      note: ''
    },
    submitting: false
  },

  onLoad() {
    this.refresh();
  },

  refresh() {
    const items = cart.getCart();
    if (!items.length) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none'
      });
      wx.switchTab({
        url: '/pages/cart/cart'
      });
      return;
    }
    const summary = cart.getCartSummary(items);
    const store = getApp().globalData.store;
    const deliveryFee = summary.amount >= store.freeDeliveryAmount ? 0 : store.deliveryFee;
    this.setData({
      items,
      summary,
      deliveryFee,
      payable: summary.amount + deliveryFee
    });
  },

  updateField(event) {
    const key = event.currentTarget.dataset.key;
    const value = typeof event.detail.value === 'string' ? event.detail.value : '';
    this.setData({
      [`form.${key}`]: value
    });
  },

  submitOrder() {
    const form = {
      contactName: this.data.form.contactName.trim(),
      phone: this.data.form.phone.trim(),
      address: this.data.form.address.trim(),
      note: this.data.form.note.trim()
    };
    if (form.contactName.length < 2 || form.contactName.length > 20) {
      wx.showToast({
        title: '联系人需为2-20个字符',
        icon: 'none'
      });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      wx.showToast({
        title: '请输入正确手机号',
        icon: 'none'
      });
      return;
    }
    if (this.data.submitting) return;

    this.setData({ submitting: true });
    api.createOrder({
      items: this.data.items,
      amount: this.data.summary.amount,
      deliveryFee: this.data.deliveryFee,
      payable: this.data.payable,
      contact: form,
      source: 'miniprogram'
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.message || 'submit failed');
        cart.clearCart();
        wx.showToast({
          title: '下单成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/orders/orders'
          });
        }, 500);
      })
      .catch(() => {
        wx.showToast({
          title: '下单失败，请稍后重试',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
