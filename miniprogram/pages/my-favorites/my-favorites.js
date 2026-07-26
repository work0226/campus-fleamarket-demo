const app = getApp();
const util = require('../../utils/util.js');
const db = wx.cloud.database();

Page({
  data: {
    list: [],
    loading: false,
    refreshing: false,
    error: ''
  },

  onLoad() {
    app.onLoginReady(() => this.load());
  },

  onShow() {
    if (app.globalData.loginReady) this.load();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.load().finally(() => this.setData({ refreshing: false }));
  },

  load() {
    this.setData({ loading: true, error: '' });
    const openid = app.globalData.openid;
    db.collection('favorites').where({ _openid: openid }).orderBy('createTime', 'desc').get()
      .then(res => {
        const favs = res.data || [];
        return this.loadTargets(favs);
      })
      .then(list => {
        this.setData({ list, loading: false });
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, error: '加载失败' });
      });
  },

  loadTargets(favs) {
    const tasks = favs.map(f => {
      const fn = f.type === 'item' ? 'getItem' : 'getWant';
      return wx.cloud.callFunction({ name: fn, data: { id: f.targetId } })
        .then(res => ({ ...f, target: res.result.data || {} }));
    });
    return Promise.all(tasks);
  },

  goDetail(e) {
    const item = e.currentTarget.dataset.item;
    const url = item.type === 'item'
      ? '/pages/item-detail/item-detail?id=' + item.targetId
      : '/pages/want-detail/want-detail?id=' + item.targetId;
    wx.navigateTo({ url });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    const idx = e.currentTarget.dataset.index;
    db.collection('favorites').doc(id).remove()
      .then(() => {
        const list = this.data.list.slice();
        list.splice(idx, 1);
        this.setData({ list });
      })
      .catch(err => {
        wx.showToast({ title: '删除失败', icon: 'none' });
        console.error(err);
      });
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});
