const AV = require('./libs/av-core-min.js');
const adapters = require('./libs/leancloud-adapters-weapp.js');
AV.setAdapters(adapters);

// ===== 请在这里填写你的 LeanCloud 应用凭证 =====
const LC_APP_ID = 'YOUR_APP_ID';
const LC_APP_KEY = 'YOUR_APP_KEY';
const LC_SERVER_URL = 'YOUR_SERVER_URL'; // 例如 https://xxx.api.lncld.net

AV.init({
  appId: LC_APP_ID,
  appKey: LC_APP_KEY,
  serverURL: LC_SERVER_URL
});

const User = AV.Object.extend('User');

function leanUserToPlain(leanUser) {
  if (!leanUser) return null;
  const json = leanUser.toJSON ? leanUser.toJSON() : leanUser;
  return {
    _id: leanUser.id || json.objectId,
    openid: json.openid || '',
    nickName: json.nickName || '',
    avatarUrl: json.avatarUrl || '',
    campus: json.campus || '',
    college: json.college || '',
    contact: json.contact || '',
    contactType: json.contactType || '',
    contactVisible: json.contactVisible || false,
    lastNicknameChange: json.lastNicknameChange || 0,
    createdAt: json.createdAt
  };
}

App({
  globalData: {
    openid: null,
    userInfo: null,
    loginReady: false
  },

  onLaunch() {
    this.login();
  },

  login(callback) {
    AV.User.loginWithMiniApp()
      .then(lcUser => {
        const authData = lcUser.get('authData') || {};
        const weapp = authData.lc_weapp || {};
        const openid = weapp.openid || lcUser.id;
        this.globalData.openid = openid;
        return this._ensureUserProfile(openid, lcUser);
      })
      .then(profile => {
        this.globalData.userInfo = leanUserToPlain(profile);
        this.globalData.loginReady = true;
        if (typeof callback === 'function') {
          callback(this.globalData.userInfo, this.globalData.openid);
        }
        if (this.loginCallbacks && this.loginCallbacks.length) {
          this.loginCallbacks.forEach(cb => cb(this.globalData.userInfo, this.globalData.openid));
          this.loginCallbacks = [];
        }
      })
      .catch(err => {
        console.error('登录失败', err);
      });
  },

  _ensureUserProfile(openid, lcUser) {
    return new Promise((resolve, reject) => {
      const query = new AV.Query('User');
      query.equalTo('openid', openid);
      query.first().then(profile => {
        if (profile) {
          // 关联内置账号（如果之前未设置）
          if (!profile.get('user')) {
            profile.set('user', lcUser);
            return profile.save().then(() => profile);
          }
          return profile;
        }
        const now = Date.now();
        const newUser = new User();
        newUser.set('openid', openid);
        newUser.set('user', lcUser);
        newUser.set('nickName', '校园用户' + String(openid).slice(-6));
        newUser.set('avatarUrl', '');
        newUser.set('campus', '');
        newUser.set('college', '');
        newUser.set('contact', '');
        newUser.set('contactType', '');
        newUser.set('contactVisible', false);
        newUser.set('lastNicknameChange', 0);
        return newUser.save();
      }).then(resolve).catch(reject);
    });
  },

  onLoginReady(callback) {
    if (this.globalData.loginReady) {
      callback(this.globalData.userInfo, this.globalData.openid);
      return;
    }
    if (!this.loginCallbacks) {
      this.loginCallbacks = [];
    }
    this.loginCallbacks.push(callback);
  },

  refreshUser() {
    return new Promise((resolve, reject) => {
      const openid = this.globalData.openid;
      if (!openid) {
        reject(new Error('未登录'));
        return;
      }
      const query = new AV.Query('User');
      query.equalTo('openid', openid);
      query.first()
        .then(profile => {
          if (profile) {
            this.globalData.userInfo = leanUserToPlain(profile);
            resolve(this.globalData.userInfo);
          } else {
            resolve(null);
          }
        })
        .catch(reject);
    });
  }
});
