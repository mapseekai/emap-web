---
id: duckdb
slug: /data/duckdb
title: DuckDB Processing Toolbox
description: "配置 DuckDB-Wasm，执行 SQL、空间处理和 GeoParquet 查询。"
api: ["AggregateOptions", "append", "area", "attributeFilter", "AttributeFilterOptions", "attributeJoin", "AttributeJoinOptions", "AttributeOptions", "boundary", "buffer", "BufferOptions", "centroid", "centroidX", "centroidY", "clip", "ClipOptions", "closeDuckDbRuntime", "collect", "convexHull", "createDuckDbGeoParquetQuerySource", "createDuckDbRuntimeFromJsDelivr", "CreateDuckDbRuntimeOptions", "densify", "DensifyOptions", "difference", "DifferenceOptions", "dissolve", "DuckDbAgentMetadata", "duckDbAttributeFilterLayer", "DuckDbAttributeFilterLayerOptions", "DuckDbAttributeFilterLayerResult", "DuckDbConnection", "duckDbGeoParquetQueryLayer", "DuckDbGeoParquetQueryLayerOptions", "DuckDbGeoParquetQueryLayerResult", "DuckDbGeoParquetQueryOptions", "DuckDbGeoParquetQuerySource", "DuckDbMapOpContext", "DuckDbMapOpSource", "DuckDbOperationError", "DuckDbOperationErrorKind", "duckDbOverlayLayer", "DuckDbOverlayLayerOptions", "DuckDbOverlayLayerResult", "DuckDbRuntime", "DuckDbSpatialExtensionUrls", "duckDbSpatialSummaryJoinLayer", "DuckDbSpatialSummaryJoinLayerOptions", "DuckDbSpatialSummaryJoinLayerResult", "duckDbToolbox", "DuckDbToolCategory", "DuckDbToolDefinition", "DuckDbToolExecutionContext", "DuckDbToolId", "DuckDbToolInput", "DuckDbToolObjectProperty", "DuckDbToolOutput", "DuckDbToolParameter", "DuckDbWasmModule", "envelope", "extractVertices", "GeometryOptions", "geometryType", "intersect", "IntersectOptions", "isEmpty", "isSimple", "isValid", "length", "lineToPolygon", "merge", "MergeOptions", "multipartToSinglepart", "near", "nearest", "NearestOptions", "NearOptions", "perimeter", "pointToLine", "PointToLineOptions", "polygonToLine", "queryGeoParquetWithDuckDb", "quoteSqlString", "repairGeometry", "RepairGeometryOptions", "reproject", "ReprojectOptions", "simplify", "SimplifyOptions", "simplifyPreserveTopology", "SpatialAggregation", "spatialFilter", "SpatialFilterOptions", "SpatialFilterPredicate", "spatialJoin", "SpatialJoinOptions", "SpatialJoinPredicate", "spatialRelation", "SpatialRelationOptions", "spatialSummaryJoin", "SpatialSummaryJoinOptions", "SpatialSummaryJoinPredicate", "SpatialSummaryJoinType", "SpatialSummaryOperation", "symmetricDifference", "SymmetricDifferenceOptions", "union", "UnionOptions", "ValidatedDuckDbSelectSql", "ValidatedDuckDbSelectSqlWithoutRowId", "ValidatedDuckDbSelectSqlWithRowId", "validateDuckDbSelectSql", "ValidateDuckDbSelectSqlOptions", "x", "y"]
examples: ["duckdb-buffer","duckdb-geoparquet-query","duckdb-overlay","duckdb-query","duckdb-spatial-aggregate-join"]
stability: stable
verifiedVersion: unreleased
---

# 使用 DuckDB 进行空间处理

<span id="更多-gis-处理" />
<span id="更多工具箱" />

`@mapseekai/emap/duckdb` 子入口将 DuckDB-Wasm 与空间扩展（Spatial Extension）引入浏览器，提供受控的 SQL 属性筛选、GeoParquet 直接查询以及涵盖八大类的 GIS 空间分析工具箱。

请注意职责边界：**独立调用的 DuckDB 工具函数接收数据集（Dataset）并返回新的结果数据集，它们不会自动替换地图上的已有图层，也不会自动写入地图的撤销历史**；若需要将分析结果接入地图工作区与历史栈，请使用对应的地图图层封装函数或自行将结果注册为数据源。

## 1. 初始化与关闭 DuckDB 运行时

<span id="更多运行时配置" />
<span id="取消一次工具运行" />

在使用该子入口前，请先按[环境与兼容性](../reference/compatibility.md)安装匹配的 `@duckdb/duckdb-wasm` 与 `apache-arrow` Peer 依赖。

在允许访问公网 CDN 的开发或演示环境中，可以使用 `createDuckDbRuntimeFromJsDelivr()` 快速创建运行时，并在所有分析任务执行完毕后调用 `closeDuckDbRuntime()` 释放 Worker 与内存：

```ts
import { createDuckDbRuntimeFromJsDelivr, closeDuckDbRuntime } from '@mapseekai/emap/duckdb';

const runtime = await createDuckDbRuntimeFromJsDelivr();
try {
  // 在此等待使用 runtime 的全部操作。
} finally {
  await closeDuckDbRuntime(runtime);
}
```

生产与离线部署注意事项：

