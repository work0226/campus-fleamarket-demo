const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { id } = event;
  if (!id) return { code: -1, message: '缺少 id' };

  const wantRes = await db.collection('wants').doc(id).get();
  const want = wantRes.data;
  if (!want) return { code: -1, message: '求购不存在' };
  if (want.userOpenid !== openid) return { code: -403, message: '无权限' };

  await db.collection('wants').doc(id).remove();
  const chats = await db.collection('chats').where({ targetId: id, type: 'want' }).get();
  const chatIds = (chats.data || []).map(c => c._id);
  if (chatIds.length) {
    await db.collection('messages').where({ chatId: db.command.in(chatIds) }).remove();
  }
  await db.collection('chats').where({ targetId: id, type: 'want' }).remove();

  return { code: 0, message: '删除成功' };
};