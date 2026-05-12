// pages/cover/cover.js
Page({
  data: {
    opening: false,
    flipped: false
  },

  onLoad() {
    // 检查是否已经看过动画（同一次会话内跳过）
    const seen = wx.getStorageSync('book_seen');
    if (seen) {
      wx.switchTab({ url: '/pages/home/home' });
    }
  },

  openBook() {
    if (this.data.opening) return;
    this.setData({ opening: true });

    // 翻页动画持续 1.2s 后跳转
    setTimeout(() => {
      this.setData({ flipped: true });
      wx.setStorageSync('book_seen', true);
    }, 400);

    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/home' });
    }, 1200);
  }
});
