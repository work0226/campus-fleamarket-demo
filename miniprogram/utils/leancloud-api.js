// ============================================================
// LeanCloud API 封装层
// 所有原微信云函数功能统一在此封装，页面 JS 不再直接调用 wx.cloud.callFunction
// ============================================================

const AV = require('../libs/av-core-min.js');
const app = getApp();

function getOpenid() {
  return (app && app.globalData && app.globalData.openid) || '';
}

function getCurrentUser() {
  return AV.User.current();
}

function toTimestamp(value) {
  if (value === undefined || value === null) return value;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && value.__type === 'Date' && value.iso) {
    return new Date(value.iso).getTime();
  }
  if (typeof value === 'string') return new Date(value).getTime();
  return value;
}

function leanToPlain(obj) {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.map(leanToPlain);
  if (obj.toJSON) {
    const json = obj.toJSON();
    json._id = obj.id;
    json.objectId = obj.id;
    // 将 LeanCloud 日期字段转为时间戳，兼容原 timeAgo 逻辑
    ['createTime', 'updateTime', 'lastTime', 'createdAt', 'updatedAt'].forEach(k => {
      if (json[k] !== undefined) json[k] = toTimestamp(json[k]);
    });
    return json;
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const k in obj) {
      if (obj.hasOwnProperty(k)) {
        result[k] = ['createTime', 'updateTime', 'lastTime', 'createdAt', 'updatedAt'].includes(k)
          ? toTimestamp(obj[k])
          : obj[k];
      }
    }
    return result;
  }
  return obj;
}

function currentUserAcl() {
  const acl = new AV.ACL();
  acl.setPublicReadAccess(true);
  const u = getCurrentUser();
  if (u) acl.setWriteAccess(u, true);
  return acl;
}

// 通用错误处理：统一抛出 { code, message }
function rejectError(err) {
  let message = err && err.message ? err.message : '请求失败';
  let code = -1;
  if (err && err.code !== undefined) {
    code = err.code;
    message = err.rawMessage || err.message || message;
  }
  return Promise.reject({ code, message });
}

// ============================================================
// 图片上传
// ============================================================
function uploadImage(filePath) {
  const ext = filePath.match(/\.\w+$/) ? filePath.match(/\.\w+$/)[0] : '.jpg';
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  const file = new AV.File(filename, { blob: { uri: filePath } });
  return file.save()
    .then(saved => ({
      code: 0,
      fileID: saved.id,
      url: saved.url(),
      tempURL: saved.url()
    }))
    .catch(rejectError);
}

// ============================================================
// 用户相关
// ============================================================
function login() {
  // app.js 已负责登录，此处仅返回当前全局用户信息
  return Promise.resolve({
    openid: getOpenid(),
    user: app.globalData.userInfo
  });
}

function updateProfile(data) {
  // 昵称冷却等规则在 LeanCloud 云函数中处理
  return AV.Cloud.run('updateProfile', data)
    .catch(rejectError);
}

function getCreditScore(sellerOpenid) {
  return AV.Cloud.run('getCreditScore', { sellerOpenid })
    .catch(rejectError);
}

// ============================================================
// 闲置商品（Item）
// ============================================================
function getItems(params = {}) {
  const {
    category,
    campus,
    minPrice,
    maxPrice,
    sort,
    keyword,
    sellerOpenid,
    status,
    page = 1,
    pageSize = 50
  } = params;

  const query = new AV.Query('Item');

  if (status) {
    query.equalTo('status', status);
  } else {
    query.equalTo('status', 'active');
  }

  if (category && category !== '全部') {
    query.equalTo('category', category);
  }

  if (campus && campus !== '全部') {
    query.equalTo('campus', campus);
  }

  if (sellerOpenid) {
    query.equalTo('sellerOpenid', sellerOpenid);
  }

  if (minPrice > 0) {
    query.greaterThanOrEqualTo('price', minPrice);
  }
  if (maxPrice > 0) {
    query.lessThanOrEqualTo('price', maxPrice);
  }

  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    query.matches('title', kw);
  }

  const orderField = (sort && sort.field) || 'createTime';
  const orderDir = (sort && sort.order) || 'desc';
  if (orderDir === 'asc') {
    query.addAscending(orderField);
  } else {
    query.addDescending(orderField);
  }

  query.limit(pageSize);
  query.skip((page - 1) * pageSize);

  return Promise.all([query.count(), query.find()])
    .then(([total, list]) => ({
      code: 0,
      data: leanToPlain(list),
      total,
      openid: getOpenid()
    }))
    .catch(rejectError);
}

