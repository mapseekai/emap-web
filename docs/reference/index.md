---
id: index
slug: /reference/
title: 参考手册
description: "查阅 Emap API 签名、事件载荷、错误类型与兼容性要求。"
api: []
examples: []
stability: stable
verifiedVersion: unreleased
---

# 参考手册总览

参考手册面向正在编写或调试 Emap 集成代码的开发者，提供精确的事件载荷表、结构化错误码、运行环境与 Peer 依赖矩阵以及高频问题速查。如果你需要按步骤完成某项业务功能，请前往[操作指南总览](../guides/index.md)。

| 我要核对的契约内容 | 参考页面入口 | 核心涵盖内容 |
| --- | --- | --- |
| 地图事件名称、载荷字段与要素过滤约定 | [事件参考](./events.md) | `EmapEventMap`、相机/图层/历史事件、指针与要素命中载荷、Worker 通知 |
| 操作结果、数据源预检诊断码与验证器报告 | [错误参考](./errors.md) | `OpResult` / `OpError`、`SourceLoadDiagnostic`、输入大小上限、`DuckDbOperationError` |
| 浏览器版本、渲染后端、Peer 依赖与静态资源 | [环境与兼容性](./compatibility.md) | 浏览器与 Node.js 版本范围、三大渲染后端、Peer 依赖版本、Worker / WASM 部署清单 |
| 按现象快速定位常见集成故障 | [常见问题（FAQ）](./faq.md) | 画布空白、数据不显示、坐标偏移、无法编辑、属性不刷新、Worker 404 等排错步骤 |
| 全部公开类、接口、方法签名与返回类型 | [生成的 API 文档](/mapseekai/emap/api/) | 从引擎 TypeScript 源码自动生成的完整 TypeDoc 参考 |

## 如何阅读 API 签名与返回类型

<span id="api-签名" />

在查阅 API 文档与参考表格时，请留意以下四项通用契约：

1. **区分同步返回值、`Promise` 与 `OpResult`**：异步方法（返回 `Promise<OpResult<T>>`）的 Promise 正常 resolve 并不代表业务操作一定成功，调用方仍须检查 `result.ok === true`；同时，许多就地修改图层的操作在成功时 `result.value` 为 `undefined`，请勿假定所有成功操作都会返回新对象。
2. **显式处理可选字段（Optional）**：事件载荷（如高频 `move` 或 `historychange`）中的部分字段声明为可选，消费侧代码应先判空或调用地图方法读取最新状态。
3. **要素 ID 与图层 ID 约定**：`FeatureRef.id` 是要素在数据图层内的运行时数组索引（从 `0` 开始）；凡是参数说明标注为“数据图层（Data Layer）”的位置，均应传入数据源内的表/图层名，而非 `addLayer()` 的渲染图层 ID。
4. **坐标单位约定**：除非方法明确说明使用屏幕像素（如 `panBy`、`project` 返回值或事件中的 `point`），否则几何坐标、边界框与相机 `center` 均采用当前地图的项目 CRS 坐标（详见[地图与数据模型](../concepts/overview.md)）。

## 文档版本与源码依据

本手册中的手写参考页描述当前引擎源码的行为契约，并在每页底部列出了对应的引擎源码路径（`src/...`）；[生成的 API 文档](/mapseekai/emap/api/)提供完整的 TypeScript 类型签名，[在线示例库](/mapseekai/emap/examples/)则提供可直观验证的浏览器运行表现。在升级项目中安装的 `@mapseekai/emap` 版本时，请同时核对该版本 `package.json` 中的导出子路径与静态资源约定。

## 实现依据

<span id="事件与错误" />
<span id="环境与排错" />

- [`src/index.ts`](https://github.com/mapseekai/emap/blob/master/src/index.ts)
- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
