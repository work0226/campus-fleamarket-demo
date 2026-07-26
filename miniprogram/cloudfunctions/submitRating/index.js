const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type = 'item', targetId, sellerOpenid, score } = event;

  if (!targetId || !sellerOpenid || !score) {
    return { code: -1, message: '参数错误' };
  }
  if (score < 1 || score > 5) {
    return { code: -1, message: '评分范围 1-5' };
  }
  if (sellerOpenid === openid) {
    return { code: -1, message: '不能给自己评分' };
  }

  const itemRes = await db.collection('items').doc(targetId).get();
  const item = itemRes.data;
  if (!item) return { code: -1, message: '商品不存在' };
  if (item.status !== 'sold') return { code: -1, message: '商品未售出，无法评分' };

  const dupRes = await db.collection('ratings').where({
    type: 'item',
    targetId: targetId,
    buyerOpenid: openid
  }).get();
  if (dupRes.data && dupRes.data.length > 0) {
    return { code: -1, message: '已评分，不能重复评分' };
  }

  const chatRes = await db.collection('chats').where({
    type: 'item',
    targetId: targetId,
    participantOpenids: openid
  }).get();
  if (!chatRes.data || chatRes.data.length === 0) {
    return { code: -1, message: '未与卖家聊过天，无法评分' };
  }

  await db.collection('ratings').add({
    data: {
      type: 'item',
      targetId,
      sellerOpenid,
      buyerOpenid: openid,
      score,
      createTime: db.serverDate()
    }
  });

  return { code: 0, message: '评分成功' };
};