function getItem(id) {
  if (!id) return Promise.reject({ code: -1, message: '缺少 id' });
  const query = new AV.Query('Item');
  return query.get(id)
    .then(item => {
      const sellerOpenid = item.get('sellerOpenid');
      return getCreditScore(sellerOpenid).then(credit => ({
        code: 0,
        data: leanToPlain(item),
        credit: credit || { average: 0, count: 0 },
        openid: getOpenid()
      }));
    })
    .catch(rejectError);
}

function publishItem(data) {
  const user = app.globalData.userInfo || {};
  const item = new AV.Object('Item');
  item.set('title', (data.title || '').trim());
  item.set('price', parseFloat(data.price) || 0);
  item.set('category', data.category || '');
  item.set('location', data.location || '');
  item.set('trade', data.trade || []);
  item.set('desc', data.desc || '');
  item.set('images', data.images || []);
  item.set('sellerOpenid', getOpenid());
  item.set('sellerNickName', user.nickName || '');
  item.set('sellerAvatar', user.avatarUrl || '');
  item.set('campus', data.campus || user.campus || '');
  item.set('status', 'active');
  item.set('soldTo', '');
  item.set('createTime', new Date());
  item.set('updateTime', new Date());
  item.setACL(currentUserAcl());
  return item.save()
    .then(saved => ({ code: 0, id: saved.id, data: leanToPlain(saved) }))
    .catch(rejectError);
}

function updateItem(id, data) {
  if (!id || !data) return Promise.reject({ code: -1, message: '参数错误' });
  const query = new AV.Query('Item');
  return query.get(id)
    .then(item => {
      if (item.get('sellerOpenid') !== getOpenid()) {
        return Promise.reject({ code: -403, message: '无权限' });
      }
      const allowed = ['title', 'price', 'category', 'location', 'trade', 'desc', 'images', 'campus'];
      allowed.forEach(key => {
        if (data[key] !== undefined) item.set(key, data[key]);
      });
      item.set('updateTime', new Date());
      return item.save();
    })
    .then(() => ({ code: 0, message: '更新成功' }))
    .catch(rejectError);
}

function updateItemStatus(id, status, soldTo) {
  if (!id || !status) return Promise.reject({ code: -1, message: '参数错误' });
  if (!['active', 'offline', 'sold'].includes(status)) {
    return Promise.reject({ code: -1, message: '状态非法' });
  }
  const query = new AV.Query('Item');
  return query.get(id)
    .then(item => {
      if (item.get('sellerOpenid') !== getOpenid()) {
        return Promise.reject({ code: -403, message: '无权限' });
      }
      item.set('status', status);
      item.set('updateTime', new Date());
      if (status === 'sold' && soldTo) item.set('soldTo', soldTo);
      return item.save();
    })
    .then(() => ({ code: 0, message: '状态更新成功' }))
    .catch(rejectError);
}

function deleteItem(id) {
  if (!id) return Promise.reject({ code: -1, message: '缺少 id' });
  return AV.Cloud.run('deleteItem', { id }).catch(rejectError);
}

