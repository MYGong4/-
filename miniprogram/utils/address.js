const ADDRESS_KEY = 'saved_addresses';
const LAST_USED_KEY = 'last_used_address_id';

let addressCache = null;

const TAG_MAP = {
  home: { label: '家', icon: '🏠' },
  office: { label: '公司', icon: '🏢' },
  school: { label: '学校', icon: '🎓' },
  other: { label: '其他', icon: '📍' }
};

function getAddresses() {
  if (addressCache === null) {
    addressCache = wx.getStorageSync(ADDRESS_KEY) || [];
  }
  return addressCache;
}

function saveCache(list) {
  addressCache = list;
  wx.setStorageSync(ADDRESS_KEY, list);
}

function getAddress(id) {
  return getAddresses().find((item) => item._id === id) || null;
}

function saveAddress(address) {
  const list = getAddresses().slice();
  const shouldUseAsDefault = Boolean(address.isDefault);
  if (address._id) {
    const idx = list.findIndex((item) => item._id === address._id);
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], address);
    } else {
      list.push(address);
    }
  } else {
    address._id = `addr-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    address.createdAt = new Date().toISOString();
    list.push(address);
  }
  const next = shouldUseAsDefault
    ? list.map((item) => Object.assign({}, item, { isDefault: item._id === address._id }))
    : list;
  saveCache(next);
  if (shouldUseAsDefault) {
    setLastUsedId(address._id);
  }
  return address;
}

function deleteAddress(id) {
  const list = getAddresses().filter((item) => item._id !== id);
  saveCache(list);
  if (getLastUsedId() === id) {
    wx.removeStorageSync(LAST_USED_KEY);
  }
}

function getLastUsedId() {
  return wx.getStorageSync(LAST_USED_KEY) || '';
}

function setLastUsedId(id) {
  wx.setStorageSync(LAST_USED_KEY, id);
}

function getLastUsedAddress() {
  const id = getLastUsedId();
  if (!id) {
    const list = getAddresses();
    return list.find((item) => item.isDefault) || (list.length ? list[0] : null);
  }
  const list = getAddresses();
  return getAddress(id) || list.find((item) => item.isDefault) || (list[0] || null);
}

function setDefault(id) {
  const list = getAddresses().map((item) => (
    Object.assign({}, item, { isDefault: item._id === id })
  ));
  saveCache(list);
  setLastUsedId(id);
}

module.exports = {
  TAG_MAP,
  getAddresses,
  getAddress,
  saveAddress,
  deleteAddress,
  getLastUsedId,
  setLastUsedId,
  getLastUsedAddress,
  setDefault
};
