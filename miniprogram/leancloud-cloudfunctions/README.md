# 校园跳蚤市场 LeanCloud 云函数

本目录包含需要服务端规则校验的 LeanCloud 云函数（Cloud Functions），部署在 LeanCloud 云引擎（LeanEngine）上。

## 已实现的云函数

| 云函数 | 说明 |
|--------|------|
| `getCreditScore` | 根据 sellerOpenid 聚合计算平均分 |
| `updateProfile` | 更新用户资料，强制执行 30 天昵称修改冷却 |
| `deleteItem` | 删除闲置及关联的聊天、消息、评分 |
| `deleteWant` | 删除求购及关联的聊天、消息 |
| `createChat` | 创建或获取聊天会话 |
| `sendMessage` | 发送消息并更新会话未读数 |
| `markRead` | 标记消息已读并清空本会话当前用户未读数 |
| `shareContact` | 交换联系方式，双方同意后才返回对方联系方式 |
| `submitRating` | 提交评分，校验商品已售、未重复评分、双方聊过天 |

## 本地开发与测试

1. 安装 LeanCloud 命令行工具 [lean-cli](https://leancloud.cn/docs/leanengine_cli.html)。
2. 进入本目录：
   ```bash
   cd miniprogram/leancloud-cloudfunctions
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 登录并关联应用：
   ```bash
   lean login
   lean switch
   ```
5. 本地运行：
   ```bash
   lean up
   ```

## 部署到 LeanCloud

在 `miniprogram/leancloud-cloudfunctions` 目录执行：

```bash
lean deploy
```

部署成功后，小程序客户端通过 `AV.Cloud.run('functionName', params)` 调用这些云函数。

## 环境变量

本地调试和线上部署时，LeanCloud 会自动注入以下环境变量，无需手动填写：

- `LEANCLOUD_APP_ID`
- `LEANCLOUD_APP_KEY`
- `LEANCLOUD_APP_MASTER_KEY`
- `LEANCLOUD_APP_PORT`
- `LEANCLOUD_API_SERVER`
