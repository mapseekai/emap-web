---
id: geopackage
slug: /data/geopackage
title: GeoPackage 矢量直接导入
description: "导入 GeoPackage 矢量表，配置 Worker、坐标系和资源限制。"
api: ["importGeoPackage", "importGeoPackageInWorker", "geoPackagePlugin", "ImportGeoPackageOptions", "GeoPackageWorkerOptions", "GeoPackagePluginOptions", "GeoPackageLimits", "GeoPackageProgress", "GeoPackageDataset", "GeoPackageMetadata", "GeoPackageTableMetadata"]
examples: ["geopackage-viewer"]
stability: experimental
verifiedVersion: unreleased
---

# 导入 GeoPackage 矢量数据

<span id="更多导入方式" />
<span id="导入流程" />
<span id="高级导入参数" />

`@mapseekai/emap/geopackage` 子入口基于 SQL.js（SQLite WASM）直接读取本地 `.gpkg` 文件中的矢量要素表（GeoPackage Binary / WKB），并将其转换为共享弧段拓扑（`ArcCollection`）的 Emap 数据集。注意：该模块专为导入矢量要素表设计，不提供通用 SQLite 任意 SQL 查询控制台，也不会将 `.gpkg` 内的栅格瓦片表当作矢量图层导入。

## 1. 方式一：调用独立函数直接解析 Dataset

如果你希望在将数据源注册到地图前先检查表元数据，或者在无画布场景下读取 `.gpkg`，可以直接调用 `importGeoPackage()`（需确保已部署 `sql-wasm.wasm`）：

```ts
import { importGeoPackage } from '@mapseekai/emap/geopackage'; // 导入 GeoPackage 读取器

const bytes = await file.arrayBuffer(); // 读取用户选择的 .gpkg 文件
const dataset = await importGeoPackage(bytes, {
  wasmUrl: '/assets/sql-wasm.wasm', // 指向部署的 SQL.js WASM
  layers: ['roads', 'stations'], // 只读取所需的要素表
  targetCrs: 'EPSG:3857', // 统一输出坐标系
});
```

`importGeoPackage()` 返回包含拓扑几何与表元数据的 `GeoPackageDataset`，不会自动创建地图渲染图层。你可以检查其中的图层列表后，再交由地图的数据源流程注册并配置样式。

## 2. 方式二：挂载 Cordis 格式插件接入标准导入流

<span id="通过原生-cordis-格式插件加载" />

如果你希望让 `.gpkg` 文件与 GeoJSON、Shapefile 一样直接通过 `TopologySource` 加载，可以在地图就绪后安装 `geoPackagePlugin()`：

```ts
import { Emap, TopologySource } from '@mapseekai/emap';
import { geoPackagePlugin } from '@mapseekai/emap/geopackage';

const map = await Emap.create({ container: 'map' });
const fiber = map.ctx.plugin(
  geoPackagePlugin({
    workerUrl: '/assets/emap-geopackage-worker.js',
    wasmUrl: '/assets/sql-wasm.wasm',
    layers: ['roads'],
  }),
);
await fiber.await();

const source = new TopologySource('gpkg', { formats: map.formats });
await source.setData({ filename: file.name, content: new Uint8Array(await file.arrayBuffer()) });
await map.addSource('gpkg', source);
```

使用建议：

- **按需指定 `layers` 表名**：如果不传 `layers`，导入器默认读取文件内所有受支持的矢量要素表。面对包含数十张表的大型 `.gpkg` 文件，显式指定所需的表名可以显著减少解析时间与内存占用。
- **添加渲染图层**：`await map.addSource('gpkg', source)` 完成后，可通过 `source.getLayers()` 查看导入的数据图层名称与几何类型，再调用 `map.addLayer()` 为每张表配置 `source-layer` 和绘制样式。

## 3. 坐标系重投影、几何拆分与字段类型映射

<span id="坐标系几何与属性规则" />

同一个 `.gpkg` 文件中的不同要素表可能使用不同的坐标系或几何类型，导入器按以下规则统一转换：

1. **坐标系（CRS）处理**：通过 `targetCrs` 可以将所有导入表统一重投影到同一目标坐标系。如果某张源表缺失 CRS 定义或无法识别，必须显式补充正确的源 CRS，不能只修改目标标签而不做坐标重投影。
2. **二维编辑与混合几何拆分**：Emap 的地图渲染与拓扑编辑基于二维平面坐标（XY），源数据中的 Z/M 坐标不会自动开启三维编辑能力。空几何记录仍会保留其属性行；如果单张表内包含混合几何类型（如同时含有点、线、面），导入器会按基础几何类型拆分为对应的数据图层，因此最终生成的数据图层数量可能多于原始 SQLite 表数量。
3. **SQLite 字段类型映射**：在 JavaScript 安全整数范围内的整数保持为 `number`，超出 `Number.MAX_SAFE_INTEGER` 的 64 位大整数转换为 `string` 以免精度丢失，BLOB 二进制列则保留为 `Uint8Array`。

## 4. 后台 Worker 导入、进度回调与资源安全上限

<span id="worker进度与取消" />

- **使用 Worker 避免阻塞主线程**：无论是调用 `importGeoPackageInWorker()` 还是为 `geoPackagePlugin` 配置 `workerUrl`，都支持传入 `AbortSignal` 取消任务以及监听 `onProgress` 进度回调。默认情况下输入字节采用复制传输以保留调用方的缓冲区；若开启 `transferInput: true` 零拷贝转移所有权，调用后请勿在主线程继续读取已转移的 `ArrayBuffer`。
- **内置资源限制（`GeoPackageLimits`）**：为防止恶意或超大文件耗尽浏览器内存，导入器默认限制输入字节与解码预算上限为 `2 GiB`、最大要素数为 `10,000,000`（1000 万）、最大图层数为 `4096` 并限制几何嵌套深度。请注意这些参数是拒绝超限输入的保护阈值，并不代表所有终端设备都能流畅承载 2 GiB 数据，业务应用可根据目标设备通过 `limits` 进一步收紧预算。

## 5. 验证导入结果

导入完成后，建议核对导入后的表数量、要素总数、有效 CRS、大整数字段值以及空几何记录是否符合预期。如果导入报错，请先在浏览器网络面板确认 `sql-wasm.wasm` 和 `emap-geopackage-worker.js` 是否成功返回了正确的二进制/脚本内容，再排查 `.gpkg` 文件结构与资源限制。

## 可运行示例

- [GeoPackage 多图层示例](/mapseekai/emap/examples/geopackage-viewer/)

## 实现依据

<span id="核心参数" />
<span id="安装与静态资源" />
<span id="资源限制与真实内存成本" />

- [`src/integrations/geopackage/types.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geopackage/types.ts)
- [`src/integrations/geopackage/import.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geopackage/import.ts)
- [`src/integrations/geopackage/worker.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geopackage/worker.ts)
