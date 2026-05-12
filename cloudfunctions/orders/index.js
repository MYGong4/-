const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const ORDERS = 'orders';
const ORDER_COMPLETED_TEMPLATE_ID = process.env.ORDER_COMPLETED_TEMPLATE_ID
  || 'A9FC2Y02LO63x3rA7lDsfHRc4-8MaEQTbGPnCwyu4YA';
const ADMIN_OPENIDS = (process.env.ADMIN_OPENIDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

function isAdmin(openid) {
  return Boolean(openid && ADMIN_OPENIDS.includes(openid));
}

function assertAdmin(openid) {
  if (!isAdmin(openid)) {
    throw new Error('permission denied');
  }
}

function assertOrder(order = {}) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('order items required');
  }
  if (!order.contact || !order.contact.contactName || !order.contact.phone) {
    throw new Error('contact required');
  }
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = toDate(value) || new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join(':');
}

function formatDate(value) {
  const date = toDate(value) || new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-');
}

function limitText(value, maxLength) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function getOrderTitle(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return '餐品';
  const title = items.map((item) => item.name).filter(Boolean).join('、');
  return title || '餐品';
}

async function sendCompletedNotice(order, completedAt) {
  if (!ORDER_COMPLETED_TEMPLATE_ID || !order || !order._openid) {
    return { ok: false, skipped: true };
  }

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: order._openid,
      templateId: ORDER_COMPLETED_TEMPLATE_ID,
      page: 'pages/orders/orders',
      data: {
        character_string2: {
          value: limitText(order._id || '', 32)
        },
        time4: {
          value: formatDateTime(order.createdAt || order.serverCreatedAt)
        },
        date7: {
          value: formatDate(completedAt)
        },
        thing9: {
          value: limitText(getOrderTitle(order), 20)
        },
        thing5: {
          value: limitText('订单已完成，请及时取餐', 20)
        }
      }
    });
    return { ok: true };
  } catch (error) {
    console.error('[orders] send completed notice failed', error);
    return {
      ok: false,
      message: error && error.message ? error.message : 'send failed'
    };
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || 'list';

  if (action === 'create') {
    assertOrder(event.order);
    const now = new Date();
    const res = await db.collection(ORDERS).add({
      data: Object.assign({}, event.order, {
        _openid: openid,
        status: 'created',
        createdAt: now.toISOString(),
        serverCreatedAt: db.serverDate()
      })
    });
    return {
      ok: true,
      id: res._id
    };
  }

  if (action === 'list') {
    const res = await db.collection(ORDERS)
      .where({ _openid: openid })
      .orderBy('serverCreatedAt', 'desc')
      .limit(100)
      .get();
    return {
      ok: true,
      data: res.data || []
    };
  }

  if (action === 'adminList') {
    assertAdmin(openid);
    const res = await db.collection(ORDERS)
      .orderBy('serverCreatedAt', 'desc')
      .limit(100)
      .get();
    return {
      ok: true,
      data: res.data || []
    };
  }

  if (action === 'complete') {
    assertAdmin(openid);
    const id = String(event.id || '').trim();
    if (!id) throw new Error('order id required');

    const orderRes = await db.collection(ORDERS).doc(id).get();
    const order = orderRes.data;
    if (!order) throw new Error('order not found');

    if (order.status === 'completed') {
      return {
        ok: true,
        alreadyCompleted: true,
        messageSent: false
      };
    }

    const completedAt = new Date();
    await db.collection(ORDERS).doc(id).update({
      data: {
        status: 'completed',
        completedAt: completedAt.toISOString(),
        serverCompletedAt: db.serverDate()
      }
    });
    const notice = await sendCompletedNotice(Object.assign({}, order, { _id: id }), completedAt);
    return {
      ok: true,
      messageSent: Boolean(notice.ok),
      notice
    };
  }

  if (action === 'notifyCompleted') {
    assertAdmin(openid);
    const id = String(event.id || '').trim();
    if (!id) throw new Error('order id required');

    const orderRes = await db.collection(ORDERS).doc(id).get();
    const order = orderRes.data;
    if (!order) throw new Error('order not found');

    const completedAt = order.completedAt || order.serverCompletedAt || new Date();
    const notice = await sendCompletedNotice(Object.assign({}, order, { _id: id }), completedAt);
    return {
      ok: Boolean(notice.ok),
      messageSent: Boolean(notice.ok),
      notice
    };
  }

  if (action === 'adminDeleteCompleted') {
    assertAdmin(openid);
    const id = String(event.id || '').trim();
    if (!id) throw new Error('order id required');

    const orderRes = await db.collection(ORDERS).doc(id).get();
    const order = orderRes.data;
    if (!order) throw new Error('order not found');
    if (order.status !== 'completed') {
      throw new Error('only completed orders can be deleted');
    }

    const res = await db.collection(ORDERS).doc(id).remove();
    return {
      ok: true,
      count: res.stats ? res.stats.removed : 0
    };
  }

  if (action === 'delete') {
    const ids = Array.isArray(event.ids) ? event.ids.filter(Boolean) : [];
    const tasks = ids.map((id) => db.collection(ORDERS)
      .where({ _id: id, _openid: openid })
      .remove());
    const results = await Promise.all(tasks);
    return {
      ok: true,
      count: results.reduce((total, res) => total + (res.stats ? res.stats.removed : 0), 0)
    };
  }

  throw new Error(`unknown action: ${action}`);
};
