const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    type: 'item',
    list: [],
    loading: false,
    refreshing: false,
    error: '',
    statusText: { active: '在售', offline: '已下架', sold: '已售' }
  },

  onLoad() {
    app.onLoginReady(() => this.load());
  },

  onShow() {
    if (app.globalData.loginReady) this.load();
  },

  switchType(e) {
    this.setData({ type: e.currentTarget.dataset.type });
    this.load();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.load().finally(() => this.setData({ refreshing: false }));
  },

  load() {
    this.setData({ loading: true, error: '' });
    const openid = app.globalData.openid;
    if (this.data.type === 'item') {
      wx.cloud.callFunction({ name: 'getItems', data: { sellerOpenid: openid, status: '' } })
        .then(res => {
          const data = (res.result && res.result.data) || [];
          this.setData({ list: data, loading: false });
        })
        .catch(err => {
          console.error(err);
          this.setData({ loading: false, error: '加载失败' });
        });
    } else {
      wx.cloud.callFunction({ name: 'getWants', data: { userOpenid: openid } })
        .then(res => {
          const data = (res.result && res.result.data) || [];
          this.setData({ list: data, loading: false });
        })
        .catch(err => {
          console.error(err);
          this.setData({ loading: false, error: '加载失败' });
        });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const url = this.data.type === 'item'
      ? '/pages/item-detail/item-detail?id=' + id
      : '/pages/want-detail/want-detail?id=' + id;
    wx.navigateTo({ url });
  },

  toggleStatus(e) {
    const item = e.currentTarget.dataset.item;
    const nextStatus = item.status === 'active' ? 'offline' : 'active';
    wx.cloud.callFunction({
      name: 'updateItemStatus',
      data: { id: item._id, status: nextStatus }
    }).then(() => {
      wx.showToast({ title: '状态已更新', icon: 'success' });
      this.load();
    }).catch(err => {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    });
  },

  markSold(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '标记已售',
      content: '确认将该商品标记为已售？',
      success: (r) => {
        if (r.confirm) {
          wx.cloud.callFunction({
            name: 'updateItemStatus',
            data: { id: item._id, status: 'sold' }
          }).then(() => {
            wx.showToast({ title: '已标记售出', icon: 'success' });
            this.load();
          }).catch(err => {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          });
        }
      }
    });
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item;
    if (this.data.type === 'item') {
      wx.showModal({
        title: '编辑闲置',
        editable: true,
        placeholderText: '输入新标题',
        success: (r) => {
          if (r.confirm && r.content) {
            wx.showModal({
              title: '编辑价格',
              editable: true,
              placeholderText: '输入新价格',
              success: (r2) => {
                if (r2.confirm && r2.content) {
                  const price = parseFloat(r2.content);
                  if (isNaN(price)) {
                    wx.showToast({ title: '价格无效', icon: 'none' });
                    return;
                  }
                  wx.cloud.callFunction({
                    name: 'updateItem',
                    data: { id: item._id, data: { title: r.content.trim(), price } }
                  }).then(() => {
                    wx.showToast({ title: '已更新', icon: 'success' });
                    this.load();
                  }).catch(err => {
                    wx.showToast({ title: err.message || '更新失败', icon: 'none' });
                  });
                }
              }
            });
          }
        }
      });
    } else {
      wx.showModal({
        title: '编辑求购',
        editable: true,
        placeholderText: '输入新标题',
        success: (r) => {
          if (r.confirm && r.content) {
            wx.showModal({
              title: '编辑预算',
              editable: true,
              placeholderText: '输入新预算',
              success: (r2) => {
                if (r2.confirm && r2.content) {
                  const budget = parseFloat(r2.content);
                  if (isNaN(budget)) {
                    wx.showToast({ title: '预算无效', icon: 'none' });
                    return;
                  }
                  // 求购暂无 updateWant 云函数，直接客户端更新自己的记录
                  const db = wx.cloud.database();
                  db.collection('wants').doc(item._id).update({
                    data: { title: r.content.trim(), budget, updateTime: db.serverDate() }
                  }).then(() => {
                    wx.showToast({ title: '已更新', icon: 'success' });
                    this.load();
                  }).catch(err => {
                    wx.showToast({ title: err.message || '更新失败', icon: 'none' });
                  });
                }
              }
            });
          }
        }
      });
    }
  },

  deleteItem(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除？',
      success: (r) => {
        if (r.confirm) {
          const fn = this.data.type === 'item' ? 'deleteItem' : 'deleteWant';
          wx.cloud.callFunction({ name: fn, data: { id: item._id } })
            .then(() => {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.load();
            })
            .catch(err => {
              wx.showToast({ title: err.message || '删除失败', icon: 'none' });
            });
        }
      }
    });
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});
