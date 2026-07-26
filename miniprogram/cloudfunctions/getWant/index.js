const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { id } = event;
  if (!id) return { code: -1, message: '缺少 id' };

  const res = await db.collection('wants').doc(id).get();
  return { code: 0, data: res.data, openid };
};