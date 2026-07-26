const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type, targetId } = event;
  if (!type || !targetId) return { code: -1, message: '参数错误' };
  if (!['item', 'want'].includes(type)) return { code: -1, message: '类型错误' };

  let target;
  let peerOpenid = '';
  let title = '';
  let peerName = '';
  let peerAvatar = '';

  if (type === 'item') {
    const itemRes = await db.collection('items').doc(targetId).get();
    target = itemRes.data;
    if (!target) return { code: -1, message: '商品不存在' };
    peerOpenid = target.sellerOpenid;
    title = target.title;
    peerName = target.sellerNickName || '';
    peerAvatar = target.sellerAvatar || '';
  } else {
    const wantRes = await db.collection('wants').doc(targetId).get();
    target = wantRes.data;
    if (!target) return { code: -1, message: '求购不存在' };
    peerOpenid = target.userOpenid;
    title = target.title;
    peerName = target.userNickName || '';
    peerAvatar = target.userAvatar || '';
  }

  if (peerOpenid === openid) {
    return { code: -1, message: '不能与自己聊天' };
  }

  const existing = await db.collection('chats').where({
    type: type,
    targetId: targetId,
    participantOpenids: _.all([openid, peerOpenid])
  }).get();

  if (existing.data && existing.data.length > 0) {
    return { code: 0, chatId: existing.data[0]._id, chat: existing.data[0], target, isNew: false };
  }

  const unreadCount = {};
  unreadCount[openid] = 0;
  unreadCount[peerOpenid] = 0;
  const contactShared = {};
  contactShared[openid] = false;
  contactShared[peerOpenid] = false;

  const data = {
    type,
    targetId,
    participantOpenids: [openid, peerOpenid],
    peerName,
    peerAvatar,
    title,
    lastMsg: '',
    lastTime: db.serverDate(),
    unreadCount,
    contactShared,
    createTime: db.serverDate()
  };

  const addRes = await db.collection('chats').add({ data });
  data._id = addRes._id;
  return { code: 0, chatId: addRes._id, chat: data, target, isNew: true };
};