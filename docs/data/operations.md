---
id: operations
slug: /data/operations
title: 数据操作
description: "通过 map.ops 执行可撤销的数据处理，并处理取消和失败结果。"
api: ["AffineLayerOptions", "ApplyExpressionOptions", "BufferOptions", "CheckGeometryOptions", "CleanOptions", "ClipEraseOptions", "DataFillOptions", "DissolveOptions", "DivideOptions", "DragSessionOptions", "DropLayerOptions", "Emap", "ExplodeOptions", "ExportSnapshotOptions", "ExpressionEvaluationPolicy", "FeatureAffineSession", "FeatureRef", "FeatureTranslateSession", "FilterFieldsOptions", "FilterGeomOptions", "FilterIslandsOptions", "FilterOptions", "FilterSliversOptions", "GeometryCheckReport", "HighlightStyle", "InnerlinesOptions", "IntersectionPointsLayerOptions", "JoinTableData", "JoinTableOptions", "LinesOptions", "LoadSnapshotOptions", "MapOptions", "MergeLayersOptions", "MosaicOptions", "PointsMode", "PointsOptions", "PolygonsOptions", "ProjectLayerExport", "ProjectLayerOutputOptions", "ProjectOptions", "QueriedFeature", "QueryFeaturesOptions", "RebuildTopologyOptions", "RenameFieldsOptions", "RenameLayerOptions", "SimplifyMethod", "SimplifyOptions", "SnapOptions", "SortFeaturesOptions", "SplitCutter", "SplitFeatureHandler", "SplitFeatureOptions", "SplitLayerOptions", "SplitSelectedOptions", "SplitSelectedResult", "UnionOptions", "UniqueFeaturesOptions", "OpResult", "OpError", "ClassifyFeaturesOptions"]
examples: ["buffer","clip","erase","dissolve","filter-features","merge-selected","simplify","split-features","union"]
stability: stable
verifiedVersion: unreleased
---

# 执行数据操作

`map.ops` 是 Emap 面向地图工作区的空间分析与批量数据处理入口（底层基于 Mapshaper 拓扑算法编排）。调用时只需指定目标数据源（`source`）与数据图层（`target`），等待异步操作完成，并根据返回的 `OpResult` 更新界面或提示错误。

## 1. 调用操作并检查 `OpResult`

<span id="更多调用和错误处理" />

以下示例对 `main` 数据源中的 `roads` 数据图层生成半径为 `250` 的缓冲区（执行距离类操作前，请先确认当前坐标系与操作后端对距离单位的定义）：

```ts
const result = await map.ops.bufferLayer({ source: 'main', target: 'roads', radius: 250 });
if (result.ok) {
  console.log('Buffer completed');
} else {
  console.error(result.error.kind, result.error);
}
```

处理返回结果时请注意：

- **始终检查 `result.ok`**：当 `result.ok === true` 时，`result.value` 的具体类型取决于所调用的操作（许多就地修改图层的方法其 `value` 为 `undefined`，不应假定每次成功都会返回一个新的 `TopologySource`）。
- **检查类操作需读取报告内容**：调用 `checkGeometry()` 时，外层 `ok: true` 表示检查顺利执行完毕；还需查看报告中的 `result.value.ok`、`intersectionCount` 和 `intersections` 来判断是否存在相交问题。

## 2. 常用空间与属性操作分类

<span id="更多操作" />
<span id="操作参数" />
<span id="选择和编辑" />
<span id="更多常用操作" />
<span id="更多选择操作和历史" />

你可以按业务目的从下表中选择对应的 `map.ops` 方法（完整参数与返回签名见页底 API 参考）：

| 处理目的 | 代表方法 | 参数与使用要点 |
| --- | --- | --- |
| 几何简化、拓扑清理与检查 | `simplifyLayer`、`cleanLayer`、`checkGeometry` | `simplifyLayer` 会改变数据集当前的简化状态；`cleanLayer` 可清理缝隙与重叠 |
| 空间裁剪、擦除与叠加 | `clipLayer`、`eraseLayer`、`unionLayers` | 需确保参数中的 `mask`（掩膜图层）等引用在当前操作上下文中可解析 |
| 要素融合、图层合并与拆分 | `dissolveLayer`、`mergeLayers`、`splitLayer` | 改变要素个数与排列顺序，操作后需刷新外部保存的要素索引 |
| 字段筛选、表连接与统计分级 | `applyExpression`、`filterFields`、`joinTable`、`classifyFeatures` | 表达式计算受 `expressionPolicy` 约束；`classifyFeatures` 可配合 `styleSource: 'mapshaper'` 着色 |
| 坐标系转换导出 | `projectLayer` | 将指定图层转换到目标 CRS 并返回导出文件对象，不改变当前地图画布的 CRS |
| 拓扑关系重建 | `rebuildTopology` | 在导入外部非拓扑几何或批量变换后重新构建共享弧段与节点交点 |

