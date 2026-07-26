const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/leancloud-api.js');

Page({
  data: {
    id: '',
    want: null,
    isOwner: false,
    loading: false,
    error: ''
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ id });
    app.onLoginReady(() => this.loadDetail(id));
  },

  loadDetail(id) {
    this.setData({ loading: true, error: '' });
    api.getWant(id)
      .then(res => {
        const want = res.data;
        if (!want) {
          this.setData({ loading: false, error: '求购不存在' });
          return;
        }
        this.setData({
          want,
          isOwner: want.userOpenid === app.globalData.openid,
          loading: false
        });
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, error: '加载失败' });
      });
  },

  contactOwner() {
    const { want, isOwner } = this.data;
    if (isOwner) return;
    api.createChat('want', want._id)
      .then(res => {
        const chat = res.chat || {};
        wx.navigateTo({
          url: `/pages/chat/chat?chatId=${chat._id || res.chatId}&type=want&targetId=${want._id}&peerName=${encodeURIComponent(chat.peerName || want.userNickName || '')}&peerAvatar=${encodeURIComponent(chat.peerAvatar || want.userAvatar || '')}&title=${encodeURIComponent(want.title)}`
        });
      }).catch(err => {
        wx.showToast({ title: err.message || '发起聊天失败', icon: 'none' });
      });
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});
