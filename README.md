# 今天吃什么

一个基于微信小程序云开发的点餐 Demo。项目包含小程序前端、云函数、云数据库菜单管理、购物车、地址管理、订单流转和订单完成订阅通知，适合作为轻量外卖/店内点餐小程序的原型。

## 功能概览

- 菜品浏览：按分类查看菜品，支持卡片轮播、销量、标签和菜品图片。
- 购物车：本地缓存购物车，支持加减数量、清空、配送费和满额免配送费计算。
- 下单结算：填写或复用地址，支持从剪贴板识别收货信息。
- 订单管理：用户可查看订单、删除自己的订单、发起取消申请。
- 管理员后台：管理员可初始化菜单、新增/编辑/删除分类和菜品、上传或清空菜品图片。
- 云端订单处理：云函数创建订单、更新销量、处理取消申请、完成订单并发送订阅消息。
- 本地开发降级：未配置云环境时使用 mock 菜单和本地订单缓存，方便先预览界面。

## 项目结构

```text
.
├── miniprogram/                  # 小程序前端
│   ├── app.js                    # 云开发初始化、全局门店配置
│   ├── app.json                  # 页面与 tabBar 配置
│   ├── config/
│   │   ├── cloud.js              # 云环境 ID
│   │   ├── subscription.js       # 订单完成订阅消息模板 ID
│   │   └── admin.js              # 兼容旧版的空配置
│   ├── pages/
│   │   ├── home/                 # 点餐首页
│   │   ├── cover/                # 首次进入封面页
│   │   ├── cart/                 # 购物车
│   │   ├── checkout/             # 结算页
│   │   ├── orders/               # 用户订单
│   │   ├── profile/              # 我的
│   │   ├── address/              # 地址管理
│   │   └── admin/                # 管理员后台
│   └── utils/                    # API、购物车、地址、mock 数据
├── cloudfunctions/
│   ├── orders/                   # 订单云函数
│   └── menuAdmin/                # 菜单与管理员云函数
├── docs/
│   └── order-completed-notice.md # 订阅消息说明
└── project.config.json           # 微信开发者工具项目配置
```

## 快速运行

1. 打开微信开发者工具。
2. 选择“导入项目”，目录选择本仓库根目录。
3. AppID 可先使用 `project.config.json` 中的配置，或替换成你自己的小程序 AppID。
4. 点击“编译”预览。

如果暂时没有配置云环境，小程序会自动进入本地数据模式：菜单来自 `miniprogram/utils/mockData.js`，订单保存在本地缓存中。

## 云开发配置

1. 在微信开发者工具顶部进入“云开发”，开通一个云环境。
2. 复制云环境 ID，写入 `miniprogram/config/cloud.js`：

```js
const CLOUD_ENV_ID = '你的云环境ID';

module.exports = {
  CLOUD_ENV_ID
};
```

3. 在云数据库中创建 3 个集合：

```text
categories
products
orders
```

4. 推荐权限策略：

```text
categories：所有用户可读，写入仅通过云函数
products：所有用户可读，写入仅通过云函数
orders：仅云函数可读写
```

当前项目的分类读取、菜品读取、菜单初始化、菜单编辑、订单创建、订单查询、取消申请、订单完成和订单删除都通过云函数执行。

## 部署云函数

在微信开发者工具左侧找到 `cloudfunctions`，分别部署两个云函数：

1. 右键 `orders`，选择“上传并部署：云端安装依赖”。
2. 右键 `menuAdmin`，选择“上传并部署：云端安装依赖”。
3. 给两个云函数都配置环境变量 `ADMIN_OPENIDS`，值为管理员微信 openid，多个管理员用英文逗号分隔：

```text
ADMIN_OPENIDS=oAbc123xxx,oDef456yyy
```

4. 如需替换订阅消息模板，可给 `orders` 云函数配置：

```text
ORDER_COMPLETED_TEMPLATE_ID=你的模板ID
```

每次修改 `cloudfunctions/` 下的代码后，都需要重新上传部署对应云函数。

## 初始化菜单

1. 部署 `menuAdmin` 云函数。
2. 确认当前微信用户 openid 已加入 `ADMIN_OPENIDS`。
3. 编译并进入小程序首页。
4. 管理员会在首页看到右上角管理入口。
5. 进入管理页后点击初始化菜单。

初始化数据默认来自 `cloudfunctions/menuAdmin/mockData.js`。初始化后，可以继续在管理页维护分类、菜品、价格、标签、上下架状态和菜品图片。菜品图片会上传到云存储的 `menu-images/` 目录。

## 订单完成订阅通知

项目内置“订单完成通知”流程：

1. 用户在结算页提交订单时，小程序调用 `wx.requestSubscribeMessage` 请求授权。
2. 管理员在后台将订单标记为完成。
3. `orders` 云函数更新订单状态，并调用 `cloud.openapi.subscribeMessage.send` 发送通知。
4. 已完成订单可手动补发一次通知。

模板字段和配置说明见 [docs/order-completed-notice.md](docs/order-completed-notice.md)。

## 管理员 openid 查询

先上传部署 `menuAdmin` 云函数，然后在微信开发者工具控制台执行：

```js
wx.cloud.callFunction({
  name: 'menuAdmin',
  data: { action: 'checkAdmin' }
}).then(console.log)
```

返回结果中的 `openid` 就是当前微信用户的 openid。把它填入 `menuAdmin` 和 `orders` 云函数的 `ADMIN_OPENIDS` 环境变量即可。

## 发布前检查

- `miniprogram/config/cloud.js` 已换成正式云环境 ID。
- `orders` 和 `menuAdmin` 两个云函数已上传部署。
- 云数据库已创建 `categories`、`products`、`orders` 集合。
- `ADMIN_OPENIDS` 已配置到两个云函数。
- 菜单数据已完成初始化。
- 菜品图片上传、下单、订单列表、取消申请、管理员处理取消、完成订单通知均已真机验证。
- `orders` 集合不要开放给客户端直接读写。

## 常见问题

### 初始化后菜单为空

重新上传部署 `menuAdmin` 云函数，并确认 `categories`、`products` 集合已创建。当前版本的菜单读取走云函数，数据库权限过严时也应先检查云函数是否部署成功。

### 看不到管理员入口

检查 3 件事：

1. `menuAdmin` 云函数已重新上传部署。
2. 当前微信用户 openid 已加入 `ADMIN_OPENIDS`。
3. 小程序当前连接的是正确的云环境 ID。

### 新增或删除分类失败

删除分类前，需要先删除该分类下所有菜品。系统会阻止直接删除仍然包含菜品的分类。

### 订单完成通知没有收到

确认用户下单时已授权订阅消息，`orders` 云函数已部署，并且模板 ID 与 `miniprogram/config/subscription.js`、云函数环境变量 `ORDER_COMPLETED_TEMPLATE_ID` 保持一致。

## 技术栈

- 微信小程序原生框架
- 微信云开发
- 云数据库
- 云存储
- 云函数 Node.js
- `wx-server-sdk`
