const api = require('../../utils/api');
const cart = require('../../utils/cart');

Page({
  data: {
    store: {},
    categories: [],
    activeCategoryId: '',
    activeCategoryName: '',
    products: [],
    currentIndex: 0,
    loading: true,
    cartCount: 0,
    cartAmount: 0,
    cartPulse: false,
    categoryDrawerOpen: false,
    categoryPositionMap: {},
    deliveryHint: '',
    isAdmin: false
  },

  onLoad() {
    if (!wx.getStorageSync('book_seen')) {
      wx.reLaunch({ url: '/pages/cover/cover' });
      return;
    }
    this.setData({
      store: getApp().globalData.store
    });
    this.loadCategories();
    this.checkAdmin();
  },

  onShow() {
    const pending = wx.getStorageSync('pending_category');
    if (pending) {
      wx.removeStorageSync('pending_category');
      const activeCategoryName = this.getCategoryName(this.data.categories, pending);
      this.setData({
        activeCategoryId: pending,
        activeCategoryName,
        currentIndex: 0
      });
      this.loadProducts(pending);
    } else if (!this.data.products.length && !this.data.loading) {
      this.loadProducts(this.data.activeCategoryId);
    }
    this.refreshCartBar();
  },

  onPullDownRefresh() {
    this.loadCategories().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadCategories() {
    this.setData({ loading: true });
    return api.getCategories()
      .then((res) => {
        const categories = res.data || [];
        const activeCategoryId = this.data.activeCategoryId || (categories[0] && categories[0]._id) || '';
        const activeCategoryName = this.getCategoryName(categories, activeCategoryId);
        return this.fetchProducts(activeCategoryId).then((products) => {
          const savedIndex = this.data.categoryPositionMap[activeCategoryId] || 0;
          this.setData({
            categories,
            activeCategoryId,
            activeCategoryName,
            products,
            currentIndex: Math.min(savedIndex, Math.max(products.length - 1, 0)),
            loading: false
          });
        });
      })
      .catch(() => {
        this.setData({
          loading: false
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  fetchProducts(categoryId) {
    return api.getProducts(categoryId).then((res) => res.data || []);
  },

  loadProducts(categoryId) {
    return this.fetchProducts(categoryId).then((products) => {
      const savedIndex = this.data.categoryPositionMap[categoryId] || 0;
      this.setData({
        products,
        currentIndex: Math.min(savedIndex, Math.max(products.length - 1, 0))
      });
    });
  },

  getCategoryName(categories, categoryId) {
    const category = categories.find((item) => item._id === categoryId);
    return category ? category.name : '';
  },

  selectCategory(event) {
    const id = event.currentTarget.dataset.id;
    if (id === this.data.activeCategoryId) return;
    const activeCategoryName = this.getCategoryName(this.data.categories, id);
    const previousCategoryId = this.data.activeCategoryId;
    this.setData({
      [`categoryPositionMap.${previousCategoryId}`]: this.data.currentIndex,
      activeCategoryId: id,
      activeCategoryName,
      currentIndex: 0,
      loading: true
    });
    this.fetchProducts(id)
      .then((products) => {
        const savedIndex = this.data.categoryPositionMap[id] || 0;
        this.setData({
          products,
          currentIndex: Math.min(savedIndex, Math.max(products.length - 1, 0)),
          loading: false
        });
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
    });
  },

  toggleCategoryDrawer() {
    this.setData({
      categoryDrawerOpen: !this.data.categoryDrawerOpen
    });
  },

  onDishChange(event) {
    this.setData({
      currentIndex: event.detail.current,
      [`categoryPositionMap.${this.data.activeCategoryId}`]: event.detail.current
    });
  },

  addToCart(event) {
    const product = event.currentTarget.dataset.product;
    cart.addItem(product);
    this.refreshCartBar(true);
    wx.showToast({
      title: '已加购',
      icon: 'success'
    });
  },

  refreshCartBar(animate = false) {
    const summary = cart.getCartSummary();
    const store = getApp().globalData.store;
    const diff = Math.max((store.freeDeliveryAmount || 0) - summary.amount, 0);
    this.setData({
      cartCount: summary.count,
      cartAmount: summary.amount,
      deliveryHint: diff > 0 ? `还差￥${diff}免配送` : '已免配送费',
      cartPulse: animate
    });
    if (animate) {
      clearTimeout(this.cartTimer);
      this.cartTimer = setTimeout(() => {
        this.setData({ cartPulse: false });
      }, 360);
    }
  },

  goCart() {
    wx.switchTab({
      url: '/pages/cart/cart'
    });
  },

  goAdmin() {
    if (!this.data.isAdmin) return;
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  checkAdmin() {
    api.checkAdmin()
      .then((res) => {
        this.setData({
          isAdmin: Boolean(res.isAdmin)
        });
      })
      .catch(() => {
        this.setData({ isAdmin: false });
      });
  }
});
