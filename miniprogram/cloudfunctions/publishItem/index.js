const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: '未登录' };

  const {
    title,
    price,
    category,
    location,
    trade,
    desc,
    images,
    campus
  } = event;

  if (!title || price === undefined || !category) {
    return { code: -1, message: '缺少必填字段' };
  }

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data && userRes.data[0];

  const data = {
    title: title.trim(),
    price: parseFloat(price) || 0,
    category,
    location: location || '',
    trade: trade || [],
    desc: desc || '',
    images: images || [],
    sellerOpenid: openid,
    sellerNickName: user ? user.nickName : '',
    sellerAvatar: user ? user.avatarUrl : '',
    campus: campus || (user ? user.campus : ''),
    status: 'active',
    soldTo: '',
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };

  const addRes = await db.collection('items').add({ data });
  return { code: 0, id: addRes._id, data };
};