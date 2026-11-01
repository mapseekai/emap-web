---
id: formats
slug: /data/formats
title: 数据格式
description: "选择矢量数据格式，导入导出数据并注册格式插件。"
api: ["buildGeoMetadata", "crsStringToProjjson", "DatasetFormatPlugin", "decodeWkb", "detectGeometryColumn", "Emap", "ExportedFormatFile", "exportGeoArrow", "ExportGeoArrowOptions", "exportGeoParquet", "ExportGeoParquetOptions", "fromArrowTable", "FromArrowTableOptions", "GeoColumnMetadata", "GeoEncoding", "GeoMetadata", "GeometryColumnInfo", "importGeoArrow", "ImportGeoArrowOptions", "importGeoParquet", "ImportGeoParquetOptions", "initParquetWasm", "InitParquetWasmOptions", "ParquetWasmModule", "ParquetWasmTable", "parseGeoMetadata", "projjsonToCrsString", "registerArrowFormats", "registerFormat", "setArrowTable", "setParquetWasm", "toArrowTable", "toArrowTableFromSource", "ToArrowTableOptions", "TopologySource.export", "TopologySource.fromBytes", "TopologySource.fromUrl", "WkbGeometry", "WkbWriter", "TopologySource", "ExportOptions", "TopologySource.setData"]
examples: ["export-formats","getting-started/vector-file","flatgeobuf-viewer","geoparquet-viewer"]
stability: stable
verifiedVersion: unreleased
---

# 导入与导出数据格式

Emap 的数据格式体系分为三类：**内置矢量格式**、**可选格式插件（Arrow / GeoParquet / GeoPackage / 自定义 Codec）**和**按窗口读取的栅格服务（GeoTIFF）**。在选择导入导出方式时，请同时确认文件扩展名、坐标系（CRS）、内存预算以及目标格式对字段和几何类型的约束。

## 1. 数据格式支持矩阵

| 数据格式 | 接入入口 | 能力与使用边界 |
| --- | --- | --- |
| GeoJSON、TopoJSON | `TopologySource` 内置支持 | 开箱即用，直接构建共享弧段拓扑 |
| Shapefile ZIP、KML | `TopologySource` 内置支持 | Shapefile 需包含完整的几何与属性配套文件，受 `zipLimits` 解压预算保护 |
| MSX | `TopologySource` 内置支持 | Emap 矢量工程快照格式，保留拓扑与图层状态，但不嵌入本地 GeoTIFF 像素本体 |
| Arrow、GeoArrow、GeoParquet | `@mapseekai/emap/arrow` 插件 | 需安装 `apache-arrow`（GeoParquet 另需 `parquet-wasm`），挂载 `arrowFormatsPlugin` |
| GeoPackage（`.gpkg`） | `@mapseekai/emap/geopackage` | 读取 `.gpkg` 中的矢量要素表并保留共享拓扑，详见[导入 GeoPackage](./geopackage.md) |
| GeoTIFF / COG（`.tif`） | `@mapseekai/emap/geotiff` | 独立栅格服务按窗口与金字塔读取，不转换为矢量拓扑，详见[读取与显示 GeoTIFF](./geotiff.md) |
| FlatGeobuf 等其他自定义格式 | `registerFormat()` / `DatasetFormatPlugin` | 由宿主应用实现并注册自定义编解码器（Codec） |

> **读写对称性提醒**：支持导入某种格式，并不意味着当前数据集中的所有 Z/M 维度、复杂嵌套属性或多图层结构都能无损写回同一种格式。导出数据前，请先核对目标格式对几何类型、字段类型和单/多图层的限制。

## 2. 从字节或 URL 加载矢量数据

<span id="加载数据" />

当用户在浏览器中选择本地文件或从宿主应用拿到二进制字节（`bytes`）时，调用 `TopologySource.fromBytes()` 解析并注册到已就绪的 `map`：

```ts
import { TopologySource } from '@mapseekai/emap';

const source = await TopologySource.fromBytes('upload', bytes, {
  filename: file.name,
  formats: map.formats,
});
await map.addSource('upload', source);
```

关键注意事项：

