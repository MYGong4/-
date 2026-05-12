const CART_KEY = 'ordering_cart';
let cartCache = null;

function getCart() {
  if (cartCache === null) {
    cartCache = wx.getStorageSync(CART_KEY) || [];
  }
  return cartCache;
}

function saveCart(cart) {
  cartCache = cart;
  wx.setStorageSync(CART_KEY, cart);
}

function addItem(product, count = 1) {
  const cart = getCart().slice();
  const index = cart.findIndex((item) => item.productId === product._id);
  if (index >= 0) {
    cart[index].count += count;
  } else {
    cart.push({
      productId: product._id,
      categoryId: product.categoryId,
      name: product.name,
      price: product.price,
      count,
      tag: product.tag || ''
    });
  }
  saveCart(cart);
  return cart;
}

function setCount(productId, count) {
  const next = getCart()
    .map((item) => (item.productId === productId ? Object.assign({}, item, { count }) : item))
    .filter((item) => item.count > 0);
  saveCart(next);
  return next;
}

function clearCart() {
  saveCart([]);
}

function refreshCart(products = []) {
  const productMap = products.reduce((map, product) => {
    map[product._id] = product;
    return map;
  }, {});
  const next = getCart()
    .map((item) => {
      const product = productMap[item.productId];
      if (!product) return item;
      return Object.assign({}, item, {
        categoryId: product.categoryId,
        name: product.name,
        price: product.price,
        tag: product.tag || ''
      });
    })
    .filter((item) => item.count > 0);
  saveCart(next);
  return next;
}

function getCartSummary(cart = getCart()) {
  return cart.reduce(
    (summary, item) => {
      summary.count += item.count;
      summary.amount += item.price * item.count;
      return summary;
    },
    { count: 0, amount: 0 }
  );
}

module.exports = {
  getCart,
  saveCart,
  addItem,
  setCount,
  clearCart,
  refreshCart,
  getCartSummary
};