- **自托管静态资源**：在内网、离线或启用了严格内容安全策略（CSP）的环境中，请配置自托管的 DuckDB Worker、WASM Bundle 与 Spatial 扩展 URL，不要依赖公网 CDN。
- **按需加载空间扩展**：DuckDB 实例初始化成功并不代表 Spatial 扩展已经加载完毕（空间扩展会在首次执行空间算子时按需加载并校验）。
- **切勿提前关闭运行时**：当仍有并发查询或分析任务正在使用 `runtime` 时，不要提前调用 `closeDuckDbRuntime(runtime)`。

## 2. 调用空间处理工具箱（Toolbox）

你既可以直接导入具名算子函数（如 `buffer`、`intersect`、`spatialJoin`、`dissolve`），也可以通过 `duckDbToolbox` 动态枚举工具元数据（包含 Overlay、Proximity、Aggregate、Join、Geometry、Transform、Selection 和 Data Management 八大分类）并按 ID 调用。

以下示例对 `roads` 数据集执行 20 米的缓冲区分析：

```ts
import { buffer } from '@mapseekai/emap/duckdb';

const buffered = await buffer(roads, { distance: 20 }, runtime);
```

**坐标系（CRS）硬性约束**：`buffer`、`near`、`nearest` 等基于平面距离的工具**默认拒绝地理坐标系（如 `EPSG:4326` 经纬度）**，以防止将经纬度角度直接当作平面米数计算导致结果严重失真。在调用距离或面积算子前，请先确保输入数据集已位于合适的投影坐标系（如 `EPSG:3857` 或地方高斯/UTM 投影），并确认参数单位与该投影的线性单位一致。

## 3. 直接使用 SQL 查询 GeoParquet 字节

<span id="更多-geoparquet-查询" />

对于包含大量记录的 GeoParquet 文件，你可以使用 `queryGeoParquetWithDuckDb()`（或 `createDuckDbGeoParquetQuerySource()`）直接在原始字节上执行受控的 `SELECT` 过滤，只将命中的子集加载为地图数据集：

```ts
import { queryGeoParquetWithDuckDb } from '@mapseekai/emap/duckdb';

const result = await queryGeoParquetWithDuckDb(bytes, {
  sql: 'SELECT geometry, name FROM input WHERE active = true',
}, runtime);
```

SQL 查询契约与安全边界：

1. **仅限针对 `input` 表的单条 `SELECT` 语句**：查询在执行前会经过 `validateDuckDbSelectSql()` 静态校验。它不是任意 SQL 执行控制台，禁止使用多条语句、DDL/DML 修改语句、其他表名或读取外部文件/网络的函数。
2. **保留几何列**：如果希望查询结果继续作为空间图层渲染，必须在 `SELECT` 投影列表中包含几何列（如 `geometry`）。
3. **核对派生列与 CRS 元数据**：执行复杂的 SQL 计算后，建议检查返回数据集的字段列表与 CRS 元数据，不要假定任意 SQL 表达式都能自动透传原始空间元数据。

## 4. 任务取消、资源清理与错误处理

- **优雅取消单次任务**：支持取消的工具函数可接收 `AbortSignal`。触发取消信号后，调用方仍需等待 Promise 结束，以便底层安全清理本次任务创建的临时表、连接与文件句柄。注意：取消单次查询绝不等于关闭整个共享 `DuckDbRuntime`。
- **结构化错误分类**：独立工具函数失败时会抛出 `DuckDbOperationError`（通过 `error.kind` 区分 `'validation'`、`'runtime-unavailable'`、`'spatial-extension-unavailable'`、`'query-failed'` 和 `'conversion-failed'`）；而挂载到地图操作上的封装方法则会将错误统一映射为 `OpError` 的 `kind: 'duckdb'` 分支。完整的错误码说明与恢复建议请参见[错误参考](../reference/errors.md)。

## API

<span id="核心方法" />
<span id="createduckdbruntimefromjsdelivr" />
<span id="duckdbruntimescope-与-duckdbplugin" />
<span id="工具族与关键参数" />
<span id="attributefilter-sql-契约" />

- [createDuckDbRuntimeFromJsDelivr](/mapseekai/emap/api/functions/duckdb.createDuckDbRuntimeFromJsDelivr.html)
- [closeDuckDbRuntime](/mapseekai/emap/api/functions/duckdb.closeDuckDbRuntime.html)
- [validateDuckDbSelectSql](/mapseekai/emap/api/functions/duckdb.validateDuckDbSelectSql.html)
- [queryGeoParquetWithDuckDb](/mapseekai/emap/api/functions/duckdb.queryGeoParquetWithDuckDb.html)
- [duckDbToolbox](/mapseekai/emap/api/variables/duckdb.duckDbToolbox.html)

## 可运行示例

- [DuckDB buffer](/mapseekai/emap/examples/duckdb-buffer/)
- [DuckDB GeoParquet 查询](/mapseekai/emap/examples/duckdb-geoparquet-query/)
- [DuckDB overlay](/mapseekai/emap/examples/duckdb-overlay/)
- [DuckDB 查询](/mapseekai/emap/examples/duckdb-query/)
- [DuckDB 空间聚合连接](/mapseekai/emap/examples/duckdb-spatial-aggregate-join/)

## 实现依据

- [`src/integrations/duckdb/index.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/duckdb/index.ts)
- [`src/integrations/duckdb/core/types.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/duckdb/core/types.ts)
