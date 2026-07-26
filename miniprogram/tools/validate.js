const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

const errors = [];
const warnings = [];

function checkFile(p, desc) {
  if (!fs.existsSync(p)) {
    errors.push(`缺少文件：${desc} -> ${path.relative(root, p)}`);
    return false;
  }
  return true;
}

function checkJSON(p, desc) {
  if (!checkFile(p, desc)) return;
  try {
    JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    errors.push(`JSON 解析失败：${desc} -> ${e.message}`);
  }
}

function checkJS(p, desc) {
  if (!checkFile(p, desc)) return;
  try {
    execSync(`node --check "${p}"`, { stdio: 'pipe' });
  } catch (e) {
    errors.push(`JS 语法错误：${desc} -> ${e.stderr ? e.stderr.toString().trim() : e.message}`);
  }
}

// 检查 app.json 中声明的页面是否都存在
console.log('检查页面文件...');
(appJson.pages || []).forEach(page => {
  const base = path.join(root, page);
  checkFile(base + '.js', `${page}.js`);
  checkFile(base + '.wxml', `${page}.wxml`);
  checkFile(base + '.wxss', `${page}.wxss`);
  checkJSON(base + '.json', `${page}.json`);
});

// 检查 tabBar 页面是否都在 pages 列表中
console.log('检查 tabBar 配置...');
(appJson.tabBar && appJson.tabBar.list || []).forEach(tab => {
  if (!appJson.pages.includes(tab.pagePath)) {
    errors.push(`tabBar 页面未在 pages 中声明：${tab.pagePath}`);
  }
});

// 检查全局文件
console.log('检查全局配置...');
checkJSON(path.join(root, 'project.config.json'), 'project.config.json');
checkJSON(path.join(root, 'sitemap.json'), 'sitemap.json');
checkJS(path.join(root, 'app.js'), 'app.js');
checkFile(path.join(root, 'app.wxss'), 'app.wxss');

// 检查云函数
console.log('检查云函数...');
const cfRoot = path.join(root, 'cloudfunctions');
const cfNames = fs.readdirSync(cfRoot).filter(name => fs.statSync(path.join(cfRoot, name)).isDirectory());
cfNames.forEach(name => {
  const base = path.join(cfRoot, name);
  checkFile(path.join(base, 'index.js'), `cloudfunction ${name}/index.js`);
  checkFile(path.join(base, 'config.json'), `cloudfunction ${name}/config.json`);
  checkJSON(path.join(base, 'package.json'), `cloudfunction ${name}/package.json`);
  checkJS(path.join(base, 'index.js'), `cloudfunction ${name}/index.js`);
});

// 检查 app.js 环境 ID 占位符
console.log('检查关键占位符...');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf-8');
if (appJs.includes("'your-env-id'")) {
  warnings.push('app.js 中仍使用占位符环境 ID，发布前需要替换为真实云开发环境 ID');
}
const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf-8'));
if (projectConfig.appid === 'wx-your-app-id') {
  warnings.push('project.config.json 中仍使用占位符 AppID，发布前需要替换为真实小程序 AppID');
}

// 输出报告
console.log('\n========== 验证报告 ==========');
if (errors.length === 0) {
  console.log('✅ 项目结构和语法检查全部通过');
} else {
  console.log(`❌ 发现 ${errors.length} 个错误：`);
  errors.forEach(e => console.log('  - ' + e));
}
if (warnings.length > 0) {
  console.log(`\n⚠️ 发现 ${warnings.length} 个待处理项：`);
  warnings.forEach(w => console.log('  - ' + w));
}
console.log('================================\n');
process.exit(errors.length > 0 ? 1 : 0);
