const AV = require('leancloud-storage');

const DAY_30 = 30 * 24 * 60 * 60 * 1000;

function getOpenid(currentUser) {
  if (!currentUser) return null;
  const authData = currentUser.get('authData') || {};
  return (authData.lc_weapp && authData.lc_weapp.openid) || currentUser.id;
}

function rejectError(code, message) {
  throw new AV.Cloud.Error(message, { code });
}

// ============================================================
// 信用评分：聚合计算平均分
// ============================================================
AV.Cloud.define('getCreditScore', async request => {
  const { sellerOpenid } = request.params;
  if (!sellerOpenid) rejectError(-1, '缺少 sellerOpenid');

  const query = new AV.Query('Rating');
  query.equalTo('sellerOpenid', sellerOpenid);
  const count = await query.count();
  if (count === 0) {
    return { code: 0, average: 0, count: 0 };
  }
  query.limit(1000);
  const list = await query.find();
  const total = list.reduce((sum, r) => sum + (r.get('score') || 0), 0);
  const average = Math.round((total / list.length) * 10) / 10;
  return { code: 0, average, count: list.length };
});

// ============================================================
// 更新用户资料：含 30 天昵称冷却
// ============================================================
AV.Cloud.define('updateProfile', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);

  const { nickName, avatarUrl, campus, college, contact, contactType } = request.params;
  const UserQuery = new AV.Query('User');
  UserQuery.equalTo('openid', openid);
  const user = await UserQuery.first();
  if (!user) rejectError(-1, '用户不存在');

  const update = {};
  if (nickName !== undefined && nickName !== user.get('nickName')) {
    const now = Date.now();
    const last = user.get('lastNicknameChange') || 0;
    if (now - last < DAY_30) {
      rejectError(-1, '30 天内只能修改一次昵称');
    }
    update.nickName = nickName.trim();
    update.lastNicknameChange = now;
  }
  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
  if (campus !== undefined) update.campus = campus;
  if (college !== undefined) update.college = college;
  if (contact !== undefined) update.contact = contact;
  if (contactType !== undefined) update.contactType = contactType;

  if (Object.keys(update).length === 0) {
    return { code: 0, message: '无变更' };
  }

  Object.keys(update).forEach(k => user.set(k, update[k]));
  await user.save(null, { useMasterKey: true });

  // 同步到该用户发布的闲置与求购
  if (update.nickName || update.avatarUrl) {
    await updateSellerInfo(openid, update);
  }

  return { code: 0, message: '更新成功' };
});

async function updateSellerInfo(openid, update) {
  const itemQuery = new AV.Query('Item');
  itemQuery.equalTo('sellerOpenid', openid);
  itemQuery.limit(1000);
  const items = await itemQuery.find();
  for (const item of items) {
    if (update.nickName) item.set('sellerNickName', update.nickName);
    if (update.avatarUrl) item.set('sellerAvatar', update.avatarUrl);
    await item.save(null, { useMasterKey: true });
  }

  const wantQuery = new AV.Query('Want');
  wantQuery.equalTo('userOpenid', openid);
  wantQuery.limit(1000);
  const wants = await wantQuery.find();
  for (const want of wants) {
    if (update.nickName) want.set('userNickName', update.nickName);
    if (update.avatarUrl) want.set('userAvatar', update.avatarUrl);
    await want.save(null, { useMasterKey: true });
  }
}

// ============================================================
// 删除闲置：权限校验 + 级联删除关联聊天/消息/评分
// ============================================================
AV.Cloud.define('deleteItem', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);
  const { id } = request.params;
  if (!id) rejectError(-1, '缺少 id');

  const item = await new AV.Query('Item').get(id);
  if (!item) rejectError(-1, '商品不存在');
  if (item.get('sellerOpenid') !== openid) rejectError(-403, '无权限');

  await item.destroy({ useMasterKey: true });

  const chatQuery = new AV.Query('Chat');
  chatQuery.equalTo('targetId', id);
  chatQuery.equalTo('type', 'item');
  chatQuery.limit(1000);
  const chats = await chatQuery.find();
  const chatIds = chats.map(c => c.id);

  if (chatIds.length) {
    const msgQuery = new AV.Query('Message');
    msgQuery.containedIn('chatId', chatIds);
    msgQuery.limit(1000);
    const messages = await msgQuery.find();
    if (messages.length) {
      await AV.Object.destroyAll(messages, { useMasterKey: true });
    }
    await AV.Object.destroyAll(chats, { useMasterKey: true });
  }

  const ratingQuery = new AV.Query('Rating');
  ratingQuery.equalTo('targetId', id);
  ratingQuery.equalTo('type', 'item');
  ratingQuery.limit(1000);
  const ratings = await ratingQuery.find();
  if (ratings.length) await AV.Object.destroyAll(ratings, { useMasterKey: true });

  return { code: 0, message: '删除成功' };
});

