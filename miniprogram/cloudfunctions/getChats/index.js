const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type } = event;

  let query = db.collection('chats').where({
    participantOpenids: openid
  });

  if (type && type !== 'all') {
    query = query.where({ type: type });
  }

  query = query.orderBy('lastTime', 'desc');
  const res = await query.get();

  return { code: 0, data: res.data || [], openid };
};