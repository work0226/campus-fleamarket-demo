# 小程序辅助脚本

本目录包含用于验证、初始化数据库和自动化上传的脚本。

## 安装依赖

```bash
cd tools
npm install
```

## 1. 项目验证

检查页面、云函数、JSON 配置是否完整，JS 语法是否正确。

```bash
npm run validate
```

## 2. 初始化云数据库

### 方式 A：自动创建（需要腾讯云 Secret）

在微信云开发控制台 -> 设置 -> 环境设置 ->  API 密钥，获取 `SecretId` 和 `SecretKey`，然后执行：

```bash
# Windows PowerShell
$env:TCB_ENV="你的环境 ID"
$env:TCB_SECRET_ID="你的 SecretId"
$env:TCB_SECRET_KEY="你的 SecretKey"
npm run init-db

# macOS / Linux
TCB_ENV=你的环境 ID TCB_SECRET_ID=你的SecretId TCB_SECRET_KEY=你的SecretKey npm run init-db
```

### 方式 B：手动创建

如果暂时没有 Secret，运行 `npm run init-db` 也会打印出所有需要创建的集合和索引清单，按清单在云开发控制台手动创建即可。

## 3. 自动化上传代码

### 本地命令行上传

1. 登录[微信公众平台](https://mp.weixin.qq.com)，进入「开发」->「开发管理」->「开发设置」。
2. 生成并下载「小程序代码上传密钥」。
3. 执行：

```bash
# Windows PowerShell
$env:MINIAPP_APPID="wx-your-app-id"
$env:MINIAPP_PRIVATE_KEY_PATH="C:\path\to\private.key"
$env:MINIAPP_VERSION="1.0.0"
$env:MINIAPP_DESC="初次提交"
npm run upload

# macOS / Linux
MINIAPP_APPID=wx-your-app-id MINIAPP_PRIVATE_KEY_PATH=/path/to/private.key MINIAPP_VERSION=1.0.0 MINIAPP_DESC=初次提交 npm run upload
```

### GitHub Actions 自动上传

项目已包含 `.github/workflows/upload.yml`。

1. 在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中添加：
   - `MINIAPP_APPID`：小程序 AppID
   - `MINIAPP_PRIVATE_KEY_BASE64`：上传密钥文件内容转 base64 后的字符串
2. 之后每次推送到 `main` 分支且修改了 `miniprogram/**` 文件时，会自动上传代码。
3. 也可以在 Actions 页面手动触发，填写版本号和描述。

## 注意事项

- 不要将 `private.key` 或腾讯云 Secret 提交到仓库。
- `tools/config.local.js` 和 `tools/.tmp-private.key` 已加入 `.gitignore`。
