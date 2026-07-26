const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: '未登录' };

  const { title, budget, condition, category, note, campus } = event;
  if (!title || budget === undefined || !category) {
    return { code: -1, message: '缺少必填字段' };
  }

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data && userRes.data[0];

  const data = {
    title: title.trim(),
    budget: parseFloat(budget) || 0,
    condition: condition || '不限',
    category,
    note: note || '',
    userOpenid: openid,
    userNickName: user ? user.nickName : '',
    userAvatar: user ? user.avatarUrl : '',
    campus: campus || (user ? user.campus : ''),
    createTime: db.serverDate()
  };

  const addRes = await db.collection('wants').add({ data });
  return { code: 0, id: addRes._id, data };
};