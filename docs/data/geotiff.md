---
id: geotiff
slug: /data/geotiff
title: 本地 GeoTIFF 栅格
description: "加载与着色 GeoTIFF 栅格，配置金字塔、缓存和性能诊断。"
api: ["openGeoTIFF", "openGeoTIFFHandle", "geoTIFFPlugin", "rasterPlugin", "RasterSource", "RasterStyle", "RasterReference", "RasterContract", "RASTER_PYRAMID_THRESHOLD", "GeoTIFFAddOptions", "GeoTIFFContract", "GeoTIFFPluginOptions", "OpenGeoTIFFOptions", "RasterCacheStats", "RasterPerformanceTotals", "RasterPlanningDiagnostics", "RasterLayerPlanningDiagnostics", "RasterSelectedLevelDiagnostics", "RasterError", "RasterLayerInfo", "RasterLayerReference", "RasterLevel", "RasterMetadata", "RasterBandStatistics", "RasterRenderRequest", "RasterRenderResult", "RasterTaskDiagnostics", "RasterWarpMesh", "RasterProcessingStats", "RasterNativeDeflateStatus", "RasterNativeDeflateDisabledReason", "RasterWorkerBlockStats", "RasterLevelProcessingStats", "RasterReadRequest", "RasterReadResult", "RasterTextureResult", "RasterRenderOptions", "RasterSamples", "RasterWindow", "RenderFrame", "RenderPass"]
examples: ["geotiff-viewer", "mixed-data-viewer", "luma-raster"]
stability: experimental
verifiedVersion: unreleased
---

# 读取与显示 GeoTIFF

`@mapseekai/emap/geotiff` 通过后台 Worker 按视口窗口按需读取本地 GeoTIFF / BigTIFF 或 COG 影像。栅格图层运行在独立的栅格显示栈中（位于矢量图层下方），不会转换为矢量拓扑。加载本地影像时，请直接传入浏览器 `File` 对象或 `FileSystemFileHandle`，**切勿提前调用 `file.arrayBuffer()` 将整幅大影像读入内存**。

## 1. 注册栅格插件并加载本地影像

创建支持本地 GeoTIFF 的地图时，需同时挂载 `rasterPlugin()` 与 `geoTIFFPlugin()`，并确保已将匹配版本的 `emap-geotiff-worker.js` 部署到可访问路径。如果用户同时选择了外部金字塔文件（如 `image.tif.ovr`），可通过 `overviewFile` 一并传入（无外部金字塔时传 `undefined`）：

```ts
import { Emap, Bounds } from '@mapseekai/emap';
import { rasterPlugin, geoTIFFPlugin } from '@mapseekai/emap/geotiff';

const map = await Emap.create({
  container: 'map',
  preset: 'viewer',
  plugins: [
    rasterPlugin({ cacheBytes: 64 * 1024 ** 2, concurrency: 2 }),
    geoTIFFPlugin({ workerUrl: '/assets/emap-geotiff-worker.js', workerCount: 2 }),
  ],
});

// file 来自文件选择器；不要提前执行 file.arrayBuffer()。
await map.ctx.geoTIFF.addFile('imagery', file, {
  overviewFile, // 可选：用户同时选择的 image.tif.ovr
  style: { bands: [0, 1, 2], resampling: 'bilinear' },
});
const bounds = await map.ctx.raster.getBounds('imagery');
map.fitBounds(new Bounds(...bounds), { padding: 32, duration: 0 });
```

影像加载成功后，可通过 `await map.ctx.raster.getBounds('imagery')` 读取其在当前地图坐标系下的边界框并调用 `fitBounds()` 定位。注意：虽然栅格管线支持在已知影像 CRS 与地图 CRS 之间进行重投影显示，但**源影像本身必须具备明确的 CRS 定义**；若源文件缺失坐标系信息，需先补齐定义再加载。

## 2. 配置波段组合、数值拉伸与原始像元查询

GeoTIFF 的波段（Bands）索引从 `0` 开始：

- **多波段与单波段着色**：传入 `bands: [0, 1, 2]` 会使用前三个波段合成 RGB 彩色画面；传入单波段（如 `bands: [0]`）则按灰度渲染；未指定 `bands` 时会自动根据影像光度解释或内置调色板选择模式。
- **动态调整拉伸范围与不透明度**：调用 `map.ctx.raster.setStyle()` 可实时更新波段、拉伸区间（`ranges`）和不透明度：

```ts
map.ctx.raster.setStyle('imagery', { bands: [0], ranges: [[0, 3000]], opacity: 0.8 });
```

