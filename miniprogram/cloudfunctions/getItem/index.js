const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { id } = event;
  if (!id) return { code: -1, message: '缺少 id' };

  const itemRes = await db.collection('items').doc(id).get();
  const item = itemRes.data;

  let credit = { average: 0, count: 0 };
  if (item && item.sellerOpenid) {
    const ratingRes = await db.collection('ratings').where({ sellerOpenid: item.sellerOpenid }).get();
    if (ratingRes.data && ratingRes.data.length) {
      const total = ratingRes.data.reduce((sum, r) => sum + (r.score || 0), 0);
      credit.average = Math.round((total / ratingRes.data.length) * 10) / 10;
      credit.count = ratingRes.data.length;
    }
  }

  return { code: 0, data: item, credit, openid };
};