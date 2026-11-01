---
id: source-layer
slug: /concepts/source-layer
title: 数据源与图层
description: "核对数据源加载、图层标识、CRS 预检和渲染图层声明。"
api: ["CirclePaint", "DatasetFormatPlugin", "Emap", "ExportedFormatFile", "ExportFormat", "ExportOptions", "FillPaint", "ITopologySource", "LayerLayout", "LayerPaint", "LayerSpecification", "LayerType", "LinePaint", "ReadySourceLoadPlan", "registerFormat", "ReplaceableTopologySource", "resolvePointStyle", "resolveStrokeStyle", "SourceLoadAnswers", "SourceLoadDiagnostic", "SourceLoadDiagnosticCode", "SourceLoadDraft", "SourceLoadError", "SourceLoadRequest", "SourceLoadRequirement", "SourceLoadSummary", "SourcePreflightResult", "TopologySource", "TopologySource.fromBytes", "TopologySource.fromUrl", "TopologySourceData", "TopologySourceFromBytesOptions", "TopologySourceInput", "TopologySourceOptions", "ImportResourceLimits", "ZipExtractionLimits"]
examples: ["getting-started/vector-file","getting-started/lines","getting-started/points","merge-layers"]
stability: stable
verifiedVersion: unreleased
---

import DocsDiagram from '@site/src/components/DocsDiagram';

# 数据源与图层

<span id="更多-source-选项" />
<span id="更多-source-与图层-id" />
<span id="更多图层样式" />

在 Emap 中，**数据源（`TopologySource`）**负责持有可编辑的拓扑几何与属性表，而**渲染图层（`LayerSpecification`）**则通过引用数据源来定义画面绘制规则。将“数据存储”与“视觉渲染”解耦后，同一份多边形几何可以同时被填充层、轮廓线层和标注层共享，无需在内存中复制多份坐标。

## 1. 分清三种核心 ID 标识

在调用地图 API 时，最容易混淆的是以下三种不同层级的标识符。请对照下表确认每个参数应当填入哪种 ID：

| 标识类型 | 典型示例 | 在哪些 API 参数中使用 |
| --- | --- | --- |
| **地图数据源 ID（Source ID）** | `'districts'` | `map.addSource(id, source)`、渲染图层的 `source`、`map.ops.*` 的 `source`、`FeatureRef.source` |
| **数据图层 ID / 名称（Data Layer ID）** | `'lots'` 或 `'districts'` | 渲染图层的 `source-layer`、`map.ops.*` 的 `target`、事件过滤器的 `layers`、`FeatureRef.layer` |
| **渲染图层 ID（Render Layer ID）** | `'district-fill'` | `map.addLayer({ id })`、`setPaintProperty(id, ...)`、`setLayerVisibility(id, ...)`、`removeLayer(id)` |

> **省略 `source-layer` 时的默认行为**：一个 `TopologySource` 内部可以包含多个数据图层（例如导入了含多张表的 GeoPackage 或多图层 TopoJSON）。如果在 `map.addLayer()` 时省略了 `source-layer` 字段，渲染图层会默认绑定该数据源内的**第一个数据图层**。对于多图层数据源，建议始终显式指定 `source-layer`，不要依赖文件内部图层的排列顺序。

## 2. 标准加载与渲染流程

当数据源格式与坐标系已知且可信时，从加载文件到渲染上屏只需四个步骤：

```ts
import { TopologySource } from '@mapseekai/emap';

const source = await TopologySource.fromUrl('districts', '/data/districts.geojson');
await map.addSource('districts', source);
map.addLayer({
  id: 'district-fill', type: 'fill', source: 'districts',
  paint: { 'fill-color': '#47b878', 'fill-opacity': 0.5 },
});
const bounds = source.getExtent();
if (bounds.hasBounds()) map.fitBounds(bounds, { padding: 24, duration: 0 });
```

注意：`await TopologySource.fromUrl(...)`（或 `fromBytes()`）仅完成了字节解析与拓扑构建，此时该 `source` 尚未与地图关联；必须先等待 `await map.addSource('districts', source)` 注册完成，后续的 `map.addLayer()` 才能成功解析到 `'districts'` 数据源。关于支持的格式与文件大小预算，请参见[导入与导出数据格式](../data/formats.md)及[从文件选择器导入数据](../recipes/file-upload.md)。

## 3. 导入前执行 CRS 预检（Preflight）

<span id="加载时确认-crs" />

面对用户上传的本地文件（如可能缺失 `.prj` 投影文件的 Shapefile），直接调用 `addSource()` 可能因缺少 CRS 而失败。此时应使用 `map.preflightSource()` 替代 `addSource()`，在正式写入地图前完成坐标系检查与交互式补全：

<DocsDiagram name="source-preflight" language="zh" alt="预检返回 ready 时确认注册；needs-input 时向用户询问源坐标系并重新预检；rejected 时展示诊断并停止导入。" />

```ts
const result = await map.preflightSource({ id: 'districts', source });
if (result.status === 'ready') {
  await map.confirmSource(result.plan);
} else if (result.status === 'needs-input') {
  console.log(result.draft, result.requirements);
} else {
  console.error(result.diagnostics);
}
```

预检状态机的三条分支契约：

1. **`status === 'ready'`**：数据与坐标系完备。调用 `await map.confirmSource(result.plan)` 即可完成数据源注册（注意：`plan` 与当前地图实例绑定且**只能消费一次**；若在确认前地图状态或数据源发生了改变，该 `plan` 会变为 `stale`，需重新预检）。
2. **`status === 'needs-input'`**：数据缺少源 CRS 定义。此时数据尚未注册到地图，应用可读取 `result.requirements` 弹窗询问用户，拿到用户确认的 `sourceCrs` 后传入 `result.draft` 与 `{ sourceCrs }` 再次调用 `preflightSource()`。
3. **`status === 'rejected'`**：发生数据源 ID 冲突（`source-id-conflict`）或数据违反导入契约，根据 `result.diagnostics` 提示用户。切勿对已经注册成功的 Source ID 重复执行预检。

## 4. 数据替换、图层更新与清理

- **使用 `setData()` 替换外部数据**：调用 `await source.setData(...)` 会用新导入的数据整体替换该数据源的内容。由于这属于外部数据集重置而非单步可逆编辑，替换后原有的要素索引（`FeatureRef.id`）不再有效，应用需通过 `source.getLayers()` 重新核对图层结构并刷新外部持有的要素引用。
- **区分移除渲染层与移除数据源**：不再需要某种视觉样式时调用 `map.removeLayer(renderLayerId)`；不再需要整份底层数据时调用 `map.removeSource(sourceId)`。需要将内存中的最新拓扑数据保存为文件时，请调用 `await source.export()` 获取 `Blob`。

## API

<span id="核心方法" />
<span id="layerspecification" />
<span id="导出与格式插件" />

- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)
- [LayerSpecification](/mapseekai/emap/api/types/emap.LayerSpecification.html)
- [ExportOptions](/mapseekai/emap/api/interfaces/emap.ExportOptions.html)

## 可运行示例

- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)
- [线图层](/mapseekai/emap/examples/getting-started/lines/)
- [点图层](/mapseekai/emap/examples/getting-started/points/)
- [合并图层](/mapseekai/emap/examples/merge-layers/)

## 实现依据

- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
- [`src/engine/map/source-loading.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/source-loading.ts)
- [`src/engine/map/layer-registry.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/layer-registry.ts)
