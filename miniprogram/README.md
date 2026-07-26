# 校园跳蚤市场小程序

基于微信原生框架 + 微信云开发（CloudBase）的校园二手/求购小程序。

## 目录

- [功能简介](#功能简介)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
  - [1. 导入微信开发者工具](#1-导入微信开发者工具)
  - [2. 开通云开发](#2-开通云开发)
  - [3. 配置环境 ID](#3-配置环境-id)
  - [4. 创建数据库集合与索引](#4-创建数据库集合与索引)
  - [5. 部署云函数](#5-部署云函数)
  - [6. 配置数据库权限](#6-配置数据库权限)
  - [7. 上传与发布](#7-上传与发布)
- [下一步](#下一步)

## 功能简介

- 底部 TabBar：首页、求购、发布、消息、我的。
- 首页：闲置列表，支持分类/校区/价格/排序/搜索筛选。
- 求购页：求购列表，支持分类/校区/预算筛选。
- 发布页：可发布闲置（图片最多 9 张、标题、价格、分类、交易方式、地点、描述）或求购（标题、预算、期望成色、分类、说明）。
- 商品详情：轮播图、卖家信息、收藏、我想要（发起聊天）、卖家管理（编辑、上下架、删除、标记已售）。
- 求购详情：预算、期望成色、发布者信息，非发布者可联系。
- 聊天：基于 `messages` 集合的单聊，已读回执，开场白自动区分“我发布的闲置/求购”与“对方求购/想要”，双方同意后可交换联系方式。
- 消息列表：全部/闲置/求购筛选，未读角标，新消息高亮。
- 个人中心：头像上传、昵称修改（30 天冷却）、校区/学院/联系方式、我的发布、我的收藏、信用评分、退出登录。
- 信用评分：卖家标记售出后，实际聊过天的买家可评 1-5 星；禁止重复评分；信用分=平均分。

## 项目结构

```
campus-fleamarket-miniprogram/
├── app.js                  # 小程序入口，初始化云开发
├── app.json                # 全局配置、页面路由、tabBar
├── app.wxss                # 全局样式，主色 #2563eb
├── project.config.json     # 项目配置（需填入真实 appid）
├── sitemap.json            # 站点地图
├── utils/util.js           # 时间格式化等工具
├── cloudfunctions/         # 云函数
│   ├── login/              # 登录/自动注册
│   ├── getItems/           # 查询闲置列表
│   ├── getItem/            # 查询单个闲置
│   ├── publishItem/        # 发布闲置
│   ├── updateItem/         # 编辑闲置
│   ├── updateItemStatus/   # 修改闲置状态
│   ├── deleteItem/         # 删除闲置
│   ├── getWants/           # 查询求购列表
│   ├── getWant/            # 查询单个求购
│   ├── publishWant/        # 发布求购
│   ├── deleteWant/         # 删除求购
│   ├── createChat/         # 创建/获取聊天
│   ├── getChats/           # 聊天列表
│   ├── getMessages/        # 消息列表
│   ├── sendMessage/        # 发送消息
│   ├── markRead/           # 标记已读
│   ├── shareContact/       # 交换联系方式
│   ├── submitRating/       # 提交评分
│   ├── getRatings/         # 查询评分
│   ├── getCreditScore/     # 查询信用分
│   ├── updateProfile/      # 更新用户资料
│   └── uploadImage/        # 获取图片临时链接
└── pages/                  # 页面
    ├── index/              # 首页
    ├── wants/              # 求购广场
    ├── publish/            # 发布
    ├── messages/           # 消息列表
    ├── profile/            # 我的
    ├── item-detail/        # 商品详情
    ├── want-detail/        # 求购详情
    ├── chat/               # 聊天页
    ├── edit-profile/       # 编辑资料
    ├── my-items/           # 我的发布
    ├── my-favorites/       # 我的收藏
    └── rating/             # 评价卖家
```

## 快速开始

### 1. 导入微信开发者工具

1. 打开微信开发者工具，登录微信号。
2. 选择「导入项目」。
3. 项目目录选择 `campus-fleamarket-miniprogram` 文件夹。
4. 填写或点击「测试号」获取一个 AppID；如果已注册小程序，请使用真实 AppID。
5. 点击「导入」。

### 2. 开通云开发

1. 在开发者工具中点击左上角的「云开发」按钮。
2. 按提示开通云开发环境，获取「环境 ID」（例如 `campus-fleamarket-xxx`）。
3. 开通后记录下环境 ID。

### 3. 配置环境 ID

- 打开 `app.js`，将 `'your-env-id'` 替换为你的真实云开发环境 ID：

```js
wx.cloud.init({
  env: 'your-env-id',   // <-- 替换为真实环境 ID
  traceUser: true
});
```

- 打开 `project.config.json`，将 `appid` 替换为你的小程序 AppID：

```json
"appid": "wx-your-app-id"
```

### 4. 创建数据库集合与索引

进入「云开发控制台」->「数据库」，手动创建以下集合：

| 集合名      | 说明           |
|-------------|----------------|
| `users`     | 用户资料       |
| `items`     | 闲置商品       |
| `wants`     | 求购信息       |
| `chats`     | 聊天会话       |
| `messages`  | 聊天记录       |
| `ratings`   | 信用评分       |
| `favorites` | 收藏记录       |

建议索引（在云开发控制台对应集合的「索引管理」中添加）：

- `items`
  - `sellerOpenid`（单字段，升序）
  - `category`（单字段，升序）
  - `campus`（单字段，升序）
  - `status`（单字段，升序）
  - `createTime`（单字段，降序）
- `wants`
  - `userOpenid`（单字段，升序）
  - `category`、`campus`（单字段）
  - `createTime`（单字段，降序）
- `chats`
  - `participantOpenids`（数组，升序）
  - `targetId` + `type`（组合索引）
  - `lastTime`（单字段，降序）
- `messages`
  - `chatId` + `createTime`（组合索引）
  - `chatId` + `receiverOpenid` + `read`（组合索引）
- `ratings`
  - `sellerOpenid`（单字段，升序）
  - `targetId` + `buyerOpenid`（组合索引，唯一可选）
- `favorites`
  - `_openid` + `targetId` + `type`（组合索引）

### 5. 部署云函数

1. 在微信开发者工具中，右键 `cloudfunctions/login` 文件夹 ->「创建并部署：云端安装依赖」。
2. 对所有其他云函数重复上述操作：
   - `getItems`、`getItem`、`publishItem`、`updateItem`、`updateItemStatus`、`deleteItem`
   - `getWants`、`getWant`、`publishWant`、`deleteWant`
   - `createChat`、`getChats`、`getMessages`、`sendMessage`、`markRead`、`shareContact`
   - `submitRating`、`getRatings`、`getCreditScore`
   - `updateProfile`、`uploadImage`
3. 部署完成后，可以在「云开发控制台」->「云函数」中查看是否全部部署成功。

### 6. 配置数据库权限

进入各集合的「权限设置」，建议：

- `users`：仅创建者可读写（默认）。
- `items`、`wants`：所有用户可读，仅创建者可写（在云函数中可写）。
  - 也可以保持默认“仅创建者可读写”，因为查询/写入均通过云函数进行。
- `chats`、`messages`、`ratings`：所有用户可读，仅创建者可写；或仅创建者可读写（云函数可绕过）。
- `favorites`：仅创建者可读写（默认）。

> 注意：为了安全和功能完整，推荐所有集合权限设置为“所有用户可读，仅创建者可写”，关键写入操作统一由云函数鉴权后完成。

### 7. 上传与发布

1. 在开发者工具中点击「上传」-> 填写版本号和项目备注。
2. 上传成功后，登录[微信小程序后台](https://mp.weixin.qq.com)。
3. 进入「管理」->「版本管理」，找到刚上传的开发版本。
4. 点击「提交审核」，按提示填写信息。
5. 审核通过后点击「发布」即可上线。

## 辅助脚本（可选）

`tools/` 目录下提供了几条辅助命令，可以减少重复操作：

- `npm run validate`：检查项目结构、JSON 可解析性和 JS 语法。
- `npm run init-db`：自动创建数据库集合与索引（需提供腾讯云 Secret），或打印手动创建清单。
- `npm run upload`：使用 `miniprogram-ci` 命令行上传代码（需提供 AppID 和上传密钥）。
- `.github/workflows/upload.yml`：配置 GitHub Actions 后，推送代码即可自动上传到微信小程序后台。

详见 [tools/README.md](tools/README.md)。

## 下一步

1. 替换 `app.js` 中的云开发环境 ID 和 `project.config.json` 中的 AppID。
2. 在微信开发者工具中完成云开发开通、集合创建、索引添加、云函数部署。
3. 使用真机预览或模拟器测试发布、聊天、评分等核心流程。
4. 根据学校实际情况调整 `pages/index/index.js`、`pages/wants/wants.js`、`pages/publish/publish.js`、`pages/edit-profile/edit-profile.js` 中的校区、分类、交易方式、成色等常量。
5. 上传代码并提交审核。

如有问题，请检查开发者工具「调试器」控制台和云函数日志。
