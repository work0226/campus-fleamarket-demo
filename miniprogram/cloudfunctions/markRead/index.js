const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { chatId } = event;
  if (!chatId) return { code: -1, message: '缺少 chatId' };

  await db.collection('messages').where({
    chatId: chatId,
    receiverOpenid: openid,
    read: false
  }).update({
    data: { read: true }
  });

  const reset = {};
  reset['unreadCount.' + openid] = 0;
  await db.collection('chats').doc(chatId).update({ data: reset });

  return { code: 0, message: '已读' };
};