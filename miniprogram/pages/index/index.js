const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/leancloud-api.js');

const CATEGORIES = ['全部', '电子产品', '书籍教材', '生活用品', '服饰鞋包', '美妆护肤', '运动户外', '票务卡券', '其他'];
const CAMPUSES = ['全部', '主校区', '东校区', '西校区', '南校区'];
const SORTS = [
  { label: '最新', field: 'createTime', order: 'desc' },
  { label: '价格最低', field: 'price', order: 'asc' },
  { label: '价格最高', field: 'price', order: 'desc' }
];

Page({
  data: {
    categories: CATEGORIES,
    campuses: CAMPUSES,
    sortLabels: SORTS.map(s => s.label),
    categoryIndex: 0,
    campusIndex: 0,
    sortIndex: 0,
    minPrice: '',
    maxPrice: '',
    keyword: '',
    items: [],
    loading: false,
    refreshing: false,
    error: '',
    statusText: { active: '在售', offline: '已下架', sold: '已售' }
  },

  onLoad() {
    app.onLoginReady(() => {
      this.initCampus();
      this.loadItems();
    });
  },

  onShow() {
    if (app.globalData.loginReady) {
      this.loadItems();
    }
  },

  onPullDownRefresh() {
    this.loadItems().finally(() => wx.stopPullDownRefresh());
  },

  initCampus() {
    const user = app.globalData.userInfo || {};
    const idx = user.campus ? CAMPUSES.indexOf(user.campus) : 0;
    this.setData({ campusIndex: idx > 0 ? idx : 0 });
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadItems();
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: parseInt(e.detail.value) });
    this.loadItems();
  },

  onCampusChange(e) {
    this.setData({ campusIndex: parseInt(e.detail.value) });
    this.loadItems();
  },

  onSortChange(e) {
    this.setData({ sortIndex: parseInt(e.detail.value) });
    this.loadItems();
  },

  onMinPriceInput(e) {
    this.setData({ minPrice: e.detail.value });
  },

  onMaxPriceInput(e) {
    this.setData({ maxPrice: e.detail.value });
  },

  resetFilter() {
    this.setData({
      categoryIndex: 0,
      campusIndex: 0,
      sortIndex: 0,
      minPrice: '',
      maxPrice: '',
      keyword: ''
    });
    this.initCampus();
    this.loadItems();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadItems().finally(() => this.setData({ refreshing: false }));
  },

  loadItems() {
    this.setData({ loading: true, error: '' });
    const sort = SORTS[this.data.sortIndex];
    const params = {
      category: CATEGORIES[this.data.categoryIndex],
      campus: CAMPUSES[this.data.campusIndex],
      minPrice: parseFloat(this.data.minPrice) || 0,
      maxPrice: parseFloat(this.data.maxPrice) || 0,
      sort,
      keyword: this.data.keyword.trim()
    };
    return api.getItems(params)
      .then(res => {
        const data = res.data || [];
        data.forEach(item => {
          item.timeStr = util.timeAgo(item.createTime);
        });
        this.setData({ items: data, loading: false });
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, error: '加载失败，请下拉重试' });
      });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/item-detail/item-detail?id=' + id });
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});