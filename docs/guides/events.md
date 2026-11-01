---
id: events
slug: /guides/events
title: 事件
description: "订阅地图与要素事件，管理过滤器和监听器生命周期。"
api: ["CameraEvent", "Emap", "EmapEventMap", "EventDispatcher", "EventListener", "FeatureEvent", "FeatureEventFilter"]
examples: ["feature-attributes","interaction-handlers"]
stability: stable
verifiedVersion: unreleased
---

# 订阅地图事件

<span id="更多订阅方式" />
<span id="事件载荷" />
<span id="其他地图运行时事件" />
<span id="高频事件" />

Emap 通过事件机制向宿主应用通知相机移动、要素命中、选择集变化、编辑历史更新以及后台任务状态。在前端组件中使用事件时，核心原则是**按需选择事件粒度，并将监听器的解除绑定到组件的卸载生命周期**。

## 1. 注册与取消事件监听

使用 `map.on(type, listener)` 注册持续监听，使用 `map.off(type, listener)` 取消监听；如果只需要等待下一次事件触发一次，可以使用 `map.once(type, listener)`：

```ts
const onMoveEnd = () => {
  console.log(map.getCenter(), map.getTransform().mx);
};
map.on('moveend', onMoveEnd);

// 在组件卸载时执行。
map.off('moveend', onMoveEnd);
```

注意：调用 `map.off()` 时必须传入与 `map.on()` **完全相同的函数引用**。如果某个一次性监听器在触发前可能需要随组件卸载而提前取消，请使用显式的 `on` / `off` 配对，不要假定把原始回调传给 `off()` 就能移除 `once()` 内部包装的监听器。

## 2. 按业务场景选择事件

下表汇总了最常用的地图事件类别（完整的事件列表与载荷字段定义请查阅[事件参考](../reference/events.md)）：

| 业务场景 | 推荐监听事件 | 使用建议 |
| --- | --- | --- |
| 数据源加载、编辑、替换或坐标系变更 | `data`、`crschange` | 用于刷新图层树或状态栏；注意 `data` 是状态变更通知，不能代替业务保存接口的成功确认 |
| 相机平移与缩放 | `move`、`moveend`、`zoom` | 高频 UI 跟随用 `move`，保存视图状态或发起重查询用 `moveend` |
| 要素选中状态变化 | `selectionchange` | 根据载荷中的 `selected`、`added`、`removed` 同步右侧属性面板或工具栏按钮 |
| 编辑模式切换与历史栈更新 | `editmodechange`、`historychange` | 更新工具栏激活态，并在 `historychange` 时调用 `canUndo()` / `canRedo()` |
| 鼠标点击或悬停命中要素 | `feature:click`、`feature:enter`、`feature:leave` | 支持传入数据源与数据图层过滤器，精确响应目标图层上的交互 |
| 运行时报错与后台 Worker 作业 | `error`、`workerjobstart`、`workerjobend` | 用于全局日志记录或展示后台加载进度条 |

## 3. 使用过滤器监听特定图层的要素事件

<span id="要素事件过滤" />

当画布上叠加了多个图层时，你可以在订阅 `feature:*` 事件时传入 `FeatureEventFilter`，只响应指定数据源和数据图层上的要素命中。

下面示例假设地图已注册 `parcels` 数据源及其内部的 `lots` 数据图层，当用户点击该图层上的要素时将其选中：

```ts
map.on('feature:click', { source: 'parcels', layers: ['lots'] }, (event) => {
  map.select([event.ref]);
});
```

在使用要素事件时，请注意以下三个细节：

1. **过滤器中的 `layers` 是数据图层 ID**：请填写数据源内部的数据图层名称（如 `'lots'`），不要填写 `addLayer()` 时的渲染图层 ID（如 `'parcel-fill'`）。
2. **坐标字段语义**：要素事件载荷同时提供画布本地像素坐标 `point` 和数据坐标 `lngLat`（尽管字段名为 `lngLat`，其数值始终采用当前项目的 CRS 坐标）。
3. **合理控制悬停开销**：`mousemove` 在画布空白处移动也会触发；`feature:hover` 在指针位于要素上方移动时持续触发。如果你只需要在鼠标移入或移出要素时切换高亮或 Tooltip，请优先使用 `feature:enter` 和 `feature:leave`，避免在每次像素移动时重复重绘外部组件。

## 4. 正确区分诊断事件与操作返回值

地图发出的 `error`、`workerjobstart` 和 `workerjobend` 事件属于通知与诊断通道，**不能替代异步方法本身的返回值检查**：

- 调用可能抛出异常的初始化或导入方法时，调用方仍需使用 `try/catch` 捕获 Promise 拒绝。
- 调用 `map.ops.*` 等返回 `OpResult` 的操作时，仍需根据 `result.ok` 判断修改是否真正提交成功（`workerjobend` 仅代表后台线程计算往返结束，最终能否通过主线程版本检查并写入数据集以 `OpResult` 为准）。

## 可运行示例

- [要素属性](/mapseekai/emap/examples/feature-attributes/)
- [交互 Handler](/mapseekai/emap/examples/interaction-handlers/)

## 实现依据

<span id="核心方法" />
<span id="相机" />
<span id="生命周期数据与图层" />
<span id="编辑诊断与选择" />
<span id="指针与要素" />

- [`src/engine/core/events.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/events.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
