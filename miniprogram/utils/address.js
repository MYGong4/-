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

function parseAddressText(text = '') {
  const source = String(text || '').trim();
  const raw = source
    .replace(/[，,；;|｜]/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
  if (!raw) return null;

  const phoneMatch = raw.match(/1[3-9]\d{9}/);
  const phone = phoneMatch ? phoneMatch[0] : '';
  const nameLabel = '(?:收货人|收件人|联系人|姓名|名字)';
  const phoneLabel = '(?:手机号码|手机号|联系电话|电话|手机)';
  const addressLabel = '(?:收货地址|详细地址|所在地区|地区|地址)';
  const nameMatch = raw.match(new RegExp(`${nameLabel}\\s*[:：]?\\s*([^\\n\\s，,；;|｜]{1,20})`));
  const phoneLineMatch = raw.match(new RegExp(`([^\\n]{0,24})${phoneLabel}\\s*[:：]?\\s*${phone || '1[3-9]\\d{9}'}`));
  const addressMatch = raw.match(new RegExp(`${addressLabel}\\s*[:：]?\\s*([^\\n]+(?:\\n(?!\\s*(?:${nameLabel}|${phoneLabel}|${addressLabel})\\s*[:：]?)[^\\n]+)*)`));

  let name = nameMatch ? cleanupName(nameMatch[1]) : '';
  if (!name && phoneLineMatch) {
    name = cleanupName(phoneLineMatch[1]);
  }

  const textWithoutPhone = phone ? raw.replace(phone, ' ') : raw;
  const lines = textWithoutPhone
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!name) {
    const candidate = lines.find((line) => (
      !new RegExp(`^\\s*(?:${phoneLabel}|${addressLabel})\\s*[:：]?`).test(line)
    ));
    name = cleanupName(candidate || '');
  }

  let address = addressMatch ? cleanupAddress(addressMatch[1]) : '';
  if (!address) {
    address = cleanupAddress(lines
      .filter((line) => {
        const cleaned = cleanupAddress(line);
        return cleaned && cleaned !== name && !new RegExp(`^\\s*(?:${nameLabel}|${phoneLabel})\\s*[:：]?`).test(line);
      })
      .join(' '));
  }

  if (!phone) {
    return {
      name,
      phone: '',
      address: address || cleanupAddress(raw)
    };
  }

  return {
    name,
    phone,
    address
  };
}

function cleanupName(value = '') {
  return String(value || '')
    .replace(/^(收货人|收件人|联系人|姓名|名字|手机号码|手机号|联系电话|电话|手机|收货地址|详细地址|所在地区|地区|地址)\s*[:：]?/, '')
    .replace(/1[3-9]\d{9}/g, '')
    .replace(/[：:，,；;|｜]/g, ' ')
    .trim()
    .split(/\s+/)[0]
    .slice(0, 20);
}

function cleanupAddress(value = '') {
  return String(value || '')
    .replace(/^(收货地址|详细地址|所在地区|地区|地址)\s*[:：]?/, '')
    .replace(/^(收货人|收件人|联系人|姓名|名字|手机号码|手机号|联系电话|电话|手机)\s*[:：]?.*$/gm, '')
    .replace(/1[3-9]\d{9}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  setDefault,
  parseAddressText
};
