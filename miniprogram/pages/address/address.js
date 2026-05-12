const address = require('../../utils/address');

Page({
  data: {
    addresses: [],
    mode: 'manage',
    editing: false,
    editData: {
      _id: '',
      name: '',
      phone: '',
      address: '',
      tag: 'other',
      isDefault: false
    },
    tags: [
      { value: 'home', label: '🏠 家' },
      { value: 'office', label: '🏢 公司' },
      { value: 'school', label: '🎓 学校' },
      { value: 'other', label: '📍 其他' }
    ]
  },

  onLoad(options) {
    if (options.mode === 'select') {
      this.setData({ mode: 'select' });
      wx.setNavigationBarTitle({ title: '选择地址' });
    }
    this.loadAddresses();
  },

  onShow() {
    this.loadAddresses();
  },

  loadAddresses() {
    const addresses = address.getAddresses();
    this.setData({ addresses, editing: false });
  },

  onSelect(e) {
    if (this.data.mode !== 'select') return;
    const addr = e.currentTarget.dataset.address;
    address.setLastUsedId(addr._id);
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev) {
      prev.setData({
        'form.contactName': addr.name,
        'form.phone': addr.phone,
        'form.address': addr.address
      });
    }
    wx.navigateBack();
  },

  onNew() {
    this.setData({
      editing: true,
      editData: {
        _id: '',
        name: '',
        phone: '',
        address: '',
        tag: 'other',
        isDefault: false
      }
    });
  },

  onEdit(e) {
    const addr = e.currentTarget.dataset.address;
    this.setData({
      editing: true,
      editData: Object.assign({}, addr)
    });
  },

  onDelete(e) {
    const addr = e.currentTarget.dataset.address;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${addr.name}"的地址吗？`,
      confirmColor: '#FF7B89',
      success: (res) => {
        if (res.confirm) {
          address.deleteAddress(addr._id);
          this.loadAddresses();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  onDefault(e) {
    const id = e.currentTarget.dataset.id;
    address.setDefault(id);
    this.loadAddresses();
    wx.showToast({ title: '已设为默认', icon: 'success' });
  },

  updateField(e) {
    const key = e.currentTarget.dataset.key;
    const value = typeof e.detail.value === 'string' ? e.detail.value : '';
    this.setData({
      [`editData.${key}`]: value
    });
  },

  onTagSelect(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({
      'editData.tag': tag
    });
  },

  onSave() {
    const data = this.data.editData;
    const name = data.name.trim();
    const phone = data.phone.trim();
    const addr = data.address.trim();

    if (name.length < 2 || name.length > 20) {
      wx.showToast({ title: '联系人需为2-20个字符', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (!addr) {
      wx.showToast({ title: '请输入详细地址', icon: 'none' });
      return;
    }

    address.saveAddress({
      _id: data._id || undefined,
      name,
      phone,
      address: addr,
      tag: data.tag,
      isDefault: data.isDefault
    });

    wx.showToast({ title: '保存成功', icon: 'success' });
    this.loadAddresses();
  },

  onCancel() {
    this.setData({ editing: false });
  },

  onManage() {
    wx.redirectTo({
      url: '/pages/address/address'
    });
  }
});
