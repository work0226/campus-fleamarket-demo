const AV = require('leancloud-storage');
const LeanEngine = require('leanengine');

const APP_ID = process.env.LEANCLOUD_APP_ID || 'YOUR_APP_ID';
const APP_KEY = process.env.LEANCLOUD_APP_KEY || 'YOUR_APP_KEY';
const MASTER_KEY = process.env.LEANCLOUD_APP_MASTER_KEY || 'YOUR_MASTER_KEY';

AV.init({
  appId: APP_ID,
  appKey: APP_KEY,
  masterKey: MASTER_KEY,
  serverURLs: process.env.LEANCLOUD_API_SERVER || undefined
});

LeanEngine.init({
  appId: APP_ID,
  appKey: APP_KEY,
  masterKey: MASTER_KEY
});

// 加载云函数定义
require('./cloud');

const app = require('express')();
app.use(LeanEngine.express());

app.listen(process.env.LEANCLOUD_APP_PORT || 3000, () => {
  console.log('LeanCloud cloud functions started.');
});
