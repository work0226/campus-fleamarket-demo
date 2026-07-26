# 校园跳蚤市场小程序（LeanCloud 版）

基于微信原生框架 + LeanCloud 后端的校园二手/求购小程序。

> 本项目已完成从「微信云开发（wx.cloud + cloudfunctions）」到「LeanCloud」的迁移。所有页面结构、WXML、WXSS 保持不变，仅修改了 JS 逻辑与全局配置。原 `cloudfunctions/` 目录作为参考保留，新代码不再依赖它。

## 目录

- [功能简介](#功能简介)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
  - [1. 导入微信开发者工具](#1-导入微信开发者工具)
  - [2. 注册 LeanCloud 并获取凭证](#2-注册-leancloud-并获取凭证)
  - [3. 配置 app.js](#3-配置-appjs)
  - [4. 创建数据表（Class）](#4-创建数据表class)
  - [5. 部署 LeanCloud 云函数](#5-部署-leancloud-云函数)
  - [6. 配置 Class 权限](#6-配置-class-权限)
  - [7. 上传与发布](#7-上传与发布)
- [数据表设计](#数据表设计)
- [从微信云开发迁移的要点](#从微信云开发迁移的要点)
- [下一步](#下一步)

## 功能简介

- 底部 TabBar：首页、求购、发布、消息、我的。
- 首页：闲置列表，支持分类/校区/价格/排序/搜索筛选。
- 求购页：求购列表，支持分类/校区/预算筛选。
- 发布页：可发布闲置（图片最多 9 张、标题、价格、分类、交易方式、地点、描述）或求购（标题、预算、期望成色、分类、说明）。
- 商品详情：轮播图、卖家信息、收藏、我想要（发起聊天）、卖家管理（编辑、上下架、删除、标记已售）。
- 求购详情：预算、期望成色、发布者信息，非发布者可联系。
- 聊天：基于 `Message` 表的单聊，已读回执，开场白自动区分“我发布的闲置/求购”与“对方求购/想要”，双方同意后可交换联系方式。
- 消息列表：全部/闲置/求购筛选，未读角标，新消息高亮。
- 个人中心：头像上传、昵称修改（30 天冷却）、校区/学院/联系方式、我的发布、我的收藏、信用评分、退出登录。
- 信用评分：卖家标记售出后，实际聊过天的买家可评 1-5 星；禁止重复评分；信用分=平均分。

## 项目结构

```
campus-fleamarket-miniprogram/
├── app.js                         # 小程序入口，初始化 LeanCloud 与微信登录
├── app.json                       # 全局配置、页面路由、tabBar
├── app.wxss                       # 全局样式，主色 #2563eb
├── project.config.json            # 项目配置（需填入真实小程序 AppID）
├── sitemap.json                   # 站点地图
├── utils/
│   ├── util.js                    # 时间格式化等工具
│   └── leancloud-api.js           # 封装所有原 cloudfunction 功能
├── libs/
│   ├── av-core-min.js             # LeanCloud 小程序 SDK 核心
│   └── leancloud-adapters-weapp.js # LeanCloud 微信小程序适配器
├── leancloud-cloudfunctions/      # LeanCloud 云函数（需要服务端规则的业务）
│   ├── cloud.js                   # 云函数定义
│   ├── server.js                  # LeanEngine 入口
│   ├── package.json
│   └── README.md                  # 云函数部署说明
├── cloudfunctions/                # 原微信云函数（仅作参考，未删除）
└── pages/                         # 页面
    ├── index/                     # 首页
    ├── wants/                     # 求购广场
    ├── publish/                   # 发布
    ├── messages/                  # 消息列表
    ├── profile/                   # 我的
    ├── item-detail/               # 商品详情
    ├── want-detail/               # 求购详情
    ├── chat/                      # 聊天页
    ├── edit-profile/              # 编辑资料
    ├── my-items/                  # 我的发布
    ├── my-favorites/              # 我的收藏
    └── rating/                    # 评价卖家
```

## 快速开始

### 1. 导入微信开发者工具

1. 打开微信开发者工具，登录微信号。
2. 选择「导入项目」。
3. 项目目录选择 `campus-fleamarket-miniprogram` 文件夹。
4. 填写或点击「测试号」获取一个 AppID；如果已注册小程序，请使用真实 AppID。
5. 点击「导入」。

### 2. 注册 LeanCloud 并获取凭证

1. 访问 [LeanCloud 官网](https://leancloud.cn/) 注册账号并登录。
2. 创建新应用，选择「开发版」即可。
3. 进入应用控制台 ->「设置」->「应用凭证」，记录以下信息：
   - **AppID**
   - **AppKey**
   - **ServerURL**（REST API 服务器地址，例如 `https://xxx.api.lncld.net` 或国内节点 `https://xxx.lc-cn-n1-shared.com`）
   - **Master Key**（部署云函数时需要）
4. 在控制台 ->「存储」->「结构化数据」中，确认默认 `_User` 表已存在（LeanCloud 内置，无需手动创建）。

### 3. 配置 app.js

打开 `app.js`，将文件顶部的占位符替换为 LeanCloud 应用凭证：

```js
// ===== 请在这里填写你的 LeanCloud 应用凭证 =====
const LC_APP_ID = 'YOUR_APP_ID';
const LC_APP_KEY = 'YOUR_APP_KEY';
const LC_SERVER_URL = 'YOUR_SERVER_URL'; // 例如 https://xxx.api.lncld.net
```

小程序登录入口已改为 `AV.User.loginWithMiniApp()`，登录成功后会自动在 `_User` 表中创建/关联账号，并在自定义 `User` 表中写入初始资料。

### 4. 创建数据表（Class）

进入 LeanCloud 控制台 ->「存储」->「结构化数据」，点击「创建 Class」，按下方 [数据表设计](#数据表设计) 创建除 `_User` 外的 7 个 Class：

- `User`
- `Item`
- `Want`
- `Chat`
- `Message`
- `Rating`
- `Favorite`

创建时保持默认 ACL 即可，后续可在 [配置 Class 权限](#6-配置-class-权限) 中按需调整。

### 5. 部署 LeanCloud 云函数

需要服务端规则校验的功能已放在 `leancloud-cloudfunctions/` 目录，部署步骤如下：

1. 安装 LeanCloud 命令行工具 [lean-cli](https://leancloud.cn/docs/leanengine_cli.html)。
2. 进入云函数目录：

   ```bash
   cd miniprogram/leancloud-cloudfunctions
   ```

3. 安装依赖：

   ```bash
   npm install
   ```

4. 登录并关联 LeanCloud 应用：

   ```bash
   lean login
   lean switch
   ```

5. 部署到线上：

   ```bash
   lean deploy
   ```

部署成功后，小程序客户端通过 `AV.Cloud.run('functionName', params)` 调用这些云函数。详细说明见 `leancloud-cloudfunctions/README.md`。

### 6. 配置 Class 权限

为保证数据安全，建议在 LeanCloud 控制台为各 Class 设置如下 ACL/权限：

| Class | 建议权限 |
|-------|----------|
| `_User` | 默认即可（用户可读写自己，他人不可读敏感字段）。联系方式等敏感字段建议仅在云函数中读取。 |
| `User` | 默认「所有用户可读，登录用户可写」；实际写入由 `updateProfile` 云函数控制。 |
| `Item` / `Want` | 所有用户可读，登录用户可写。创建者本人或云函数可修改/删除。 |
| `Chat` / `Message` | 所有用户可读（参与者通过云函数鉴权），所有用户可写；实际写入由 `sendMessage` / `markRead` / `shareContact` 云函数控制。 |
| `Rating` | 所有用户可读，所有用户可写；实际写入由 `submitRating` 云函数控制。 |
| `Favorite` | 所有用户可读，登录用户可写；仅创建者可删除。 |

> 提示：LeanCloud 云函数默认以 Master Key 执行关键写操作，因此即使客户端 ACL 较宽，业务规则仍能得到校验。

### 7. 上传与发布

1. 在开发者工具中点击「上传」-> 填写版本号和项目备注。
2. 上传成功后，登录[微信小程序后台](https://mp.weixin.qq.com)。
3. 进入「管理」->「版本管理」，找到刚上传的开发版本。
4. 点击「提交审核」，按提示填写信息。
5. 审核通过后点击「发布」即可上线。

## 数据表设计

| Class | 说明 | 主要字段 |
|-------|------|----------|
| `_User` | LeanCloud 内置用户表（微信登录后自动生成） | `authData`（含微信 openid）、`username` 等 |
| `User` | 自定义用户资料表 | `openid`, `user`（指向 `_User`）, `nickName`, `avatarUrl`, `campus`, `college`, `contact`, `contactType`, `contactVisible`, `lastNicknameChange`, `createdAt`, `updatedAt` |
| `Item` | 闲置商品 | `title`, `price`, `category`, `location`, `trade`, `desc`, `images`, `campus`, `status`（active/offline/sold）, `soldTo`, `sellerOpenid`, `sellerNickName`, `sellerAvatar`, `createTime`, `updateTime` |
| `Want` | 求购信息 | `title`, `budget`, `condition`, `category`, `note`, `campus`, `userOpenid`, `userNickName`, `userAvatar`, `createTime`, `updateTime` |
| `Chat` | 聊天会话 | `type`（item/want）, `targetId`, `participantOpenids`, `title`, `peerName`, `peerAvatar`, `lastMsg`, `lastTime`, `unreadCount`, `contactShared`, `createTime` |
| `Message` | 聊天消息 | `chatId`, `senderOpenid`, `receiverOpenid`, `text`, `type`, `read`, `createTime` |
| `Rating` | 信用评分 | `type`（item）, `targetId`, `sellerOpenid`, `buyerOpenid`, `score`, `createTime` |
| `Favorite` | 收藏记录 | `userOpenid`, `targetId`, `type`（item/want）, `createTime` |

## 从微信云开发迁移的要点

- **登录**：`wx.cloud.callFunction({ name: 'login' })` 替换为 `AV.User.loginWithMiniApp()`，并在 `User` 表中维护扩展资料。
- **API 层**：所有原云函数调用已集中到 `utils/leancloud-api.js`，页面 JS 仅调用该封装层。
- **图片上传**：`wx.cloud.uploadFile` 替换为 LeanCloud `AV.File` 文件存储。
- **数据查询**：`wx.cloud.callFunction` 的数据库查询改为 `AV.Query`。
- **服务端规则**：评分校验、联系方式交换、昵称 30 天冷却、删除级联等业务逻辑保留在 LeanCloud 云函数中执行。
- **原 `cloudfunctions/` 目录**：未删除，仅作为历史参考；新代码不再引用其中的函数。

## 下一步

1. 替换 `app.js` 中的 LeanCloud 凭证和 `project.config.json` 中的小程序 AppID。
2. 在 LeanCloud 控制台创建所需 Class，并调整权限。
3. 按 `leancloud-cloudfunctions/README.md` 部署云函数。
4. 使用真机预览或模拟器测试发布、聊天、评分等核心流程。
5. 根据学校实际情况调整 `pages/index/index.js`、`pages/wants/wants.js`、`pages/publish/publish.js`、`pages/edit-profile/edit-profile.js` 中的校区、分类、交易方式、成色等常量。
6. 上传代码并提交审核。

如有问题，请检查开发者工具「调试器」控制台、LeanCloud 控制台「云引擎日志」以及「结构化数据」中的数据状态。
