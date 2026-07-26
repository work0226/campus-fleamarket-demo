const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    user: {},
    stats: { items: 0, favorites: 0 },
    credit: { average: 0, count: 0 }
  },

  onLoad() {
    app.onLoginReady(() => this.refresh());
  },

  onShow() {
    if (app.globalData.loginReady) this.refresh();
  },

  refresh() {
    const user = app.globalData.userInfo || {};
    this.setData({ user });
    this.loadStats();
    this.loadCredit();
  },

  loadStats() {
    const openid = app.globalData.openid;
    wx.cloud.callFunction({ name: 'getItems', data: { sellerOpenid: openid, status: '' } })
      .then(res => {
        const items = (res.result && res.result.data) || [];
        return db.collection('favorites').where({ _openid: openid }).count()
          .then(favRes => {
            this.setData({
              stats: {
                items: items.length,
                favorites: favRes.total || 0
              }
            });
          });
      });
  },

  loadCredit() {
    wx.cloud.callFunction({ name: 'getCreditScore', data: { sellerOpenid: app.globalData.openid } })
      .then(res => {
        const result = res.result || {};
        this.setData({ credit: { average: result.average || 0, count: result.count || 0 } });
      });
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const path = res.tempFilePaths[0];
        const ext = path.match(/\.\w+$/) ? path.match(/\.\w+$/)[0] : '.jpg';
        const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
        wx.cloud.uploadFile({ cloudPath, filePath: path })
          .then(upRes => {
            wx.cloud.callFunction({ name: 'updateProfile', data: { avatarUrl: upRes.fileID } })
              .then(() => {
                app.refreshUser().then(u => this.setData({ user: u || {} }));
              });
          })
          .catch(err => {
            wx.showToast({ title: '头像上传失败', icon: 'none' });
            console.error(err);
          });
      }
    });
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/edit-profile/edit-profile' });
  },

  goMyItems() {
    wx.navigateTo({ url: '/pages/my-items/my-items' });
  },

  goMyFavorites() {
    wx.navigateTo({ url: '/pages/my-favorites/my-favorites' });
  },

  goMessages() {
    wx.switchTab({ url: '/pages/messages/messages' });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号？',
      success: (r) => {
        if (r.confirm) {
          app.globalData.userInfo = null;
          app.globalData.openid = null;
          app.globalData.loginReady = false;
          wx.reLaunch({ url: '/pages/index/index' });
        }
      }
    });
  }
});
