---
id: events
slug: /reference/events
title: 事件参考
description: "查阅地图事件名称、载荷字段和要素事件过滤约定。"
api: ["Emap", "EmapEventMap", "CameraEvent", "LayerChangeEvent", "EventListener", "FeatureEvent", "FeatureEventFilter", "PointerMoveEvent"]
examples: ["feature-selection","web-worker"]
stability: stable
verifiedVersion: unreleased
---

# 事件参考

<span id="核心事件" />
<span id="更多地图状态事件" />
<span id="要素事件过滤" />

`EmapEventMap` 定义了可通过 `map.on()`、`map.once()` 和 `map.off()` 订阅的地图级事件及其载荷结构（每个事件回调还会收到事件名称 `type`）。请注意：**独立数据源（`TopologySource`）、交互 Handler 或共享 Worker 运行时内部自有的状态通知，不会自动冒泡为 `map.on()` 的同名事件**。

## 1. 相机与视口尺寸事件

<span id="相机-payload" />

| 事件名称 | 载荷类型 | 触发时机与字段说明 |
| --- | --- | --- |
| `movestart`、`moveend` | `CameraEvent` | 相机平移或动画开始、结束时触发，包含完整的 `center`、`zoom` 与 `originalEvent` |
| `zoomstart`、`zoom`、`zoomend` | `CameraEvent` | 缩放开始、进行中、结束时触发 |
| `move` | `Partial<CameraEvent>` | 视图连续移动期间高频触发；注意部分相机字段可能省略，请勿当作必填字段直接解构 |
| `resize` | 无附加载荷 | 地图画布容器尺寸更新后触发 |
| `crschange` | 无附加载荷 | 地图项目坐标系（CRS）变更后触发，可通过 `map.getCRS()` 读取新坐标系 |

`CameraEvent` 关键字段契约：

- **`center`**：当前项目 CRS 下的中心坐标（注意：不是在所有投影下都代表经纬度）。
- **`zoom`**：通用相机事件中的 `zoom` 计算公式为 `log2(scale)`，并不等同于 WebMercator 瓦片地图中的地理缩放级别。
- **`originalEvent`**：由鼠标或触摸手势触发时为对应的原生 DOM 事件；由代码调用（如 `jumpTo`、`fitBounds`）触发时为 `null`。

## 2. 数据、图层、选择与编辑历史事件

| 事件名称 | 载荷字段与类型 | 触发原因与使用注意事项 |
| --- | --- | --- |
| `data` | `{ sourceId?, reason?, origin? }` | 当数据加载（`load`）、编辑（`edit`）、替换（`replace`）或重投影（`reproject`）时触发（外部替换时 `origin` 可为 `'external'`）。注意：`data` 仅表示内存数据变化，不代表文件已持久化保存 |
| `layerchange` | `LayerChangeEvent`（含 `reason`、`layerId?`、`layers`） | 当渲染图层新增（`add`）、移除（`remove`）、显隐切换（`visibility`）、有效状态变化（`effective`）或过滤条件更新（`filter`）时触发 |
| `editmodechange` | `{ mode }` | 当前激活的交互编辑模式切换时触发 |
| `historychange` | `Partial<HistoryStateSnapshot>` | 撤销/重做历史栈发生变化时触发；载荷可能不含完整快照，建议在回调中直接调用 `map.canUndo()` 与 `map.canRedo()` |
| `selectionchange` | `{ selected, added, removed }` | 选择集变化时触发，三个字段均为 `FeatureRef[]` 数组 |

## 3. 指针移动与要素命中事件

<span id="更多指针与要素事件" />
<span id="指针与要素-payload" />

| 事件名称 | 载荷类型 | 触发条件 |
| --- | --- | --- |
| `mousemove` | `PointerMoveEvent` | 鼠标指针在画布内移动时触发（即使指针下方没有任何要素也会触发） |
| `feature:click` | `FeatureEvent` | 鼠标点击命中可见矢量要素时触发 |
| `feature:hover` | `FeatureEvent` | 鼠标指针在可见矢量要素上方移动时持续触发 |
| `feature:enter` | `FeatureEvent` | 鼠标指针首次移入某个新命中要素时触发 |
| `feature:leave` | `FeatureEvent` | 鼠标指针离开当前命中的要素时触发 |

