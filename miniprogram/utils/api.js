const mock = require('./mockData');
const { ORDER_COMPLETED_TEMPLATE_ID } = require('../config/subscription');

const COLLECTIONS = {
  categories: 'categories',
  products: 'products',
  orders: 'orders'
};

let categoryCache = null;
let productCache = null;

function isCloudReady() {
  const app = getApp();
  return Boolean(wx.cloud && app.globalData.cloudReady);
}

function db() {
  return wx.cloud.database();
}

function callCloudFunction(name, data) {
  return wx.cloud.callFunction({ name, data })
    .then((res) => res.result || {});
}

function normalizeList(res) {
  return {
    data: res.data || []
  };
}

function getCategories() {
  if (!isCloudReady()) {
    if (!categoryCache) categoryCache = mock.categories.slice();
    return Promise.resolve({ data: categoryCache });
  }

  return callCloudFunction('menuAdmin', {
    action: 'listCategories'
  }).then(normalizeList);
}

function getProducts(categoryId) {
  if (!isCloudReady()) {
    if (!productCache) productCache = mock.products.slice();
    const data = categoryId
      ? productCache.filter((item) => item.categoryId === categoryId)
      : productCache;
    return Promise.resolve({ data });
  }

  return callCloudFunction('menuAdmin', {
    action: 'listProducts',
    categoryId
  }).then(normalizeList);
}

function checkAdmin() {
  if (!isCloudReady()) {
    return Promise.resolve({
      ok: true,
      isAdmin: true,
      openid: 'local-dev'
    });
  }

  return callCloudFunction('menuAdmin', {
    action: 'checkAdmin'
  });
}

function createCategory(category) {
  if (!isCloudReady()) {
    if (!categoryCache) categoryCache = mock.categories.slice();
    const created = Object.assign({}, category, {
      _id: `local-category-${Date.now()}`
    });
    categoryCache = categoryCache.concat(created);
    return Promise.resolve({
      ok: true,
      id: created._id
    });
  }

  return callCloudFunction('menuAdmin', {
    action: 'createCategory',
    category
  });
}

function deleteCategory(categoryId) {
  if (!isCloudReady()) {
    if (!categoryCache) categoryCache = mock.categories.slice();
    if (!productCache) productCache = mock.products.slice();
    if (productCache.some((item) => item.categoryId === categoryId)) {
      return Promise.resolve({
        ok: false,
        message: 'category has products'
      });
    }
    categoryCache = categoryCache.filter((item) => item._id !== categoryId);
    return Promise.resolve({
      ok: true,
      count: 1
    });
  }

  return callCloudFunction('menuAdmin', {
    action: 'deleteCategory',
    categoryId
  });
}

function createProduct(product) {
  if (!isCloudReady()) {
    if (!productCache) productCache = mock.products.slice();
    const created = Object.assign({}, product, {
      _id: `local-product-${Date.now()}`,
      image: product.image || '',
      available: product.available !== false
    });
    productCache = productCache.concat(created);
    return Promise.resolve({
      ok: true,
      id: created._id
    });
  }

  return callCloudFunction('menuAdmin', {
    action: 'createProduct',
    product
  });
}

function updateProduct(productId, product) {
  if (!productId) {
    return Promise.reject(new Error('product id required'));
  }

  if (!isCloudReady()) {
    if (!productCache) productCache = mock.products.slice();
    productCache = productCache.map((item) => (
      item._id === productId
        ? Object.assign({}, item, product, { _id: productId, available: product.available !== false })
        : item
    ));
    return Promise.resolve({ ok: true });
  }

  return callCloudFunction('menuAdmin', {
    action: 'updateProduct',
    productId,
    product
  });
}

function deleteProduct(productId) {
  if (!isCloudReady()) {
    if (!productCache) productCache = mock.products.slice();
    productCache = productCache.filter((item) => item._id !== productId);
    return Promise.resolve({
      ok: true,
      count: 1
    });
  }

  return callCloudFunction('menuAdmin', {
    action: 'deleteProduct',
    productId
  });
}

