const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { chatId } = event;
  if (!chatId) return { code: -1, message: '缺少 chatId' };

  const chatRes = await db.collection('chats').doc(chatId).get();
  const chat = chatRes.data;
  if (!chat) return { code: -1, message: '聊天不存在' };
  if (!chat.participantOpenids.includes(openid)) return { code: -403, message: '无权限' };

  const setShared = {};
  setShared['contactShared.' + openid] = true;
  await db.collection('chats').doc(chatId).update({ data: setShared });

  const peerOpenid = chat.participantOpenids.find(id => id !== openid);
  const peerRes = await db.collection('users').where({ _openid: peerOpenid }).get();
  const peer = peerRes.data && peerRes.data[0];

  const updated = await db.collection('chats').doc(chatId).get();
  const shared = updated.data.contactShared || {};
  const bothShared = shared[openid] && shared[peerOpenid];

  return {
    code: 0,
    bothShared,
    contact: bothShared && peer ? peer.contact || '' : '',
    contactType: bothShared && peer ? (peer.contactType || '') : ''
  };
};