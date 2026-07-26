const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { id } = event;
  if (!id) return { code: -1, message: '缺少 id' };

  const itemRes = await db.collection('items').doc(id).get();
  const item = itemRes.data;
  if (!item) return { code: -1, message: '商品不存在' };
  if (item.sellerOpenid !== openid) return { code: -403, message: '无权限' };

  await db.collection('items').doc(id).remove();
  const chats = await db.collection('chats').where({ targetId: id, type: 'item' }).get();
  const chatIds = (chats.data || []).map(c => c._id);
  if (chatIds.length) {
    await db.collection('messages').where({ chatId: db.command.in(chatIds) }).remove();
  }
  await db.collection('chats').where({ targetId: id, type: 'item' }).remove();
  await db.collection('ratings').where({ targetId: id, type: 'item' }).remove();

  return { code: 0, message: '删除成功' };
};