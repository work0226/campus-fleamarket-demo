const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DAY_30 = 30 * 24 * 60 * 60 * 1000;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: '未登录' };

  const { nickName, avatarUrl, campus, college, contact, contactType } = event;
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  if (!userRes.data || userRes.data.length === 0) return { code: -1, message: '用户不存在' };

  const user = userRes.data[0];
  const update = {};

  if (nickName !== undefined && nickName !== user.nickName) {
    const now = Date.now();
    const last = user.lastNicknameChange || 0;
    if (now - last < DAY_30) {
      return { code: -1, message: '30 天内只能修改一次昵称' };
    }
    update.nickName = nickName.trim();
    update.lastNicknameChange = now;
  }

  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
  if (campus !== undefined) update.campus = campus;
  if (college !== undefined) update.college = college;
  if (contact !== undefined) update.contact = contact;
  if (contactType !== undefined) update.contactType = contactType;

  if (Object.keys(update).length === 0) {
    return { code: 0, message: '无变更' };
  }

  await db.collection('users').doc(user._id).update({ data: update });

  if (update.nickName || update.avatarUrl) {
    await updateSellerInfo(openid, update);
  }

  return { code: 0, message: '更新成功' };
};

async function updateSellerInfo(openid, update) {
  const db2 = cloud.database();
  const items = await db2.collection('items').where({ sellerOpenid: openid }).get();
  for (const item of items.data || []) {
    const up = {};
    if (update.nickName) up.sellerNickName = update.nickName;
    if (update.avatarUrl) up.sellerAvatar = update.avatarUrl;
    await db2.collection('items').doc(item._id).update({ data: up });
  }

  const wants = await db2.collection('wants').where({ userOpenid: openid }).get();
  for (const want of wants.data || []) {
    const up = {};
    if (update.nickName) up.userNickName = update.nickName;
    if (update.avatarUrl) up.userAvatar = update.avatarUrl;
    await db2.collection('wants').doc(want._id).update({ data: up });
  }
}