关于数值拉伸与科学定量读取的注意事项：

- **显示色值不等于原始像元值**：高位深（如 UInt16 / Float32）影像在未指定 `ranges` 时会基于源级近似分位数（Percentile）统计自动拉伸到 8 位显示，以保证拖拽平移期间全局对比度一致。当需要读取某个地理位置的真实物理测量值时，请调用 `queryPixel()` 读取原始分辨率数值，并结合波段、CRS 与 `noData` 设置进行判读。
- **NoData 约定**：在样式配置中，`noData: undefined` 表示沿用影像元数据自带的无效值定义；显式传入 `noData: null` 则禁用无效值透明抠除。

## 3. 管理栅格图层显隐与顺序

<span id="图层和样式" />

栅格图层整体绘制在矢量图层下方，你可以通过 `map.ctx.raster` 管理多个栅格图层之间的显隐、顺序与卸载：

```ts
map.ctx.raster.setVisibility('imagery', true);
map.ctx.raster.moveLayer('imagery');
```

调整栅格样式、不透明度或图层顺序不会修改本地磁盘上的原始文件；调用 `map.ctx.raster.remove('imagery')` 会关闭后台读取会话并释放内存缓存。

## 4. 超大文件（> 2 GiB）、金字塔（Overview）与兼容边界

- **超过 2 GiB 的大影像要求提供金字塔**：当本地 TIFF / BigTIFF 文件超过 `RASTER_PYRAMID_THRESHOLD`（2 GiB）时，必须具备有效的内部金字塔（Internal Overviews）或配套的外部 `.ovr` 文件，以便在小比例尺全局浏览时按需解码低分辨率层级。注意外部 `.ovr` 文件的网格与地理参考必须与主文件严格匹配，不能仅凭文件名相似就混用。
- **网格与编码支持范围**：当前栅格管线面向标准的正北向上（north-up）网格影像；带有仿射旋转参数的影像、预乘 Alpha 或非标准位深调色板需提前在离线工具中预处理。
- **缓存与并发预算**：`cacheBytes` 限制的是栅格服务管理的瓦片/块缓存池大小，并非整个浏览器进程的物理内存上限。调高 `concurrency` 或 `workerCount` 会同时增加文件切片读取、解压与临时缓冲区的瞬时内存占用，建议先通过诊断接口确认瓶颈后再调整。

## 5. 保存轻量工程引用与恢复文件句柄

<span id="工程引用与隐私" />

由于本地遥感影像体积往往高达数百 MB 甚至数 GB，保存工程时不应把像素数据塞进矢量快照：

- 调用 `map.ctx.raster.toReferences()` 可以导出包含数据源标识、样式配置和可见性的轻量级引用元数据（`RasterLayerReference`）。
- 宿主应用可在 IndexedDB 中单独持久化浏览器的 `FileSystemFileHandle`；下次打开工程时，先向用户请求恢复文件读取权限，再调用 `addHandle()` 并校验源文件特征以恢复栅格图层。如果文件句柄失效、原文件被替换或 Worker 会话断开，应提示用户重新选择本地影像文件。

## 6. 性能诊断与底层窗口直读

<span id="性能诊断performance-diagnostics" />

- **读取性能与处理统计**：`map.ctx.raster.getStats()` 包含当前缓存状态、最近的规划信息和累计的 `performance` 计数；评估单次操作时可比较累计计数的前后差值。`getProcessingStats(id)` 提供特定图层的文件读取、Worker 解码、着色和传输统计。GPU 纹理上传与端到端延迟需要另行测量。
- **独立底层窗口读取**：如果你不需要地图画布，只想在代码中按像素窗口读取 TIFF 数据，可以直接使用 `openGeoTIFF()` / `openGeoTIFFHandle()` 配合 `source.readWindow()`（窗口坐标必须落在目标分辨率层级边界内，且读取完毕后务必在 `finally` 块中关闭并释放 `source`）。

## 实现依据

<span id="加载文件" />
<span id="通过金字塔读取大文件" />
<span id="缩放和平移时的连续显示" />
<span id="连续出图与读取吞吐" />
<span id="并行解码与后台着色" />
<span id="资源预算与兼容范围" />
<span id="公开类型与独立读取" />
<span id="内存生命周期检查" />
<span id="可选的原始数值纹理布局" />

- [`src/integrations/geotiff/plugin.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geotiff/plugin.ts)
- [`src/integrations/geotiff/source.ts`](https://github.com/mapseekai/emap/blob/master/src/integrations/geotiff/source.ts)
- [`src/runtime/services/contracts/raster.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/contracts/raster.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