function createOrder(order) {
  const createdAt = new Date().toISOString();
  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const created = Object.assign({}, order, {
      _id: `local-${Date.now()}`,
      status: 'created',
      createdAt
    });
    wx.setStorageSync('local_orders', [created].concat(localOrders));
    if (!productCache) productCache = mock.products.slice();
    const orderedProductIds = (order.items || []).reduce((ids, item) => {
      const productId = item && item.productId;
      if (productId && !ids.includes(productId)) ids.push(productId);
      return ids;
    }, []);
    productCache = productCache.map((product) => (
      orderedProductIds.includes(product._id)
        ? Object.assign({}, product, { sales: (Number(product.sales) || 0) + 1 })
        : product
    ));
    return Promise.resolve({
      ok: true,
      id: created._id,
      salesUpdate: {
        ok: true,
        count: orderedProductIds.length
      }
    });
  }

  return callCloudFunction('orders', {
    action: 'create',
    order
  });
}

function requestOrderCompletedSubscribe() {
  if (!ORDER_COMPLETED_TEMPLATE_ID || !wx.requestSubscribeMessage) {
    return Promise.resolve({ ok: false, skipped: true });
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [ORDER_COMPLETED_TEMPLATE_ID],
      success: (res) => resolve({ ok: true, result: res }),
      fail: (error) => resolve({ ok: false, error })
    });
  });
}

function formatOrderTime(createdAt) {
  if (!createdAt) return '';
  const raw = createdAt.toDate ? createdAt.toDate() : createdAt;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}

function getOrders() {
  if (!isCloudReady()) {
    return Promise.resolve({
      data: wx.getStorageSync('local_orders') || []
    });
  }

  return callCloudFunction('orders', {
    action: 'list'
  }).then((res) => ({
    data: res.data || []
  }));
}

function getAdminOrders() {
  if (!isCloudReady()) {
    const data = wx.getStorageSync('local_orders') || [];
    return Promise.resolve({ data });
  }

  return callCloudFunction('orders', {
    action: 'adminList'
  }).then((res) => ({
    data: res.data || []
  }));
}

function completeOrder(id) {
  if (!id) {
    return Promise.reject(new Error('order id required'));
  }

  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const completedAt = new Date().toISOString();
    const next = localOrders.map((order) => (
      order._id === id
        ? Object.assign({}, order, { status: 'completed', completedAt })
        : order
    ));
    wx.setStorageSync('local_orders', next);
    return Promise.resolve({ ok: true, messageSent: false });
  }

  return callCloudFunction('orders', {
    action: 'complete',
    id
  });
}

function notifyCompletedOrder(id) {
  if (!id) {
    return Promise.reject(new Error('order id required'));
  }

  if (!isCloudReady()) {
    return Promise.resolve({ ok: true, messageSent: false });
  }

  return callCloudFunction('orders', {
    action: 'notifyCompleted',
    id
  });
}

function deleteCompletedOrder(id) {
  if (!id) {
    return Promise.reject(new Error('order id required'));
  }

  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const next = localOrders.filter((order) => order._id !== id);
    wx.setStorageSync('local_orders', next);
    return Promise.resolve({
      ok: true,
      count: localOrders.length - next.length
    });
  }

  return callCloudFunction('orders', {
    action: 'adminDeleteCompleted',
    id
  });
}

function deleteAdminOrder(id) {
  if (!id) {
    return Promise.reject(new Error('order id required'));
  }

  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const next = localOrders.filter((order) => order._id !== id);
    wx.setStorageSync('local_orders', next);
    return Promise.resolve({
      ok: true,
      count: localOrders.length - next.length
    });
  }

  return callCloudFunction('orders', {
    action: 'adminDeleteCompleted',
    id
  });
}