所有方法中的 `target` 均指数据源内部的**数据图层名称或 ID**，而非渲染图层 ID。

## 3. 区分工作区就地修改与独立输出

不同入口对当前地图状态的影响方式不同：

1. **多数 `map.ops` 方法就地更新工作区**：它们直接更新目标数据源的几何或属性版本、触发重绘，并自动推入地图的撤销/重做历史栈。
2. **`projectLayer()` 生成导出副本**：它返回转换坐标系后的文件导出结果（`ProjectLayerExport`），不会将当前地图画布切换到目标 CRS（若要转换整张地图的坐标系，请调用 `await map.reproject(targetCrs)`）。
3. **独立 DuckDB 工具返回新 Dataset**：`@mapseekai/emap/duckdb` 下的独立分析函数返回新的数据集对象，由宿主应用决定如何注册到地图及如何记录历史，详见[使用 DuckDB 进行空间处理](./duckdb.md)。

由于融合、裁剪、拆分或筛选操作会改变要素总数与排列顺序，切勿将操作前的 `FeatureRef.id`（数组索引）当作永久不变的 ID；操作完成后请重新读取选择集或按业务主键查询。

## 4. 支持取消（AbortSignal）与并发过期保护

当操作耗时较长（尤其是开启了 Worker 路由的大数据操作）时，你可以通过 `map.ops.withSignal(signal)` 传入 `AbortController.signal`：

- 用户点击“取消”按钮调用 `controller.abort()` 后，调用方仍应 `await` 该操作结束并妥善处理取消结果。
- **并发版本保护（`stale-operation`）**：异步操作在计算完成准备写回主线程前，会校验目标数据源的版本号。如果计算期间数据源已被其他编辑修改或替换，提交会被拒绝并返回 `error.kind === 'stale-operation'`，防止旧结果覆盖新状态；如果地图实例在计算期间已被销毁，则返回 `'host-removed'`。

## 5. 事务组合、表达式策略与 Worker 卸载

- **多步合成一次撤销**：需要把多个 `map.ops` 调用（例如先 `cleanLayer` 再 `simplifyLayer`）合并为一个可回滚的原子动作时，请使用 `map.beginTransaction()`，详见[编辑几何与管理事务](../guides/editing.md)。
- **表达式安全策略**：涉及 JavaScript 表达式的操作默认禁用（返回 `'expression-disabled'`），仅在受信任代码下配置 `expressionPolicy: 'trusted'`，详见[读取和修改属性](./attributes.md)。
- **后台线程卸载**：配置 `useWorker: 'auto'` 可将大数据量操作自动路由到 Web Worker，静态资源部署要求见[配置 Web Worker](../guides/worker.md)。

## API

<span id="核心方法" />
<span id="layer-定位和输出" />
<span id="overlay拓扑和变换" />
<span id="要素几何" />
<span id="layer属性和拓扑" />
<span id="worker-路由" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [OpResult](/mapseekai/emap/api/types/emap.OpResult.html)
- [OpError](/mapseekai/emap/api/types/emap.OpError.html)
- [BufferOptions](/mapseekai/emap/api/interfaces/emap.BufferOptions.html)
- [SimplifyOptions](/mapseekai/emap/api/interfaces/emap.SimplifyOptions.html)
- [ProjectOptions](/mapseekai/emap/api/interfaces/emap.ProjectOptions.html)
- [ClassifyFeaturesOptions](/mapseekai/emap/api/interfaces/emap.ClassifyFeaturesOptions.html)

## 可运行示例

- [Buffer](/mapseekai/emap/examples/buffer/)
- [裁剪](/mapseekai/emap/examples/clip/)
- [擦除](/mapseekai/emap/examples/erase/)
- [Dissolve](/mapseekai/emap/examples/dissolve/)
- [筛选要素](/mapseekai/emap/examples/filter-features/)
- [合并选中要素](/mapseekai/emap/examples/merge-selected/)
- [简化](/mapseekai/emap/examples/simplify/)
- [拆分要素](/mapseekai/emap/examples/split-features/)
- [Union](/mapseekai/emap/examples/union/)

## 实现依据

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
- [`src/engine/map/ops/project.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/ops/project.ts)
