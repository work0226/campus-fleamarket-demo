const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const {
    category,
    campus,
    minPrice,
    maxPrice,
    sort,
    keyword,
    sellerOpenid,
    status,
    page = 1,
    pageSize = 50
  } = event;

  const conditions = [];

  if (status) {
    conditions.push({ status: status });
  } else {
    conditions.push({ status: 'active' });
  }

  if (category && category !== '全部') {
    conditions.push({ category: category });
  }

  if (campus && campus !== '全部') {
    conditions.push({ campus: campus });
  }

  if (sellerOpenid) {
    conditions.push({ sellerOpenid: sellerOpenid });
  }

  const priceCond = {};
  if (minPrice > 0) priceCond.$gte = minPrice;
  if (maxPrice > 0) priceCond.$lte = maxPrice;
  if (Object.keys(priceCond).length) {
    conditions.push({ price: priceCond });
  }

  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    conditions.push(_.or([
      { title: db.RegExp({ regexp: kw, options: 'i' }) },
      { desc: db.RegExp({ regexp: kw, options: 'i' }) }
    ]));
  }

  let query = db.collection('items');
  if (conditions.length) {
    query = query.where(_.and(conditions));
  }

  let orderField = 'createTime';
  let orderDir = 'desc';
  if (sort) {
    if (sort.field) orderField = sort.field;
    if (sort.order) orderDir = sort.order;
  }
  query = query.orderBy(orderField, orderDir);

  const totalRes = await query.count();
  const listRes = await query.skip((page - 1) * pageSize).limit(pageSize).get();

  return {
    code: 0,
    data: listRes.data || [],
    total: totalRes.total || 0,
    openid
  };
};