`FeatureEvent` 与 `FeatureEventFilter` 契约：

- **载荷字段**：包含命中的要素引用 `ref`（`{ source, layer, id }`）、相对于 Canvas 左上角的本地像素坐标 `point`、当前项目 CRS 下的地图坐标 `lngLat`（注意字段名虽为 `lngLat`，但其数值始终遵循当前地图 CRS），以及原始鼠标事件 `originalEvent`。
- **过滤器（`FeatureEventFilter`）**：订阅 `feature:*` 事件时可作为第二个参数传入 `{ source, layers }`。其中 `source` 是地图数据源 ID，**`layers` 是数据源内部的数据图层 ID 数组（切勿传入渲染图层 ID）**。
- **性能建议**：`PointerMoveEvent` 的要素命中字段在空白处为空；如果业务只需在悬停进入/离开要素时切换高亮或气泡，请优先监听 `feature:enter` 与 `feature:leave`，避免在高频 `mousemove` / `feature:hover` 中执行重度查询。

## 4. 运行时诊断与验证事件

| 事件名称 | 载荷字段 | 含义与处理边界 |
| --- | --- | --- |
| `error` | `{ error, layerId?, filterExpression?, valueType? }` | 运行时渲染、资源加载或样式表达式求值异常诊断 |
| `warning` | `{ layerId, buckets?, error? }` | 图层样式解析或分级分桶（Buckets）降级警告 |
| `validationfailed` | `{ results, label }` | 编辑或事务提交后（`after-commit`），拓扑验证器检测到自交等几何问题时发出的报告 |

注意：这些事件属于诊断通知通道，**不会替代 API 调用本身的 Promise 拒绝或 `OpResult.ok` 检查**。`validationfailed` 触发时修改已经提交入栈，它不会自动回滚数据；应用可根据报告中的 `ref` 定位问题。验证是异步的，撤销前应确认目标提交仍是最新历史项。

## 5. 后台 Worker 作业通知事件

当 Mapshaper 数据操作路由到后台 Web Worker 执行时，地图还会通过通用事件重载发出以下两个生命周期通知：

- **`workerjobstart`**：包含 `{ id, cmd, label, datasetVertexCount }`，表示后台作业已派发。
- **`workerjobend`**：包含 `{ id, ok, durationMs, errorMessage? }`，表示后台 Worker 计算往返结束。

这两个事件不在 `EmapEventMap` 的强类型键表中，主要用于展示后台任务进度条或采集耗时指标。注意：`workerjobend` 中的 `ok: true` 仅代表 Worker 计算和传输完成，后续主线程在进行数据源版本号比对与提交时仍可能因数据过期而返回 `stale-operation`，因此业务层判断操作是否最终生效仍须以 `await map.ops.*` 返回的 `OpResult` 为准。

## 6. 监听器生命周期管理

请始终使用同一个函数引用配对调用 `map.on(type, fn)` 与 `map.off(type, fn)`。`map.once(type, fn)` 会在事件首次触发后自动移除监听；但如果组件可能在事件触发前就提前卸载，请使用显式的 `on` / `off` 并在卸载钩子中清理（详见[订阅地图事件](../guides/events.md)）。

## API

<span id="核心方法" />
<span id="状态-payload" />

- [src.EmapEventMap](/mapseekai/emap/api/interfaces/emap.EmapEventMap.html)
- [src.EventListener](/mapseekai/emap/api/types/emap.EventListener.html)
- [src.FeatureEvent](/mapseekai/emap/api/interfaces/emap.FeatureEvent.html)

## 可运行示例

- [feature-selection](/mapseekai/emap/examples/feature-selection/)
- [web-worker](/mapseekai/emap/examples/web-worker/)

## 实现依据

- [`src/engine/core/event-map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/event-map.ts)
- [`src/engine/core/feature-event-dispatcher.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/feature-event-dispatcher.ts)
- [`src/engine/core/pointer-event-dispatcher.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/pointer-event-dispatcher.ts)
