const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { sellerOpenid, targetId } = event;
  let query = db.collection('ratings');
  if (sellerOpenid) query = query.where({ sellerOpenid });
  if (targetId) query = query.where({ targetId });

  query = query.orderBy('createTime', 'desc').limit(200);
  const res = await query.get();
  return { code: 0, data: res.data || [] };
};