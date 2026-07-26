const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { id, status, soldTo } = event;
  if (!id || !status) return { code: -1, message: '参数错误' };
  if (!['active', 'offline', 'sold'].includes(status)) return { code: -1, message: '状态非法' };

  const itemRes = await db.collection('items').doc(id).get();
  const item = itemRes.data;
  if (!item) return { code: -1, message: '商品不存在' };
  if (item.sellerOpenid !== openid) return { code: -403, message: '无权限' };

  const update = { status, updateTime: db.serverDate() };
  if (status === 'sold' && soldTo) update.soldTo = soldTo;

  await db.collection('items').doc(id).update({ data: update });
  return { code: 0, message: '状态更新成功' };
};