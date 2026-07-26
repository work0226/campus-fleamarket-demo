const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { id, data } = event;
  if (!id || !data) return { code: -1, message: '参数错误' };

  const itemRes = await db.collection('items').doc(id).get();
  const item = itemRes.data;
  if (!item) return { code: -1, message: '商品不存在' };
  if (item.sellerOpenid !== openid) return { code: -403, message: '无权限' };

  const allowed = ['title', 'price', 'category', 'location', 'trade', 'desc', 'images', 'campus'];
  const update = { updateTime: db.serverDate() };
  allowed.forEach(key => {
    if (data[key] !== undefined) update[key] = data[key];
  });

  await db.collection('items').doc(id).update({ data: update });
  return { code: 0, message: '更新成功' };
};