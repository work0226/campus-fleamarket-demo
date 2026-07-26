const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { chatId, text, type = 'text' } = event;
  if (!chatId || !text || !text.trim()) {
    return { code: -1, message: '参数错误' };
  }

  const chatRes = await db.collection('chats').doc(chatId).get();
  const chat = chatRes.data;
  if (!chat) return { code: -1, message: '聊天不存在' };
  if (!chat.participantOpenids.includes(openid)) return { code: -403, message: '无权限' };

  const receiverOpenid = chat.participantOpenids.find(id => id !== openid);

  const msgData = {
    chatId,
    senderOpenid: openid,
    receiverOpenid,
    text: text.trim(),
    type,
    read: false,
    createTime: db.serverDate()
  };

  const addRes = await db.collection('messages').add({ data: msgData });

  const unreadInc = {};
  unreadInc['unreadCount.' + receiverOpenid] = _.inc(1);

  await db.collection('chats').doc(chatId).update({
    data: {
      lastMsg: text.trim(),
      lastTime: db.serverDate(),
      ...unreadInc
    }
  });

  return { code: 0, id: addRes._id, message: msgData };
};