const cloud = require('wx-server-sdk');
const mock = require('./mockData');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const COLLECTIONS = {
  categories: 'categories',
  products: 'products'
};
const ADMIN_OPENIDS = (process.env.ADMIN_OPENIDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

function getOpenid() {
  return cloud.getWXContext().OPENID;
}

function isAdmin(openid) {
  return Boolean(openid && ADMIN_OPENIDS.includes(openid));
}

function assertAdmin() {
  if (!isAdmin(getOpenid())) {
    throw new Error('permission denied');
  }
}

function withoutId(item) {
  const next = Object.assign({}, item);
  delete next._id;
  return next;
}

async function seedMenu() {
  const [categoryRes, productRes] = await Promise.all([
    db.collection(COLLECTIONS.categories).limit(1).get(),
    db.collection(COLLECTIONS.products).limit(1).get()
  ]);
  const hasCategories = (categoryRes.data || []).length > 0;
  const hasProducts = (productRes.data || []).length > 0;
  if (hasCategories && hasProducts) {
    return {
      ok: true,
      skipped: true
    };
  }

  const categoryTasks = hasCategories ? [] : mock.categories.map((item) => (
    db.collection(COLLECTIONS.categories).doc(item._id).set({
      data: Object.assign(withoutId(item), {
        createdAt: db.serverDate()
      })
    })
  ));
  const productTasks = hasProducts ? [] : mock.products.map((item, index) => (
    db.collection(COLLECTIONS.products).doc(item._id).set({
      data: Object.assign(withoutId(item), {
        sort: index + 1,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      })
    })
  ));

  await Promise.all(categoryTasks.concat(productTasks));
  return {
    ok: true,
    skipped: false
  };
}

async function listCategories() {
  const res = await db.collection(COLLECTIONS.categories)
    .orderBy('sort', 'asc')
    .limit(100)
    .get();
  return {
    ok: true,
    data: res.data || []
  };
}

async function createCategory(category = {}) {
  const name = String(category.name || '').trim();
  if (!name || name.length > 20) {
    throw new Error('invalid category');
  }

  const data = {
    name,
    sort: Number(category.sort) || Date.now(),
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };
  const res = await db.collection(COLLECTIONS.categories).add({ data });
  return {
    ok: true,
    id: res._id
  };
}

async function deleteCategory(categoryId) {
  if (!categoryId) throw new Error('category id required');
  const productRes = await db.collection(COLLECTIONS.products)
    .where({ categoryId })
    .limit(1)
    .get();
  if ((productRes.data || []).length > 0) {
    return {
      ok: false,
      message: 'category has products'
    };
  }

  const res = await db.collection(COLLECTIONS.categories).doc(categoryId).remove();
  return {
    ok: true,
    count: res.stats ? res.stats.removed : 0
  };
}

async function listProducts(categoryId) {
  const collection = db.collection(COLLECTIONS.products);
  const query = categoryId ? collection.where({ categoryId }) : collection;
  const res = await query
    .orderBy('sort', 'asc')
    .limit(100)
    .get();
  return {
    ok: true,
    data: res.data || []
  };
}

async function createProduct(product = {}) {
  const name = String(product.name || '').trim();
  const categoryId = String(product.categoryId || '').trim();
  const price = Number(product.price);
  if (!name || !categoryId || !Number.isFinite(price) || price <= 0) {
    throw new Error('invalid product');
  }

  const data = {
    categoryId,
    name,
    description: String(product.description || '').trim(),
    price,
    sales: Number(product.sales) || 0,
    tag: String(product.tag || '').trim(),
    image: String(product.image || ''),
    available: product.available !== false,
    sort: Number(product.sort) || Date.now(),
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };
  const res = await db.collection(COLLECTIONS.products).add({ data });
  return {
    ok: true,
    id: res._id
  };
}

async function deleteProduct(productId) {
  if (!productId) throw new Error('product id required');
  const res = await db.collection(COLLECTIONS.products).doc(productId).remove();
  return {
    ok: true,
    count: res.stats ? res.stats.removed : 0
  };
}

async function updateImage(productId, image = '') {
  if (!productId) throw new Error('product id required');
  await db.collection(COLLECTIONS.products).doc(productId).update({
    data: {
      image,
      updatedAt: db.serverDate()
    }
  });
  return {
    ok: true
  };
}

async function clearAllImages() {
  const res = await db.collection(COLLECTIONS.products).limit(100).get();
  const products = res.data || [];
  await Promise.all(products
    .filter((item) => item.image)
    .map((item) => updateImage(item._id, '')));
  return {
    ok: true,
    count: products.length
  };
}

exports.main = async (event = {}) => {
  const action = event.action || 'seed';
  const openid = getOpenid();

  if (action === 'checkAdmin') {
    return {
      ok: true,
      isAdmin: isAdmin(openid),
      openid
    };
  }

  if (action === 'listCategories') {
    return listCategories();
  }
  if (action === 'listProducts') {
    return listProducts(event.categoryId);
  }

  assertAdmin();

  if (action === 'seed') {
    return seedMenu();
  }
  if (action === 'createCategory') {
    return createCategory(event.category);
  }
  if (action === 'deleteCategory') {
    return deleteCategory(event.categoryId);
  }
  if (action === 'createProduct') {
    return createProduct(event.product);
  }
  if (action === 'deleteProduct') {
    return deleteProduct(event.productId);
  }
  if (action === 'updateImage') {
    return updateImage(event.productId, event.image || '');
  }
  if (action === 'clearAllImages') {
    return clearAllImages();
  }

  throw new Error(`unknown action: ${action}`);
};
