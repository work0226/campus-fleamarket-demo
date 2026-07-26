App({
  globalData: {
    openid: null,
    userInfo: null,
    env: 'your-env-id',
    loginReady: false
  },

  onLaunch() {
    wx.cloud.init({
      env: 'your-env-id',
      traceUser: true
    });
    this.login();
  },

  login(callback) {
    wx.cloud.callFunction({ name: 'login' })
      .then(res => {
        const result = res.result || {};
        this.globalData.openid = result.openid;
        this.globalData.userInfo = result.user || null;
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
      wx.cloud.callFunction({ name: 'login' })
        .then(res => {
          const result = res.result || {};
          this.globalData.openid = result.openid;
          this.globalData.userInfo = result.user || null;
          resolve(result.user || null);
        })
        .catch(reject);
    });
  }
});