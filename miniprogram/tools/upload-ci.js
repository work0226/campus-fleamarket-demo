/**
 * 使用 miniprogram-ci 上传微信小程序代码
 * 运行前需安装依赖：npm install miniprogram-ci
 *
 * 必要环境变量：
 *   MINIAPP_APPID              小程序 AppID
 *   MINIAPP_PRIVATE_KEY_PATH   小程序上传密钥文件路径（从微信公众平台下载）
 * 或 MINIAPP_PRIVATE_KEY_BASE64 密钥文件内容的 base64（适合 CI）
 *
 * 可选环境变量：
 *   MINIAPP_VERSION            版本号，默认 1.0.0
 *   MINIAPP_DESC               版本描述，默认空
 */

const fs = require('fs');
const path = require('path');
const ci = require('miniprogram-ci');

const projectPath = path.resolve(__dirname, '..');
const appid = process.env.MINIAPP_APPID;
let privateKeyPath = process.env.MINIAPP_PRIVATE_KEY_PATH;
const privateKeyBase64 = process.env.MINIAPP_PRIVATE_KEY_BASE64;
const version = process.env.MINIAPP_VERSION || '1.0.0';
const desc = process.env.MINIAPP_DESC || `ci upload ${new Date().toISOString()}`;

if (!appid) {
  console.error('错误：缺少环境变量 MINIAPP_APPID');
  process.exit(1);
}

if (!privateKeyPath && !privateKeyBase64) {
  console.error('错误：缺少上传密钥，请设置 MINIAPP_PRIVATE_KEY_PATH 或 MINIAPP_PRIVATE_KEY_BASE64');
  process.exit(1);
}

if (!privateKeyPath && privateKeyBase64) {
  const keyContent = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
  privateKeyPath = path.join(__dirname, '.tmp-private.key');
  fs.writeFileSync(privateKeyPath, keyContent);
  console.log('已从 base64 写出临时密钥文件');
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath,
  privateKeyPath,
  ignores: ['node_modules/**', 'tools/**', 'README.md']
});

ci.upload({
  project,
  version,
  desc
}).then(res => {
  console.log('上传成功', res);
  process.exit(0);
}).catch(err => {
  console.error('上传失败', err);
  process.exit(1);
});
