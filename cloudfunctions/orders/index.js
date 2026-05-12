const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const ORDERS = 'orders';

function assertOrder(order = {}) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('order items required');
  }
  if (!order.contact || !order.contact.contactName || !order.contact.phone) {
    throw new Error('contact required');
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
