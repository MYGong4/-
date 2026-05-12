# 订单完成通知配置

当前模板：

- 模板 ID：`A9FC2Y02LO63x3rA7lDsfHRc4-8MaEQTbGPnCwyu4YA`
- 标题：订单完成通知
- 场景：订单完成

字段映射：

- `character_string2`：订单号
- `time4`：下单时间
- `date7`：完成日期
- `thing9`：商品名称
- `thing5`：温馨提示

## 使用流程

1. 用户在结算页点击提交订单时，小程序会调用 `wx.requestSubscribeMessage` 请求“订单完成通知”授权。
2. 管理员进入管理页，在“最近订单”里点击“完成并通知”。
3. `orders` 云函数会把订单状态更新为 `completed`，并调用 `cloud.openapi.subscribeMessage.send` 发送订阅消息。
4. 已完成订单会显示“再次通知”，管理员可以手动补发一次完成通知，不会重复修改订单状态。

## 部署检查

1. 上传并部署 `cloudfunctions/orders` 云函数。
2. 给 `orders` 云函数配置环境变量 `ADMIN_OPENIDS`，值和 `menuAdmin` 云函数保持一致，多个 openid 用英文逗号分隔。
3. 如需以后更换模板，可同时更新：
   - `miniprogram/config/subscription.js`
   - `cloudfunctions/orders` 云函数环境变量 `ORDER_COMPLETED_TEMPLATE_ID`

如果用户拒绝订阅授权，订单仍会正常创建；管理员完成订单时只会标记完成，消息发送会被微信侧拒绝。
