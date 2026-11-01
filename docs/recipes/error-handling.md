---
id: error-handling
slug: /recipes/error-handling
title: 错误处理
description: "处理操作结果和数据加载诊断，并在失败时回滚事务。"
api: ["Emap", "OpResult", "OpError"]
examples: ["check-geometry", "duckdb-buffer", "duckdb-query"]
stability: stable
verifiedVersion: unreleased
---

# 处理失败与恢复

Emap 通过三种明确的机制报告异常与诊断信息：**Promise 拒绝（异常抛出）**、**结构化操作结果（`OpResult`）**和**运行时诊断事件（`error` / `validationfailed`）**。在业务代码中分别正确处理这三类反馈，才能避免出现“界面提示操作成功、但底层数据并未提交”或“未关闭事务锁死后续编辑”的问题。

## 1. 按 `error.kind` 分支处理 `OpResult`

`map.ops.*`、`map.attributes.*` 以及事务提交（`transaction.commit()`）均返回结构化的 `OpResult` 对象，其形状为 `{ ok: true, value }` 或 `{ ok: false, error }`。

请始终先判断 `result.ok`，并在失败时根据稳定的 `result.error.kind` 判别分支，不要依赖对英文错误文本的正则匹配来编写业务逻辑：

```ts
const result = await map.ops.checkGeometry({ source: 'main' });
if (result.ok) {
  console.log(result.value);
} else {
  switch (result.error.kind) {
    case 'not-found':
      console.error(`Missing ${result.error.what}: ${result.error.id}`);
      break;
    case 'validation':
      console.error(`${result.error.field}: ${result.error.reason}`);
      break;
    default:
      console.error(result.error);
  }
}
```

注意：对于 `checkGeometry` 等检查类操作，`result.ok === true` 仅代表“检查流程本身顺利跑完”，你仍需读取 `result.value` 中的诊断报告来判断要素是否存在自交等几何缺陷。

## 2. 捕获 Promise 异常与订阅诊断事件

对于地图创建（`Emap.create()`）、文件字节解析（`TopologySource.fromBytes()`）、静态 Worker/WASM 加载以及独立 DuckDB 工具函数，底层遇到不可恢复故障时会直接 reject Promise：

- **调用侧必须使用 `try/catch`**：在 `await` 调用外层包裹 `try/catch`，一旦解析或加载失败，保留用户已选择的文件或表单输入，允许用户修正参数后重试。
- **避免重复弹窗**：地图的 `map.on('error', ...)` 事件适合用于集中上报日志或展示全局非阻塞诊断提示，但它不会吞掉调用侧的 Promise 异常。设计 UI 提示时请注意去重，避免同一次失败在 `catch` 块和全局 `error` 监听器中弹出两次错误提示。

## 3. 常见失败状态的恢复策略

遇到不同类别的错误时，推荐按以下策略引导用户恢复：

| 错误或状态类型 | 推荐的界面与业务恢复动作 |
| --- | --- |
| 参数校验失败（`validation`）或目标缺失（`not-found`） | 保留当前编辑弹窗，高亮提示用户修正缺失的字段名、图层名或无效数值 |
| 数据源预检缺少坐标系（`needs-input`） | 展示预检要求（`requirements`），让用户选择正确的源 CRS 后重新调用预检 |
| 后台计算结果过期（`stale-operation`） | 丢弃已过期的后台结果，提示数据在计算期间已变更，并基于最新版本号重新发起操作 |
| 用户主动取消（`AbortSignal`） | 等待后台任务完成临时表或文件句柄清理，随后恢复界面按钮为可点击状态 |
| 地图实例已卸载（`host-removed`） | 静默终止当前组件的后续状态更新，不再操作已销毁的 DOM 或地图接口 |
| 静态资源加载失败（Worker / WASM） | 检查部署路径、`baseUrl`、MIME 类型与网络连接后提供重试入口 |

> **写操作重试原则**：切勿对修改数据的操作做无脑自动重试。重试前必须先确认上一次调用是否已经部分提交，以及目标数据源的版本号是否已发生变化。

## 4. 确保失败时安全回滚事务

<span id="回滚事务" />

在使用 `map.beginTransaction()` 组合多步修改时，任何一步返回 `!result.ok` 或抛出异常，都必须回滚仍处于打开状态的事务：

- 在分支失败处显式调用 `transaction.rollback()`。
- 在 `catch` 块中先检查 `if (transaction.isOpen) transaction.rollback()`，防止对已关闭的事务重复调用回滚。
- `await transaction.commit(label)` 本身也可能失败，必须检查其返回的 `OpResult.ok`，不能把走到了 `finally` 块当作事务已提交成功。

完整的 `OpError` 字段清单、数据源预检诊断码与 DuckDB 错误分类请查阅[错误参考](../reference/errors.md)。

## API

<span id="核心方法" />
<span id="opresult-结构" />
<span id="更多错误详情" />
<span id="source-加载错误事件" />

- `Emap`
- `OpResult`
- `OpError`

## 可运行示例

- [几何检查](/mapseekai/emap/examples/check-geometry/)
- [DuckDB 缓冲区](/mapseekai/emap/examples/duckdb-buffer/)
- [DuckDB 查询](/mapseekai/emap/examples/duckdb-query/)

## 实现依据

- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
- [`src/engine/map/source-loading.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/source-loading.ts)
- [`src/domain/edit/transaction.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/edit/transaction.ts)
