/**
 * 初始化微信云开发数据库集合与索引
 *
 * 运行方式：
 *   cd tools
 *   npm install
 *   TCB_ENV=xxx TCB_SECRET_ID=xxx TCB_SECRET_KEY=xxx node init-db.js
 *
 * 如果没有腾讯云 Secret，也可以直接查看本脚本输出的集合/索引清单，
 * 手动在云开发控制台中创建。
 */

const schema = {
  users: {
    indexes: [
      { name: 'openid_idx', keys: { _openid: 1 } }
    ]
  },
  items: {
    indexes: [
      { name: 'seller_idx', keys: { sellerOpenid: 1 } },
      { name: 'category_idx', keys: { category: 1 } },
      { name: 'campus_idx', keys: { campus: 1 } },
      { name: 'status_idx', keys: { status: 1 } },
      { name: 'createTime_idx', keys: { createTime: -1 } }
    ]
  },
  wants: {
    indexes: [
      { name: 'user_idx', keys: { userOpenid: 1 } },
      { name: 'category_idx', keys: { category: 1 } },
      { name: 'campus_idx', keys: { campus: 1 } },
      { name: 'createTime_idx', keys: { createTime: -1 } }
    ]
  },
  chats: {
    indexes: [
      { name: 'participants_idx', keys: { participantOpenids: 1 } },
      { name: 'target_idx', keys: { targetId: 1, type: 1 } },
      { name: 'lastTime_idx', keys: { lastTime: -1 } }
    ]
  },
  messages: {
    indexes: [
      { name: 'chat_time_idx', keys: { chatId: 1, createTime: 1 } },
      { name: 'chat_receiver_read_idx', keys: { chatId: 1, receiverOpenid: 1, read: 1 } }
    ]
  },
  ratings: {
    indexes: [
      { name: 'seller_idx', keys: { sellerOpenid: 1 } },
      { name: 'unique_rating_idx', keys: { targetId: 1, buyerOpenid: 1 }, unique: true }
    ]
  },
  favorites: {
    indexes: [
      { name: 'user_target_idx', keys: { _openid: 1, targetId: 1, type: 1 }, unique: true }
    ]
  }
};

async function main() {
  const env = process.env.TCB_ENV;
  const secretId = process.env.TCB_SECRET_ID;
  const secretKey = process.env.TCB_SECRET_KEY;

  console.log('========== 云开发数据库初始化清单 ==========\n');
  Object.keys(schema).forEach(coll => {
    console.log(`集合: ${coll}`);
    schema[coll].indexes.forEach(idx => {
      const unique = idx.unique ? '（唯一）' : '';
      console.log(`  - 索引 ${idx.name}: ${JSON.stringify(idx.keys)} ${unique}`);
    });
    console.log('');
  });

  if (!env || !secretId || !secretKey) {
    console.log('未提供 TCB_ENV / TCB_SECRET_ID / TCB_SECRET_KEY，跳过自动创建。');
    console.log('请登录微信云开发控制台，按上述清单手动创建集合与索引。');
    return;
  }

  let tcb;
  try {
    tcb = require('tcb-admin-node');
  } catch (e) {
    console.error('请先运行 npm install 安装 tcb-admin-node');
    process.exit(1);
  }

  tcb.init({ env, secretId, secretKey });
  const db = tcb.database();

  for (const collName of Object.keys(schema)) {
    try {
      if (db.createCollection) {
        await db.createCollection(collName);
        console.log(`创建集合成功: ${collName}`);
      } else {
        console.log(`当前 SDK 不支持自动创建集合，请手动创建: ${collName}`);
      }
    } catch (e) {
      if (e && e.message && e.message.includes('already exists')) {
        console.log(`集合已存在: ${collName}`);
      } else {
        console.error(`创建集合失败: ${collName}`, e.message || e);
      }
    }

    const coll = db.collection(collName);
    for (const idx of schema[collName].indexes) {
      try {
        if (coll.createIndex) {
          await coll.createIndex(idx.keys, { name: idx.name, unique: !!idx.unique });
          console.log(`  创建索引成功: ${idx.name}`);
        } else {
          console.log(`  当前 SDK 不支持自动创建索引，请手动创建: ${idx.name}`);
        }
      } catch (e) {
        if (e && e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) {
          console.log(`  索引已存在: ${idx.name}`);
        } else {
          console.error(`  创建索引失败: ${idx.name}`, e.message || e);
        }
      }
    }
  }

  console.log('\n初始化完成');
}

main().catch(err => {
  console.error('初始化出错', err);
  process.exit(1);
});
