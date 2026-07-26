const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/leancloud-api.js');

Page({
  data: {
    filter: 'all',
    chats: [],
    loading: false,
    refreshing: false,
    error: '',
    openid: ''
  },

  onLoad() {
    app.onLoginReady(() => {
      this.setData({ openid: app.globalData.openid });
      this.loadChats();
    });
  },

  onShow() {
    if (app.globalData.loginReady) {
      this.setData({ openid: app.globalData.openid });
      this.loadChats();
    }
  },

  switchFilter(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ filter: type });
    this.loadChats();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadChats().finally(() => this.setData({ refreshing: false }));
  },

  loadChats() {
    this.setData({ loading: true, error: '' });
    return api.getChats(this.data.filter)
      .then(res => {
        const data = res.data || [];
        data.forEach(c => {
          c.timeStr = util.timeAgo(c.lastTime);
        });
        this.setData({ chats: data, loading: false });
        this.updateBadge(data);
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, error: '加载失败' });
      });
  },

  updateBadge(chats) {
    const openid = this.data.openid;
    const total = chats.reduce((sum, c) => sum + ((c.unreadCount || {})[openid] || 0), 0);
    if (total > 0) {
      wx.setTabBarBadge({ index: 3, text: String(total > 99 ? 99 : total) });
    } else {
      wx.removeTabBarBadge({ index: 3 });
    }
  },

  goChat(e) {
    const item = e.currentTarget.dataset.item;
    const url = `/pages/chat/chat?chatId=${item._id}&type=${item.type}&targetId=${item.targetId}&peerName=${encodeURIComponent(item.peerName || '')}&peerAvatar=${encodeURIComponent(item.peerAvatar || '')}&title=${encodeURIComponent(item.title || '')}`;
    wx.navigateTo({ url });
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});