// ============================================================
// 求购（Want）
// ============================================================
function getWants(params = {}) {
  const {
    category,
    campus,
    minBudget,
    maxBudget,
    keyword,
    userOpenid,
    page = 1,
    pageSize = 50
  } = params;

  const query = new AV.Query('Want');

  if (category && category !== '全部') {
    query.equalTo('category', category);
  }
  if (campus && campus !== '全部') {
    query.equalTo('campus', campus);
  }
  if (userOpenid) {
    query.equalTo('userOpenid', userOpenid);
  }
  if (minBudget > 0) {
    query.greaterThanOrEqualTo('budget', minBudget);
  }
  if (maxBudget > 0) {
    query.lessThanOrEqualTo('budget', maxBudget);
  }

  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    query.matches('title', kw);
  }

  query.addDescending('createTime');
  query.limit(pageSize);
  query.skip((page - 1) * pageSize);

  return Promise.all([query.count(), query.find()])
    .then(([total, list]) => ({
      code: 0,
      data: leanToPlain(list),
      total,
      openid: getOpenid()
    }))
    .catch(rejectError);
}

function getWant(id) {
  if (!id) return Promise.reject({ code: -1, message: '缺少 id' });
  const query = new AV.Query('Want');
  return query.get(id)
    .then(want => ({
      code: 0,
      data: leanToPlain(want),
      openid: getOpenid()
    }))
    .catch(rejectError);
}

function publishWant(data) {
  const user = app.globalData.userInfo || {};
  const want = new AV.Object('Want');
  want.set('title', (data.title || '').trim());
  want.set('budget', parseFloat(data.budget) || 0);
  want.set('condition', data.condition || '不限');
  want.set('category', data.category || '');
  want.set('note', data.note || '');
  want.set('userOpenid', getOpenid());
  want.set('userNickName', user.nickName || '');
  want.set('userAvatar', user.avatarUrl || '');
  want.set('campus', data.campus || user.campus || '');
  want.set('createTime', new Date());
  want.setACL(currentUserAcl());
  return want.save()
    .then(saved => ({ code: 0, id: saved.id, data: leanToPlain(saved) }))
    .catch(rejectError);
}

function updateWant(id, data) {
  if (!id || !data) return Promise.reject({ code: -1, message: '参数错误' });
  const query = new AV.Query('Want');
  return query.get(id)
    .then(want => {
      if (want.get('userOpenid') !== getOpenid()) {
        return Promise.reject({ code: -403, message: '无权限' });
      }
      if (data.title !== undefined) want.set('title', data.title);
      if (data.budget !== undefined) want.set('budget', data.budget);
      want.set('updateTime', new Date());
      return want.save();
    })
    .then(() => ({ code: 0, message: '更新成功' }))
    .catch(rejectError);
}

function deleteWant(id) {
  if (!id) return Promise.reject({ code: -1, message: '缺少 id' });
  return AV.Cloud.run('deleteWant', { id }).catch(rejectError);
}

// ============================================================
// 聊天（Chat）与消息（Message）
// ============================================================
function createChat(type, targetId) {
  if (!type || !targetId) return Promise.reject({ code: -1, message: '参数错误' });
  return AV.Cloud.run('createChat', { type, targetId }).catch(rejectError);
}

function getChats(type) {
  const openid = getOpenid();
  const query = new AV.Query('Chat');
  query.equalTo('participantOpenids', openid);
  if (type && type !== 'all') {
    query.equalTo('type', type);
  }
  query.addDescending('lastTime');
  return query.find()
    .then(list => ({
      code: 0,
      data: leanToPlain(list),
      openid
    }))
    .catch(rejectError);
}

function getMessages(chatId) {
  if (!chatId) return Promise.reject({ code: -1, message: '缺少 chatId' });
  const openid = getOpenid();
  const chatQuery = new AV.Query('Chat');
  const msgQuery = new AV.Query('Message');
  msgQuery.equalTo('chatId', chatId);
  msgQuery.addAscending('createTime');
  msgQuery.limit(500);

  return Promise.all([chatQuery.get(chatId), msgQuery.find()])
    .then(([chat, messages]) => {
      if (!chat.get('participantOpenids').includes(openid)) {
        return Promise.reject({ code: -403, message: '无权限' });
      }
      return {
        code: 0,
        data: leanToPlain(messages),
        chat: leanToPlain(chat),
        openid
      };
    })
    .catch(rejectError);
}

