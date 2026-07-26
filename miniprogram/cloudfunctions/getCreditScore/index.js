const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const $ = db.command.aggregate;

exports.main = async (event, context) => {
  const { sellerOpenid } = event;
  if (!sellerOpenid) return { code: -1, message: '缺少 sellerOpenid' };

  const countRes = await db.collection('ratings').where({ sellerOpenid }).count();
  if (countRes.total === 0) {
    return { code: 0, average: 0, count: 0 };
  }

  const aggRes = await db.collection('ratings')
    .where({ sellerOpenid })
    .aggregate()
    .group({
      _id: null,
      average: $.avg('$score'),
      count: $.sum(1)
    })
    .end();

  const result = aggRes.list && aggRes.list[0];
  const average = result ? Math.round(result.average * 10) / 10 : 0;
  return { code: 0, average, count: result ? result.count : 0 };
};