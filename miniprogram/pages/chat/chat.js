const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/leancloud-api.js');

Page({
  data: {
    chatId: '',
    type: 'item',
    targetId: '',
    title: '',
    peerName: '',
    peerAvatar: '',
    myAvatar: '',
    openid: '',
    messages: [],
    inputText: '',
    loading: false,
    refreshing: false,
    scrollTo: '',
    contactSharedMe: false,
    contactVisible: false,
    contactText: ''
  },

  onLoad(options) {
    const { chatId, type, targetId, peerName, peerAvatar, title } = options;
    const openid = app.globalData.openid;
    const user = app.globalData.userInfo || {};
    this.setData({
      chatId: chatId || '',
      type: type || 'item',
      targetId: targetId || '',
      peerName: decodeURIComponent(peerName || ''),
      peerAvatar: decodeURIComponent(peerAvatar || ''),
      title: decodeURIComponent(title || ''),
      openid,
      myAvatar: user.avatarUrl || ''
    });

    if (this.data.chatId) {
      this.loadMessages();
    } else if (this.data.targetId) {
      this.createChatAndLoad();
    }
  },

  onShow() {
    if (this.data.chatId) {
      this.loadMessages();
    }
  },

  createChatAndLoad() {
    const { type, targetId } = this.data;
    api.createChat(type, targetId)
      .then(res => {
        const chat = res.chat || {};
        this.setData({ chatId: chat._id || res.chatId });
        this.loadMessages(true);
      })
      .catch(err => {
        wx.showToast({ title: err.message || '创建聊天失败', icon: 'none' });
      });
  },

  loadMessages(sendOpening = false) {
    if (!this.data.chatId) return;
    this.setData({ loading: true });
    return api.getMessages(this.data.chatId)
      .then(res => {
        const messages = res.data || [];
        const chat = res.chat || {};
        const shared = chat.contactShared || {};
        this.setData({
          messages,
          loading: false,
          refreshing: false,
          contactSharedMe: !!shared[this.data.openid],
          contactVisible: !!shared[this.data.openid] && !!shared[this.getPeerOpenid(chat)],
          peerAvatar: chat.peerAvatar || this.data.peerAvatar,
          peerName: chat.peerName || this.data.peerName,
          title: chat.title || this.data.title
        });
        this.scrollBottom();
        this.markRead();
        if (sendOpening && messages.length === 0) {
          this.sendOpeningMessage();
        }
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, refreshing: false });
      });
  },

  getPeerOpenid(chat) {
    const c = chat || {};
    return (c.participantOpenids || []).find(id => id !== this.data.openid) || '';
  },

  sendOpeningMessage() {
    const { type, targetId, openid } = this.data;
    let text = '';
    if (type === 'item') {
      api.getItem(targetId).then(res => {
        const item = res.data;
        if (!item) return;
        if (item.sellerOpenid === openid) {
          text = `对方对你的闲置「${item.title}」感兴趣，快来聊聊吧~`;
        } else {
          text = `我想了解这个闲置「${item.title}」`;
        }
        this.doSend(text);
      });
    } else {
      api.getWant(targetId).then(res => {
        const want = res.data;
        if (!want) return;
        if (want.userOpenid === openid) {
          text = `对方想提供你求购的「${want.title}」`;
        } else {
          text = `我有你求购的「${want.title}」`;
        }
        this.doSend(text);
      });
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  sendText() {
    const text = this.data.inputText.trim();
    if (!text) return;
    this.doSend(text);
  },

  doSend(text) {
    if (!this.data.chatId) return;
    api.sendMessage(this.data.chatId, text)
      .then(() => {
        this.setData({ inputText: '' });
        this.loadMessages();
      }).catch(err => {
        wx.showToast({ title: err.message || '发送失败', icon: 'none' });
      });
  },

  markRead() {
    if (!this.data.chatId) return;
    api.markRead(this.data.chatId);
  },

  shareContact() {
    if (!this.data.chatId || this.data.contactSharedMe) return;
    api.shareContact(this.data.chatId)
      .then(res => {
        const result = res || {};
        this.setData({
          contactSharedMe: true,
          contactVisible: result.bothShared,
          contactText: result.contact || ''
        });
        if (result.bothShared) {
          wx.showToast({ title: '联系方式已交换', icon: 'success' });
        } else {
          wx.showToast({ title: '等待对方同意', icon: 'none' });
        }
      })
      .catch(err => {
        wx.showToast({ title: err.message || '交换失败', icon: 'none' });
      });
  },

  goTargetDetail() {
    const { type, targetId } = this.data;
    const url = type === 'item'
      ? '/pages/item-detail/item-detail?id=' + targetId
      : '/pages/want-detail/want-detail?id=' + targetId;
    wx.navigateTo({ url });
  },

  scrollBottom() {
    const idx = this.data.messages.length - 1;
    if (idx >= 0) {
      this.setData({ scrollTo: 'msg-' + idx });
    }
  },

  timeAgo(t) {
    return util.timeAgo(t);
  }
});
