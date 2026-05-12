const api = require('../../utils/api');

Page({
  data: {
    categories: [],
    products: [],
    orders: [],
    loading: false,
    ordersLoading: false,
    hasCancelRequests: false,
    uploadingId: '',
    authorized: false,
    showProductForm: false,
    editingProductId: '',
    formUploading: false,
    categoryForm: {
      name: ''
    },
    categoryIndex: 0,
    productForm: {
      name: '',
      description: '',
      price: '',
      sales: '0',
      tag: '',
      image: '',
      available: true
    }
  },

  onLoad() {
    this.checkAdminAccess();
  },

  onShow() {
    if (!this.data.authorized) return;
    this.loadProducts();
    this.loadOrders();
  },

  checkAdminAccess() {
    api.checkAdmin()
      .then((res) => {
        if (res.isAdmin) {
          this.setData({ authorized: true });
          this.loadProducts();
          this.loadOrders();
          return;
        }
        wx.showToast({
          title: '无管理员权限',
          icon: 'none'
        });
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/home/home' })
        });
      })
      .catch(() => {
        wx.showToast({
          title: '权限校验失败',
          icon: 'none'
        });
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/home/home' })
        });
      });
  },

  noop() {},

  loadProducts() {
    if (!this.data.authorized) return;
    this.setData({ loading: true });
    Promise.all([api.getCategories(), api.getProducts()])
      .then(([categoryRes, productRes]) => {
        this.setData({
          categories: categoryRes.data || [],
          products: productRes.data || []
        });
      })
      .catch(() => {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  loadOrders() {
    if (!this.data.authorized) return;
    this.setData({ ordersLoading: true });
    api.getAdminOrders()
      .then((res) => {
        const orders = (res.data || []).map((order) => {
          const time = api.formatOrderTime(order.createdAt || order.serverCreatedAt);
          const completedTime = api.formatOrderTime(order.completedAt || order.serverCompletedAt);
          const itemCount = (order.items || []).reduce((total, item) => total + item.count, 0);
          const shortId = order._id ? String(order._id).slice(-8) : '';
          return Object.assign({}, order, {
            time,
            completedTime,
            itemCount,
            shortId,
            completing: false,
            approving: false,
            rejecting: false,
            deleting: false
          });
        });
        const hasCancelRequests = orders.some(function (o) { return o.cancelStatus === 'pending'; });
        this.setData({ orders, hasCancelRequests });
      })
      .catch(() => {
        wx.showToast({
          title: '订单加载失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ ordersLoading: false });
      });
  },

  completeOrder(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    const orders = this.data.orders.map((order) => (
      order._id === id ? Object.assign({}, order, { completing: true }) : order
    ));
    this.setData({ orders });
    api.completeOrder(id)
      .then((res) => {
        wx.showToast({
          title: res.messageSent ? '已完成并通知' : '已标记完成',
          icon: 'success'
        });
        this.loadOrders();
      })
      .catch(() => {
        wx.showToast({
          title: '完成订单失败',
          icon: 'none'
        });
        this.loadOrders();
      });
  },

  approveCancel(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '同意取消',
      content: '确定同意这笔订单的取消申请吗？',
      confirmText: '同意',
      confirmColor: '#7EC8A0',
      success: (res) => {
        if (!res.confirm) return;
        const orders = this.data.orders.map((order) => (
          order._id === id ? Object.assign({}, order, { approving: true }) : order
        ));
        this.setData({ orders });
        api.approveCancelOrder(id)
          .then(() => {
            wx.showToast({ title: '已同意取消', icon: 'success' });
            this.loadOrders();
          })
          .catch(() => {
            wx.showToast({ title: '操作失败', icon: 'none' });
            this.loadOrders();
          });
      }
    });
  },

  rejectCancel(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '拒绝取消',
      content: '确定拒绝这笔订单的取消申请吗？',
      confirmText: '拒绝',
      confirmColor: '#FF7B89',
      success: (res) => {
        if (!res.confirm) return;
        const orders = this.data.orders.map((order) => (
          order._id === id ? Object.assign({}, order, { rejecting: true }) : order
        ));
        this.setData({ orders });
        api.rejectCancelOrder(id)
          .then(() => {
            wx.showToast({ title: '已拒绝取消', icon: 'success' });
            this.loadOrders();
          })
          .catch(() => {
            wx.showToast({ title: '操作失败', icon: 'none' });
            this.loadOrders();
          });
      }
    });
  },

  deleteAdminOrder(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;

    wx.showModal({
      title: '删除订单',
      content: '确定删除这笔订单吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#FF7B89',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({
          orders: this.data.orders.map((order) => (
            order._id === id ? Object.assign({}, order, { deleting: true }) : order
          ))
        });
        api.deleteAdminOrder(id)
          .then(() => {
            wx.showToast({
              title: '已删除',
              icon: 'success'
            });
            this.loadOrders();
          })
          .catch((error) => {
            const message = error && error.message ? error.message : '删除失败';
            wx.showToast({
              title: message.length > 10 ? message.slice(0, 10) : message,
              icon: 'none'
            });
            this.loadOrders();
          });
      }
    });
  },

  seedMenuData() {
    const categories = this.data.categories || [];
    const products = this.data.products || [];
    if (!categories.length || !products.length) {
      this.seedMenuWithData({});
      return;
    }

    wx.showModal({
      title: '设置初始化云菜单',
      content: '将用当前页面的分类和菜品覆盖云端菜单，作为新的初始化云菜单。',
      confirmText: '设为初始',
      confirmColor: '#FF7B89',
      success: (res) => {
        if (!res.confirm) return;
        this.seedMenuWithData({
          categories,
          products,
          overwrite: true
        });
      }
    });
  },

  seedMenuWithData(options) {
    wx.showLoading({ title: '初始化中' });
    api.seedMenuData(options)
      .then((res) => {
        wx.showToast({
          title: res.skipped ? '已有云菜单' : '已设为初始',
          icon: 'success'
        });
        this.loadProducts();
      })
      .catch(() => {
        wx.showToast({
          title: '请先配置云环境',
          icon: 'none'
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  updateCategoryName(event) {
    this.setData({
      'categoryForm.name': event.detail.value || ''
    });
  },

  submitCategory() {
    const name = this.data.categoryForm.name.trim();
    if (!name || name.length > 20) {
      wx.showToast({
        title: '分类名需为1-20字',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中' });
    api.createCategory({ name })
      .then(() => {
        wx.showToast({
          title: '已新增分类',
          icon: 'success'
        });
        this.setData({
          'categoryForm.name': ''
        });
        this.loadProducts();
      })
      .catch(() => {
        wx.showToast({
          title: '新增分类失败',
          icon: 'none'
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  deleteCategory(event) {
    const categoryId = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name || '这个分类';
    wx.showModal({
      title: '删除分类',
      content: `确定删除「${name}」吗？有菜品的分类不能直接删除。`,
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return;
        api.deleteCategory(categoryId)
          .then((result) => {
            if (result && result.ok === false) {
              wx.showToast({
                title: '请先删除该分类下菜品',
                icon: 'none'
              });
              return;
            }
            wx.showToast({
              title: '已删除分类',
              icon: 'success'
            });
            this.loadProducts();
          })
          .catch(() => {
            wx.showToast({
              title: '删除分类失败',
              icon: 'none'
            });
          });
      }
    });
  },

  openProductForm() {
    if (!this.data.categories.length) {
      wx.showToast({
        title: '请先初始化云菜单',
        icon: 'none'
      });
      return;
    }
    this.setData({
      showProductForm: true,
      categoryIndex: 0,
      productForm: {
        name: '',
        description: '',
        price: '',
        sales: '0',
        tag: '',
        image: '',
        available: true
      },
      editingProductId: '',
      formUploading: false
    });
  },

  editProduct(event) {
    const productId = event.currentTarget.dataset.id;
    const product = this.data.products.find((item) => item._id === productId);
    if (!product) return;
    const categoryIndex = Math.max(0, this.data.categories.findIndex((item) => item._id === product.categoryId));
    this.setData({
      showProductForm: true,
      editingProductId: productId,
      categoryIndex,
      formUploading: false,
      productForm: {
        name: product.name || '',
        description: product.description || '',
        price: String(product.price || ''),
        sales: String(product.sales || 0),
        tag: product.tag || '',
        image: product.image || '',
        available: product.available !== false,
        sort: product.sort || Date.now()
      }
    });
  },

  closeProductForm() {
    this.setData({
      showProductForm: false,
      editingProductId: '',
      formUploading: false
    });
  },

  updateProductField(event) {
    const key = event.currentTarget.dataset.key;
    const value = typeof event.detail.value === 'string' ? event.detail.value : '';
    this.setData({
      [`productForm.${key}`]: value
    });
  },

  changeProductCategory(event) {
    this.setData({
      categoryIndex: Number(event.detail.value) || 0
    });
  },

  toggleAvailable(event) {
    this.setData({
      'productForm.available': Boolean(event.detail.value)
    });
  },

  submitProduct() {
    const category = this.data.categories[this.data.categoryIndex];
    const form = this.data.productForm;
    const product = {
      categoryId: category && category._id,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      sales: Number(form.sales) || 0,
      tag: form.tag.trim(),
      image: form.image || '',
      available: form.available,
      sort: Number(form.sort) || Date.now()
    };

    if (!product.categoryId) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      });
      return;
    }
    if (!product.name || product.name.length > 24) {
      wx.showToast({
        title: '菜名需为1-24字',
        icon: 'none'
      });
      return;
    }
    if (!Number.isFinite(product.price) || product.price <= 0) {
      wx.showToast({
        title: '请输入有效价格',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中' });
    const request = this.data.editingProductId
      ? api.updateProduct(this.data.editingProductId, product)
      : api.createProduct(product);
    request
      .then(() => {
        wx.showToast({
          title: this.data.editingProductId ? '已更新' : '已新增',
          icon: 'success'
        });
        this.setData({
          showProductForm: false,
          editingProductId: '',
          formUploading: false
        });
        this.loadProducts();
      })
      .catch(() => {
        wx.showToast({
          title: this.data.editingProductId ? '更新失败' : '新增失败',
          icon: 'none'
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  pickProductFormImage() {
    const productId = this.data.editingProductId;
    if (!productId) {
      wx.showToast({
        title: '保存后再传图',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        this.setData({ formUploading: true });
        wx.showLoading({ title: '上传中' });
        api.uploadProductImage(productId, tempPath)
          .then((fileID) => {
            this.setData({
              'productForm.image': fileID || ''
            });
            wx.showToast({
              title: '图片已更新',
              icon: 'success'
            });
            this.loadProducts();
          })
          .catch(() => {
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          })
          .finally(() => {
            wx.hideLoading();
            this.setData({ formUploading: false });
          });
      }
    });
  },

  clearProductFormImage() {
    const productId = this.data.editingProductId;
    if (!productId) return;
    api.updateProductImage(productId, '')
      .then(() => {
        this.setData({
          'productForm.image': ''
        });
        this.loadProducts();
        wx.showToast({
          title: '已清除',
          icon: 'success'
        });
      })
      .catch(() => {
        wx.showToast({
          title: '清除失败',
          icon: 'none'
        });
      });
  },

  deleteProduct(event) {
    const productId = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除菜品',
      content: '确定删除这道菜吗？删除后顾客将看不到它。',
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return;
        api.deleteProduct(productId)
          .then(() => {
            wx.showToast({
              title: '已删除',
              icon: 'success'
            });
            this.loadProducts();
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

  pickImage(event) {
    const productId = event.currentTarget.dataset.id;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        this.setData({ uploadingId: productId });
        wx.showLoading({ title: '上传中' });
        api.uploadProductImage(productId, tempPath)
          .then(() => {
            wx.showToast({
              title: '图片已同步',
              icon: 'success'
            });
            this.loadProducts();
          })
          .catch(() => {
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          })
          .finally(() => {
            wx.hideLoading();
            this.setData({ uploadingId: '' });
          });
      }
    });
  },

  clearImage(event) {
    const productId = event.currentTarget.dataset.id;
    wx.showModal({
      title: '清除图片',
      content: '确定清除这道菜的图片参考吗？',
      success: (res) => {
        if (res.confirm) {
          api.updateProductImage(productId, '')
            .then(() => {
              this.loadProducts();
              wx.showToast({
                title: '已清除',
                icon: 'success'
              });
            })
            .catch(() => {
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  clearAll() {
    wx.showModal({
      title: '清除全部',
      content: '确定清除所有菜品配图吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中' });
          api.clearAllProductImages()
            .then(() => {
              this.loadProducts();
              wx.showToast({
                title: '已全部清除',
                icon: 'success'
              });
            })
            .catch(() => {
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              });
            })
            .finally(() => {
              wx.hideLoading();
            });
        }
      }
    });
  }
});