- **按格式提供带扩展名的 `filename`**：`fromBytes()` 省略文件名时默认为 `${id}.geojson`。读取用户文件或其他格式时，应传入实际文件名，使格式注册表选择正确的解析器。面向用户上传场景的资源预算配置请参见[从文件选择器导入数据](../recipes/file-upload.md)。
- **传入 `formats: map.formats`**：确保地图上下文中通过插件注册的可选格式能够被 `TopologySource` 识别。
- **使用 `fromUrl()` 与 `setData()`**：加载固定地址的远程文件可使用 `TopologySource.fromUrl()`；使用 `source.setData()` 替换已有数据源内容时，后发起的加载会自动使尚未完成的旧加载失效。请始终使用 `try/catch` 处理加载异常，不要将未完成解析的实例当作就绪数据源注册。

## 3. 注册可选格式与自定义编解码器（Codec）

<span id="核心格式" />
<span id="更多格式与插件" />
<span id="高级格式注册" />
<span id="注册与生命周期" />
<span id="格式插件契约" />
<span id="开发格式插件" />

以 Arrow 和 GeoParquet 为例，先在地图实例上安装 `arrowFormatsPlugin` 并等待其 Fiber 就绪，随后通过 `map.formats` 即可直接读写对应格式：

```ts
import { arrowFormatsPlugin } from '@mapseekai/emap/arrow';
const fiber = map.ctx.plugin(arrowFormatsPlugin);
await fiber.await();
```

（若需对 GeoParquet 直接执行 SQL 过滤或空间计算，也可使用独立的 [DuckDB 空间处理](./duckdb.md) 入口。）

如果你需要接入 FlatGeobuf 或自定义业务格式，可以实现 `DatasetFormatPlugin` 接口，声明 `name`、`extensions`、`importBinary` 和 `exportFormats`（不支持导出时可为空对象），然后调用 `registerFormat(map.formats, codec)` 注册（或在 Cordis 插件的 `ctx.effect()` 中管理其注册与注销生命周期）。编写自定义解析器时，请务必校验输入字节上限、坐标合法性与数值范围。

## 4. 导出数据为文件（Blob）

<span id="导出数据" />

调用 `await source.export({ format })` 会将当前数据源序列化为浏览器 `Blob`，你可以创建临时对象 URL 触发浏览器下载：

```ts
const blob = await source.export({ format: 'geojson' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'districts.geojson';
link.click();
URL.revokeObjectURL(url);
```

导出时的两个重要边界：

1. **导出不会直接改写磁盘源文件**：`source.export()` 仅在内存中生成 `Blob`；触发下载链接后用户是否最终保存到本地磁盘由浏览器控制。
2. **渲染层 `filter` 不会过滤导出内容**：在渲染图层上配置的显示过滤条件仅影响画面绘制与点击命中。如果你只想导出符合条件的部分要素，请先通过数据操作或属性筛选生成目标数据集后再导出。

## 5. 缺失 CRS 预检与工程状态恢复

当导入的数据源缺少明确的坐标系元数据时，请使用 `map.preflightSource()` 走[导入前确认 CRS](../concepts/source-layer.md) 流程。对于同时包含矢量与本地 GeoTIFF 影像的工程，MSX 快照保存矢量数据与图层配置，而 GeoTIFF 仅保存轻量引用（`toReferences()`），恢复工程时需由宿主应用重新提供本地文件或 `FileSystemFileHandle`。

## API

<span id="核心方法" />
<span id="各格式说明" />
<span id="geojsontopojsonkml" />
<span id="shapefile-zip" />
<span id="geoparquet-与-geoarrow" />
<span id="flatgeobuf" />
<span id="geopackage" />

- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)
- [ExportOptions](/mapseekai/emap/api/interfaces/emap.ExportOptions.html)
- [registerFormat](/mapseekai/emap/api/functions/emap.registerFormat.html)
- [DatasetFormatPlugin](/mapseekai/emap/api/interfaces/emap.DatasetFormatPlugin.html)
- [initParquetWasm](/mapseekai/emap/api/functions/arrow.initParquetWasm.html)
- [setParquetWasm](/mapseekai/emap/api/functions/arrow.setParquetWasm.html)

## 可运行示例

- [导出格式](/mapseekai/emap/examples/export-formats/)
- [FlatGeobuf 查看器](/mapseekai/emap/examples/flatgeobuf-viewer/)
- [GeoParquet 查看器](/mapseekai/emap/examples/geoparquet-viewer/)
- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)

## 实现依据

- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
- [`src/domain/source/format-registry.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/format-registry.ts)
- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
