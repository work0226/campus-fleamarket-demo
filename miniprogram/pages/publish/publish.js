const app = getApp();
const api = require('../../utils/leancloud-api.js');

const CATEGORIES = ['电子产品', '书籍教材', '生活用品', '服饰鞋包', '美妆护肤', '运动户外', '票务卡券', '其他'];
const CAMPUSES = ['全部', '主校区', '东校区', '西校区', '南校区'];
const CONDITIONS = ['不限', '全新', '几乎全新', '轻微使用', '明显使用'];
const TRADE_METHODS = ['自提', '当面交易', '快递'];

Page({
  data: {
    type: 'item',
    categories: CATEGORIES,
    campuses: CAMPUSES,
    conditions: CONDITIONS,
    tradeMethods: TRADE_METHODS.map(name => ({ name, checked: false })),
    categoryIndex: 0,
    campusIndex: 0,
    conditionIndex: 0,
    title: '',
    price: '',
    budget: '',
    location: '',
    desc: '',
    images: [],
    submitting: false
  },

  onLoad() {
    app.onLoginReady(() => {
      const user = app.globalData.userInfo || {};
      const idx = user.campus ? CAMPUSES.indexOf(user.campus) : 0;
      this.setData({ campusIndex: idx > 0 ? idx : 0 });
    });
  },

  switchType(e) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onPriceInput(e) {
    this.setData({ price: e.detail.value });
  },

  onBudgetInput(e) {
    this.setData({ budget: e.detail.value });
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: parseInt(e.detail.value) });
  },

  onConditionChange(e) {
    this.setData({ conditionIndex: parseInt(e.detail.value) });
  },

  onCampusChange(e) {
    this.setData({ campusIndex: parseInt(e.detail.value) });
  },

  toggleTrade(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    const list = this.data.tradeMethods.slice();
    list[idx].checked = !list[idx].checked;
    this.setData({ tradeMethods: list });
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ desc: e.detail.value });
  },

  chooseImage() {
    const remain = 9 - this.data.images.length;
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        this.uploadImages(res.tempFilePaths);
      }
    });
  },

  uploadImages(paths) {
    const tasks = paths.map(path => api.uploadImage(path));
    Promise.all(tasks).then(results => {
      const urls = results.map(r => r.url);
      this.setData({ images: this.data.images.concat(urls) });
    }).catch(err => {
      wx.showToast({ title: '图片上传失败', icon: 'none' });
      console.error(err);
    });
  },

  deleteImage(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    const images = this.data.images.slice();
    images.splice(idx, 1);
    this.setData({ images });
  },

  submit() {
    if (this.data.submitting) return;

    const { type, title, categoryIndex, desc, campusIndex } = this.data;
    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    const campus = CAMPUSES[campusIndex];
    let payload;

    if (type === 'item') {
      const price = parseFloat(this.data.price);
      if (isNaN(price) || price < 0) {
        wx.showToast({ title: '请输入有效价格', icon: 'none' });
        return;
      }
      const trade = this.data.tradeMethods.filter(t => t.checked).map(t => t.name);
      payload = {
        title: title.trim(),
        price,
        category: CATEGORIES[categoryIndex],
        location: this.data.location,
        trade,
        desc: desc.trim(),
        images: this.data.images,
        campus
      };
    } else {
      const budget = parseFloat(this.data.budget);
      if (isNaN(budget) || budget < 0) {
        wx.showToast({ title: '请输入有效预算', icon: 'none' });
        return;
      }
      payload = {
        title: title.trim(),
        budget,
        condition: CONDITIONS[this.data.conditionIndex],
        category: CATEGORIES[categoryIndex],
        note: desc.trim(),
        campus
      };
    }

    this.setData({ submitting: true });
    const publishFn = type === 'item' ? api.publishItem : api.publishWant;
    publishFn(payload)
      .then(() => {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: type === 'item' ? '/pages/index/index' : '/pages/wants/wants' });
        }, 800);
      })
      .catch(err => {
        wx.showToast({ title: err.message || '发布失败', icon: 'none' });
        console.error(err);
      })
      .finally(() => this.setData({ submitting: false }));
  }
});