// ============================================================
// 删除求购：权限校验 + 级联删除关联聊天/消息
// ============================================================
AV.Cloud.define('deleteWant', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);
  const { id } = request.params;
  if (!id) rejectError(-1, '缺少 id');

  const want = await new AV.Query('Want').get(id);
  if (!want) rejectError(-1, '求购不存在');
  if (want.get('userOpenid') !== openid) rejectError(-403, '无权限');

  await want.destroy({ useMasterKey: true });

  const chatQuery = new AV.Query('Chat');
  chatQuery.equalTo('targetId', id);
  chatQuery.equalTo('type', 'want');
  chatQuery.limit(1000);
  const chats = await chatQuery.find();
  const chatIds = chats.map(c => c.id);

  if (chatIds.length) {
    const msgQuery = new AV.Query('Message');
    msgQuery.containedIn('chatId', chatIds);
    msgQuery.limit(1000);
    const messages = await msgQuery.find();
    if (messages.length) await AV.Object.destroyAll(messages, { useMasterKey: true });
    await AV.Object.destroyAll(chats, { useMasterKey: true });
  }

  return { code: 0, message: '删除成功' };
});

// ============================================================
// 创建/获取聊天
// ============================================================
AV.Cloud.define('createChat', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);
  const { type, targetId } = request.params;
  if (!type || !targetId) rejectError(-1, '参数错误');
  if (!['item', 'want'].includes(type)) rejectError(-1, '类型错误');

  let target;
  let peerOpenid = '';
  let title = '';
  let peerName = '';
  let peerAvatar = '';

  if (type === 'item') {
    target = await new AV.Query('Item').get(targetId);
    if (!target) rejectError(-1, '商品不存在');
    peerOpenid = target.get('sellerOpenid');
    title = target.get('title');
    peerName = target.get('sellerNickName') || '';
    peerAvatar = target.get('sellerAvatar') || '';
  } else {
    target = await new AV.Query('Want').get(targetId);
    if (!target) rejectError(-1, '求购不存在');
    peerOpenid = target.get('userOpenid');
    title = target.get('title');
    peerName = target.get('userNickName') || '';
    peerAvatar = target.get('userAvatar') || '';
  }

  if (peerOpenid === openid) rejectError(-1, '不能与自己聊天');

  const existingQuery = new AV.Query('Chat');
  existingQuery.equalTo('type', type);
  existingQuery.equalTo('targetId', targetId);
  existingQuery.equalTo('participantOpenids', openid);
  existingQuery.equalTo('participantOpenids', peerOpenid);
  const existing = await existingQuery.first();
  if (existing) {
    return {
      code: 0,
      chatId: existing.id,
      chat: chatToJSON(existing),
      target: target.toJSON(),
      isNew: false
    };
  }

  const unreadCount = {};
  unreadCount[openid] = 0;
  unreadCount[peerOpenid] = 0;
  const contactShared = {};
  contactShared[openid] = false;
  contactShared[peerOpenid] = false;

  const chat = new AV.Object('Chat');
  chat.set('type', type);
  chat.set('targetId', targetId);
  chat.set('participantOpenids', [openid, peerOpenid]);
  chat.set('peerName', peerName);
  chat.set('peerAvatar', peerAvatar);
  chat.set('title', title);
  chat.set('lastMsg', '');
  chat.set('lastTime', new Date());
  chat.set('unreadCount', unreadCount);
  chat.set('contactShared', contactShared);
  chat.set('createTime', new Date());
  chat.setACL(publicRWAcl());
  await chat.save(null, { useMasterKey: true });

  return {
    code: 0,
    chatId: chat.id,
    chat: chatToJSON(chat),
    target: target.toJSON(),
    isNew: true
  };
});

function chatToJSON(chat) {
  const json = chat.toJSON();
  json._id = chat.id;
  return json;
}

function publicRWAcl() {
  const acl = new AV.ACL();
  acl.setPublicReadAccess(true);
  acl.setPublicWriteAccess(true);
  return acl;
}

