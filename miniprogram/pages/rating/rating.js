const app = getApp();
const api = require('../../utils/leancloud-api.js');

Page({
  data: {
    targetId: '',
    sellerOpenid: '',
    title: '',
    score: 5,
    submitting: false
  },

  onLoad(options) {
    this.setData({
      targetId: options.targetId || '',
      sellerOpenid: options.sellerOpenid || '',
      title: decodeURIComponent(options.title || '')
    });
  },

  setScore(e) {
    this.setData({ score: parseInt(e.currentTarget.dataset.score) });
  },

  submit() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    api.submitRating({
      type: 'item',
      targetId: this.data.targetId,
      sellerOpenid: this.data.sellerOpenid,
      score: this.data.score
    }).then(res => {
      const result = res || {};
      if (result.code !== 0) {
        wx.showToast({ title: result.message || '评分失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    }).catch(err => {
      wx.showToast({ title: err.message || '评分失败', icon: 'none' });
      console.error(err);
    }).finally(() => this.setData({ submitting: false }));
  }
});
