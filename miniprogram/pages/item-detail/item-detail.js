const app = getApp();
const util = require('../../utils/util.js');
const db = wx.cloud.database();

Page({
  data: {
    id: '',
    item: null,
    credit: { average: 0, count: 0 },
    isSeller: false,
    isFavorite: false,
    canRate: false,
    loading: false,
    error: '',
    statusText: { active: '在售', offline: '已下架', sold: '已售' }
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ id });
    app.onLoginReady(() => this.loadDetail(id));
  },

  onShow() {
    if (this.data.id) this.loadDetail(this.data.id);
  },

  loadDetail(id) {
    this.setData({ loading: true, error: '' });
    const openid = app.globalData.openid;
    wx.cloud.callFunction({ name: 'getItem', data: { id } })
      .then(res => {
        const item = res.result.data;
        const credit = res.result.credit || { average: 0, count: 0 };
        if (!item) {
          this.setData({ loading: false, error: '商品不存在' });
          return;
        }
        this.setData({
          item,
          credit,
          isSeller: item.sellerOpenid === openid,
          loading: false
        });
        this.checkFavorite();
        this.checkCanRate();
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, error: '加载失败' });
      });
  },

  checkFavorite() {
    const openid = app.globalData.openid;
    db.collection('favorites').where({
      _openid: openid,
      targetId: this.data.id,
      type: 'item'
    }).get().then(res => {
      this.setData({ isFavorite: res.data && res.data.length > 0 });
    });
  },

  toggleFavorite() {
    const openid = app.globalData.openid;
    const { id, isFavorite } = this.data;
    if (isFavorite) {
      db.collection('favorites').where({ _openid: openid, targetId: id, type: 'item' }).remove()
        .then(() => this.setData({ isFavorite: false }));
    } else {
      db.collection('favorites').add({
        data: { targetId: id, type: 'item', createTime: db.serverDate() }
      }).then(() => this.setData({ isFavorite: true }));
    }
  },

  checkCanRate() {
    const openid = app.globalData.openid;
    const { item } = this.data;
    if (!item || item.status !== 'sold' || item.sellerOpenid === openid) {
      this.setData({ canRate: false });
      return;
    }
    wx.cloud.callFunction({
      name: 'getRatings',
      data: { targetId: item._id }
    }).then(res => {
      const list = res.result.data || [];
      const already = list.some(r => r.buyerOpenid === openid);
      this.setData({ canRate: !already });
    });
  },

  contactSeller() {
    const { item } = this.data;
    if (!item || item.status !== 'active') {
      wx.showToast({ title: '该商品暂不可联系', icon: 'none' });
      return;
    }
    wx.cloud.callFunction({
      name: 'createChat',
      data: { type: 'item', targetId: item._id }
    }).then(res => {
      const chat = res.result.chat || {};
      wx.navigateTo({
        url: `/pages/chat/chat?chatId=${chat._id || res.result.chatId}&type=item&targetId=${item._id}&peerName=${encodeURIComponent(chat.peerName || item.sellerNickName || '')}&peerAvatar=${encodeURIComponent(chat.peerAvatar || item.sellerAvatar || '')}&title=${encodeURIComponent(item.title)}`
      });
    }).catch(err => {
      wx.showToast({ title: err.message || '发起聊天失败', icon: 'none' });
    });
  },

  editItem() {
    wx.showToast({ title: '编辑功能请在“我的发布”中长按管理', icon: 'none' });
  },

  toggleStatus() {
    const { item } = this.data;
    const nextStatus = item.status === 'active' ? 'offline' : 'active';
    wx.showModal({
      title: '确认操作',
      content: nextStatus === 'offline' ? '确认下架该商品？' : '确认重新上架？',
      success: (r) => {
        if (r.confirm) {
          wx.cloud.callFunction({
            name: 'updateItemStatus',
            data: { id: item._id, status: nextStatus }
          }).then(() => {
            wx.showToast({ title: '操作成功', icon: 'success' });
            this.loadDetail(item._id);
          }).catch(err => {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          });
        }
      }
    });
  },

  deleteItem() {
    const { item } = this.data;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除？',
      success: (r) => {
        if (r.confirm) {
          wx.cloud.callFunction({ name: 'deleteItem', data: { id: item._id } })
            .then(() => {
              wx.showToast({ title: '已删除', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 800);
            })
            .catch(err => {
              wx.showToast({ title: err.message || '删除失败', icon: 'none' });
            });
        }
      }
    });
  },

  goRating() {
    const { item } = this.data;
    wx.navigateTo({
      url: `/pages/rating/rating?targetId=${item._id}&sellerOpenid=${item.sellerOpenid}&title=${encodeURIComponent(item.title)}`
    });
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});