// ============================================================
// 发送消息
// ============================================================
AV.Cloud.define('sendMessage', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);
  const { chatId, text, type = 'text' } = request.params;
  if (!chatId || !text || !text.trim()) rejectError(-1, '参数错误');

  const chat = await new AV.Query('Chat').get(chatId);
  if (!chat) rejectError(-1, '聊天不存在');
  const participants = chat.get('participantOpenids') || [];
  if (!participants.includes(openid)) rejectError(-403, '无权限');

  const receiverOpenid = participants.find(id => id !== openid);

  const message = new AV.Object('Message');
  message.set('chatId', chatId);
  message.set('senderOpenid', openid);
  message.set('receiverOpenid', receiverOpenid);
  message.set('text', text.trim());
  message.set('type', type);
  message.set('read', false);
  message.set('createTime', new Date());
  message.setACL(publicRWAcl());
  await message.save(null, { useMasterKey: true });

  chat.set('lastMsg', text.trim());
  chat.set('lastTime', new Date());
  const unreadCount = chat.get('unreadCount') || {};
  unreadCount[receiverOpenid] = (unreadCount[receiverOpenid] || 0) + 1;
  chat.set('unreadCount', unreadCount);
  await chat.save(null, { useMasterKey: true });

  return { code: 0, id: message.id, message: message.toJSON() };
});

// ============================================================
// 标记已读
// ============================================================
AV.Cloud.define('markRead', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);
  const { chatId } = request.params;
  if (!chatId) rejectError(-1, '缺少 chatId');

  const msgQuery = new AV.Query('Message');
  msgQuery.equalTo('chatId', chatId);
  msgQuery.equalTo('receiverOpenid', openid);
  msgQuery.equalTo('read', false);
  msgQuery.limit(500);
  const messages = await msgQuery.find();
  messages.forEach(m => m.set('read', true));
  if (messages.length) {
    await AV.Object.saveAll(messages, { useMasterKey: true });
  }

  const chat = await new AV.Query('Chat').get(chatId);
  const unreadCount = chat.get('unreadCount') || {};
  unreadCount[openid] = 0;
  chat.set('unreadCount', unreadCount);
  await chat.save(null, { useMasterKey: true });

  return { code: 0, message: '已读' };
});

// ============================================================
// 交换联系方式
// ============================================================
AV.Cloud.define('shareContact', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);
  const { chatId } = request.params;
  if (!chatId) rejectError(-1, '缺少 chatId');

  const chat = await new AV.Query('Chat').get(chatId);
  if (!chat) rejectError(-1, '聊天不存在');
  const participants = chat.get('participantOpenids') || [];
  if (!participants.includes(openid)) rejectError(-403, '无权限');

  const shared = chat.get('contactShared') || {};
  shared[openid] = true;
  chat.set('contactShared', shared);
  await chat.save(null, { useMasterKey: true });

  const peerOpenid = participants.find(id => id !== openid);
  const UserQuery = new AV.Query('User');
  UserQuery.equalTo('openid', peerOpenid);
  const peer = await UserQuery.first({ useMasterKey: true });

  const bothShared = shared[openid] && shared[peerOpenid];
  return {
    code: 0,
    bothShared,
    contact: bothShared && peer ? peer.get('contact') || '' : '',
    contactType: bothShared && peer ? peer.get('contactType') || '' : ''
  };
});

// ============================================================
// 提交评分：权限校验
// ============================================================
AV.Cloud.define('submitRating', async request => {
  const currentUser = request.currentUser;
  if (!currentUser) rejectError(-1, '未登录');
  const openid = getOpenid(currentUser);
  const { type = 'item', targetId, sellerOpenid, score } = request.params;

  if (!targetId || !sellerOpenid || !score) rejectError(-1, '参数错误');
  if (score < 1 || score > 5) rejectError(-1, '评分范围 1-5');
  if (sellerOpenid === openid) rejectError(-1, '不能给自己评分');

  const item = await new AV.Query('Item').get(targetId);
  if (!item) rejectError(-1, '商品不存在');
  if (item.get('status') !== 'sold') rejectError(-1, '商品未售出，无法评分');

  const dupQuery = new AV.Query('Rating');
  dupQuery.equalTo('type', 'item');
  dupQuery.equalTo('targetId', targetId);
  dupQuery.equalTo('buyerOpenid', openid);
  const dup = await dupQuery.first();
  if (dup) rejectError(-1, '已评分，不能重复评分');

  const chatQuery = new AV.Query('Chat');
  chatQuery.equalTo('type', 'item');
  chatQuery.equalTo('targetId', targetId);
  chatQuery.equalTo('participantOpenids', openid);
  const chat = await chatQuery.first();
  if (!chat) rejectError(-1, '未与卖家聊过天，无法评分');

  const rating = new AV.Object('Rating');
  rating.set('type', 'item');
  rating.set('targetId', targetId);
  rating.set('sellerOpenid', sellerOpenid);
  rating.set('buyerOpenid', openid);
  rating.set('score', score);
  rating.set('createTime', new Date());
  rating.setACL(publicRWAcl());
  await rating.save(null, { useMasterKey: true });

  return { code: 0, message: '评分成功' };
});
