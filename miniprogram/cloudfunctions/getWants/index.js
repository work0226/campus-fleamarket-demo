const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const {
    category,
    campus,
    minBudget,
    maxBudget,
    keyword,
    userOpenid,
    page = 1,
    pageSize = 50
  } = event;

  const conditions = [];

  if (category && category !== '全部') {
    conditions.push({ category: category });
  }

  if (campus && campus !== '全部') {
    conditions.push({ campus: campus });
  }

  if (userOpenid) {
    conditions.push({ userOpenid: userOpenid });
  }

  const budgetCond = {};
  if (minBudget > 0) budgetCond.$gte = minBudget;
  if (maxBudget > 0) budgetCond.$lte = maxBudget;
  if (Object.keys(budgetCond).length) {
    conditions.push({ budget: budgetCond });
  }

  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    conditions.push(_.or([
      { title: db.RegExp({ regexp: kw, options: 'i' }) },
      { note: db.RegExp({ regexp: kw, options: 'i' }) }
    ]));
  }

  let query = db.collection('wants');
  if (conditions.length) {
    query = query.where(_.and(conditions));
  }

  query = query.orderBy('createTime', 'desc');

  const totalRes = await query.count();
  const listRes = await query.skip((page - 1) * pageSize).limit(pageSize).get();

  return { code: 0, data: listRes.data || [], total: totalRes.total || 0, openid };
};