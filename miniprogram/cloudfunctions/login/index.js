const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) {
    return { code: -1, message: '未获取到 OPENID' };
  }

  let userRes = await db.collection('users').where({ _openid: openid }).get();
  let user;

  if (!userRes.data || userRes.data.length === 0) {
    const now = new Date().getTime();
    const newUser = {
      _openid: openid,
      nickName: '校园用户' + openid.slice(-6),
      avatarUrl: '',
      campus: '',
      college: '',
      contact: '',
      contactVisible: false,
      lastNicknameChange: 0,
      createdAt: db.serverDate()
    };
    await db.collection('users').add({ data: newUser });
    userRes = await db.collection('users').where({ _openid: openid }).get();
    user = userRes.data[0];
  } else {
    user = userRes.data[0];
  }

  return { openid, user };
};