function deleteOrders(ids = []) {
  const targets = ids.filter(Boolean);
  if (!targets.length) {
    return Promise.resolve({ ok: true, count: 0 });
  }

  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const next = localOrders.filter((order) => !targets.includes(order._id));
    wx.setStorageSync('local_orders', next);
    return Promise.resolve({
      ok: true,
      count: localOrders.length - next.length
    });
  }

  return callCloudFunction('orders', {
    action: 'delete',
    ids: targets
  });
}

function deleteOrder(id) {
  return deleteOrders([id]);
}

function requestCancelOrder(id) {
  if (!id) return Promise.reject(new Error('order id required'));

  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const next = localOrders.map((order) => (
      order._id === id
        ? Object.assign({}, order, { cancelStatus: 'pending' })
        : order
    ));
    wx.setStorageSync('local_orders', next);
    return Promise.resolve({ ok: true });
  }

  return callCloudFunction('orders', { action: 'requestCancel', id });
}

function approveCancelOrder(id) {
  if (!id) return Promise.reject(new Error('order id required'));

  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const next = localOrders.map((order) => (
      order._id === id
        ? Object.assign({}, order, { cancelStatus: 'approved', status: 'cancelled' })
        : order
    ));
    wx.setStorageSync('local_orders', next);
    return Promise.resolve({ ok: true });
  }

  return callCloudFunction('orders', { action: 'approveCancel', id });
}

function rejectCancelOrder(id) {
  if (!id) return Promise.reject(new Error('order id required'));

  if (!isCloudReady()) {
    const localOrders = wx.getStorageSync('local_orders') || [];
    const next = localOrders.map((order) => (
      order._id === id
        ? Object.assign({}, order, { cancelStatus: 'rejected' })
        : order
    ));
    wx.setStorageSync('local_orders', next);
    return Promise.resolve({ ok: true });
  }

  return callCloudFunction('orders', { action: 'rejectCancel', id });
}

function uploadProductImage(productId, tempFilePath) {
  if (!isCloudReady()) {
    return Promise.reject(new Error('cloud is not ready'));
  }

  const extMatch = tempFilePath.match(/\.[a-zA-Z0-9]+$/);
  const ext = extMatch ? extMatch[0] : '.jpg';
  const cloudPath = `menu-images/${productId}-${Date.now()}${ext}`;

  return wx.cloud.uploadFile({
    cloudPath,
    filePath: tempFilePath
  })
    .then((res) => updateProductImage(productId, res.fileID).then(() => res.fileID));
}

function updateProductImage(productId, image = '') {
  if (!isCloudReady()) {
    return Promise.reject(new Error('cloud is not ready'));
  }

  return callCloudFunction('menuAdmin', {
    action: 'updateImage',
    productId,
    image
  });
}

function clearAllProductImages() {
  if (!isCloudReady()) {
    return Promise.reject(new Error('cloud is not ready'));
  }

  return callCloudFunction('menuAdmin', {
    action: 'clearAllImages'
  });
}

function seedMenuData(options = {}) {
  if (!isCloudReady()) {
    return Promise.reject(new Error('cloud is not ready'));
  }

  return callCloudFunction('menuAdmin', {
    action: 'seed',
    categories: options.categories || [],
    products: options.products || [],
    overwrite: Boolean(options.overwrite)
  });
}

module.exports = {
  checkAdmin,
  getCategories,
  getProducts,
  createCategory,
  deleteCategory,
  createOrder,
  requestOrderCompletedSubscribe,
  getOrders,
  getAdminOrders,
  completeOrder,
  notifyCompletedOrder,
  deleteCompletedOrder,
  deleteAdminOrder,
  deleteOrder,
  deleteOrders,
  requestCancelOrder,
  approveCancelOrder,
  rejectCancelOrder,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  updateProductImage,
  clearAllProductImages,
  seedMenuData,
  formatOrderTime
};
