const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/leancloud-api.js');

const CAMPUSES = ['', '主校区', '东校区', '西校区', '南校区'];
const CONTACT_TYPES = ['微信号', '手机号', 'QQ'];

Page({
  data: {
    user: {},
    campuses: CAMPUSES,
    contactTypes: CONTACT_TYPES,
    nickName: '',
    campusIndex: 0,
    college: '',
    contact: '',
    contactTypeIndex: 0,
    saving: false
  },

  onLoad() {
    app.onLoginReady(() => this.initData());
  },

  onShow() {
    if (app.globalData.loginReady) this.initData();
  },

  initData() {
    const user = app.globalData.userInfo || {};
    const campusIdx = CAMPUSES.indexOf(user.campus || '');
    const contactTypeIdx = Math.max(0, CONTACT_TYPES.indexOf(user.contactType || '微信号'));
    this.setData({
      user,
      nickName: user.nickName || '',
      campusIndex: campusIdx >= 0 ? campusIdx : 0,
      college: user.college || '',
      contact: user.contact || '',
      contactTypeIndex: contactTypeIdx
    });
  },

  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  onCampusChange(e) {
    this.setData({ campusIndex: parseInt(e.detail.value) });
  },

  onCollegeInput(e) {
    this.setData({ college: e.detail.value });
  },

  onContactTypeChange(e) {
    this.setData({ contactTypeIndex: parseInt(e.detail.value) });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  save() {
    if (this.data.saving) return;
    const payload = {
      nickName: this.data.nickName.trim(),
      campus: CAMPUSES[this.data.campusIndex],
      college: this.data.college.trim(),
      contactType: CONTACT_TYPES[this.data.contactTypeIndex],
      contact: this.data.contact.trim()
    };
    this.setData({ saving: true });
    api.updateProfile(payload)
      .then(res => {
        const result = res || {};
        if (result.code !== 0) {
          wx.showToast({ title: result.message || '保存失败', icon: 'none' });
          return;
        }
        wx.showToast({ title: '保存成功', icon: 'success' });
        app.refreshUser().then(() => {
          setTimeout(() => wx.navigateBack(), 800);
        });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
        console.error(err);
      })
      .finally(() => this.setData({ saving: false }));
  },

  formatDate(t) {
    return util.formatDate(t);
  }
});