function sendMessage(chatId, text, type = 'text') {
  if (!chatId || !text || !text.trim()) {
    return Promise.reject({ code: -1, message: '参数错误' });
  }
  return AV.Cloud.run('sendMessage', { chatId, text: text.trim(), type })
    .catch(rejectError);
}

function markRead(chatId) {
  if (!chatId) return Promise.reject({ code: -1, message: '缺少 chatId' });
  return AV.Cloud.run('markRead', { chatId }).catch(rejectError);
}

function shareContact(chatId) {
  if (!chatId) return Promise.reject({ code: -1, message: '缺少 chatId' });
  return AV.Cloud.run('shareContact', { chatId }).catch(rejectError);
}

// ============================================================
// 评分（Rating）
// ============================================================
function getRatings(params = {}) {
  const { sellerOpenid, targetId } = params;
  const query = new AV.Query('Rating');
  if (sellerOpenid) query.equalTo('sellerOpenid', sellerOpenid);
  if (targetId) query.equalTo('targetId', targetId);
  query.addDescending('createTime');
  query.limit(200);
  return query.find()
    .then(list => ({ code: 0, data: leanToPlain(list) }))
    .catch(rejectError);
}

function submitRating(data) {
  return AV.Cloud.run('submitRating', data).catch(rejectError);
}

// ============================================================
// 收藏（Favorite）
// ============================================================
function getFavorites() {
  const openid = getOpenid();
  const query = new AV.Query('Favorite');
  query.equalTo('userOpenid', openid);
  query.addDescending('createTime');
  return query.find()
    .then(list => ({ code: 0, data: leanToPlain(list) }))
    .catch(rejectError);
}

function addFavorite(targetId, type) {
  const openid = getOpenid();
  const fav = new AV.Object('Favorite');
  fav.set('userOpenid', openid);
  fav.set('targetId', targetId);
  fav.set('type', type);
  fav.set('createTime', new Date());
  fav.setACL(currentUserAcl());
  return fav.save()
    .then(saved => ({ code: 0, id: saved.id, data: leanToPlain(saved) }))
    .catch(rejectError);
}

function removeFavorite(favId) {
  const fav = AV.Object.createWithoutData('Favorite', favId);
  return fav.destroy()
    .then(() => ({ code: 0, message: '取消收藏' }))
    .catch(rejectError);
}

// 兼容原页面用 targetId 取消收藏的场景
function removeFavoriteByTarget(targetId, type) {
  const openid = getOpenid();
  const query = new AV.Query('Favorite');
  query.equalTo('userOpenid', openid);
  query.equalTo('targetId', targetId);
  if (type) query.equalTo('type', type);
  return query.first()
    .then(fav => {
      if (!fav) return { code: 0, message: '已取消' };
      return fav.destroy().then(() => ({ code: 0, message: '取消收藏' }));
    })
    .catch(rejectError);
}

module.exports = {
  AV,
  getOpenid,
  leanToPlain,

  // 用户
  login,
  updateProfile,
  getCreditScore,

  // 图片
  uploadImage,

  // 闲置
  getItems,
  getItem,
  publishItem,
  updateItem,
  updateItemStatus,
  deleteItem,

  // 求购
  getWants,
  getWant,
  publishWant,
  updateWant,
  deleteWant,

  // 聊天/消息
  createChat,
  getChats,
  getMessages,
  sendMessage,
  markRead,
  shareContact,

  // 评分
  getRatings,
  submitRating,

  // 收藏
  getFavorites,
  addFavorite,
  removeFavorite,
  removeFavoriteByTarget
};
