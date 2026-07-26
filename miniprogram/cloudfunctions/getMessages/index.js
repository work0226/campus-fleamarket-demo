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

  const msgRes = await db.collection('messages')
    .where({ chatId: chatId })
    .orderBy('createTime', 'asc')
    .limit(500)
    .get();

  return { code: 0, data: msgRes.data || [], chat, openid };
};