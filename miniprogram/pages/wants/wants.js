const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/leancloud-api.js');

const CATEGORIES = ['全部', '电子产品', '书籍教材', '生活用品', '服饰鞋包', '美妆护肤', '运动户外', '票务卡券', '其他'];
const CAMPUSES = ['全部', '主校区', '东校区', '西校区', '南校区'];

Page({
  data: {
    categories: CATEGORIES,
    campuses: CAMPUSES,
    categoryIndex: 0,
    campusIndex: 0,
    minBudget: '',
    maxBudget: '',
    wants: [],
    loading: false,
    refreshing: false,
    error: ''
  },

  onLoad() {
    app.onLoginReady(() => {
      this.initCampus();
      this.loadWants();
    });
  },

  onShow() {
    if (app.globalData.loginReady) this.loadWants();
  },

  onPullDownRefresh() {
    this.loadWants().finally(() => wx.stopPullDownRefresh());
  },

  initCampus() {
    const user = app.globalData.userInfo || {};
    const idx = user.campus ? CAMPUSES.indexOf(user.campus) : 0;
    this.setData({ campusIndex: idx > 0 ? idx : 0 });
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: parseInt(e.detail.value) });
    this.loadWants();
  },

  onCampusChange(e) {
    this.setData({ campusIndex: parseInt(e.detail.value) });
    this.loadWants();
  },

  onMinBudgetInput(e) {
    this.setData({ minBudget: e.detail.value });
  },

  onMaxBudgetInput(e) {
    this.setData({ maxBudget: e.detail.value });
  },

  resetFilter() {
    this.setData({ categoryIndex: 0, campusIndex: 0, minBudget: '', maxBudget: '' });
    this.initCampus();
    this.loadWants();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadWants().finally(() => this.setData({ refreshing: false }));
  },

  loadWants() {
    this.setData({ loading: true, error: '' });
    const params = {
      category: CATEGORIES[this.data.categoryIndex],
      campus: CAMPUSES[this.data.campusIndex],
      minBudget: parseFloat(this.data.minBudget) || 0,
      maxBudget: parseFloat(this.data.maxBudget) || 0
    };
    return api.getWants(params)
      .then(res => {
        const data = res.data || [];
        this.setData({ wants: data, loading: false });
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, error: '加载失败，请下拉重试' });
      });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/want-detail/want-detail?id=' + id });
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});