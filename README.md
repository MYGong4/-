# 今天吃什么

微信小程序点餐 Demo，已改为微信云开发部署形态：

- 小程序前端：`miniprogram/`
- 云函数：`cloudfunctions/orders`、`cloudfunctions/menuAdmin`
- 菜品分类：云数据库 `categories`
- 菜品列表：云数据库 `products`
- 订单记录：云数据库 `orders`
- 菜品图片：云存储 `menu-images/`
- 购物车：用户本地缓存 `ordering_cart`

## 本地打开

1. 打开微信开发者工具。
2. 导入项目根目录：`E:\test`。
3. AppID 使用 `project.config.json` 里的 AppID，或换成你自己的小程序 AppID。
4. 点击「编译」预览。未配置云环境时，小程序会使用本地 mock 数据。

## 配置云开发

1. 在微信开发者工具顶部点击「云开发」。
2. 开通一个云环境，复制环境 ID。
3. 修改 `miniprogram/config/cloud.js`：

```js
const CLOUD_ENV_ID = '你的云环境ID';
```

4. 在云数据库创建 3 个集合：

```text
categories
products
orders
```

5. 建议集合权限：

```text
categories：所有用户可读，仅管理员可写
products：所有用户可读，仅管理员可写
orders：仅云函数可读写
```

如果控制台没有完全一样的模板，可以先选“自定义安全规则”，按你的实际后台管理方式收紧写权限。当前项目的分类读取、菜品读取、订单创建、订单读取、订单删除、菜单初始化、分类新增、分类删除、菜品新增、菜品删除和菜品图片更新都通过云函数执行。

## 上传云函数

在微信开发者工具左侧找到 `cloudfunctions`：

1. 右键 `orders`，选择「上传并部署：云端安装依赖」。
2. 右键 `menuAdmin`，选择「上传并部署：云端安装依赖」。
3. 进入云开发控制台，打开 `menuAdmin` 云函数配置。
4. 添加环境变量 `ADMIN_OPENIDS`，值为管理员微信 openid。多个管理员用英文逗号分隔。

```text
ADMIN_OPENIDS=oAbc123xxx,oDef456yyy
```

每次修改 `cloudfunctions/` 目录里的代码后，都需要重新右键对应云函数并选择「上传并部署：云端安装依赖」。

## 初始化菜单

1. 编译并打开小程序。
2. 确认当前微信 openid 已加入 `ADMIN_OPENIDS`。
3. 进入首页，管理员会看到右上角齿轮入口。
4. 点击「初始化云菜单」。
5. 初始化后可继续在管理员页新增分类、新增菜品、删除空分类、删除菜品、上传菜品图片，图片会保存到云存储 `menu-images/`。

## 发布上线

1. 在微信开发者工具中确认可以真机预览，下单、查看订单、删除订单、上传菜品图都正常。
2. 点击右上角「上传」，填写版本号和项目备注。
3. 打开微信公众平台：小程序后台 → 管理 → 版本管理。
4. 将刚上传的体验版提交审核。
5. 审核通过后，在版本管理里点击「发布」。

## 上线前检查

- `miniprogram/config/cloud.js` 已换成正式云环境 ID。
- `orders` 和 `menuAdmin` 两个云函数已上传部署。
- 云数据库已创建 `categories`、`products`、`orders`。
- 菜单数据已经初始化。
- 云数据库权限不要开放 `orders` 给客户端直接读写。
- `menuAdmin` 云函数环境变量 `ADMIN_OPENIDS` 已配置管理员 openid。

## 常见问题

### 初始化后目录为空

请重新上传部署 `menuAdmin` 云函数。当前版本已经把 `categories` 和 `products` 的读取也改为云函数读取，避免小程序端被数据库权限挡住。

### 如何查看自己的 openid

先上传部署 `menuAdmin` 云函数，然后在微信开发者工具控制台执行：

```js
wx.cloud.callFunction({
  name: 'menuAdmin',
  data: { action: 'checkAdmin' }
}).then(console.log)
```

返回结果里的 `openid` 就是当前微信用户的 openid。把它填到 `menuAdmin` 云函数环境变量 `ADMIN_OPENIDS`。

### 管理员入口看不到，或新增/删除分类菜品不生效

确认 3 件事：

1. `menuAdmin` 云函数已经重新上传部署。
2. 当前微信用户的 openid 已加入云函数环境变量 `ADMIN_OPENIDS`。
3. 云数据库里已经存在 `categories` 集合，并且至少初始化过一次菜单。

删除分类前，需要先删除该分类下的菜品。系统会阻止直接删除仍然包含菜品的分类。
