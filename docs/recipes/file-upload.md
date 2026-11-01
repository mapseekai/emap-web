---
id: file-upload
slug: /recipes/file-upload
title: 文件导入
description: "导入浏览器选择的矢量文件，并配置字节和 ZIP 解压限制。"
api: ["TopologySource.fromBytes", "TopologySource", "TopologySourceFromBytesOptions"]
examples: ["flatgeobuf-viewer", "geoparquet-viewer", "getting-started/points"]
stability: stable
verifiedVersion: unreleased
---

# 从文件选择器导入数据

<span id="替换-source-数据" />

允许用户在浏览器中选择本地矢量文件（如 GeoJSON、TopoJSON、Shapefile ZIP、KML 或已注册插件的 GeoParquet）并加载到地图时，标准的工程实践是：**先校验文件体积与解压上限 -> 解析字节并传入格式注册表 -> 执行数据源 CRS 预检（Preflight）-> 确认注册后添加渲染图层并适配视野**。

## 1. 读取文件、限制大小预算并执行预检

以下函数演示了如何从 `<input type="file">` 读取用户选择的矢量文件、配置输入字节与 ZIP 解压安全上限，并调用 `map.preflightSource()` 进行预检（注意：本地 GeoTIFF 影像采用按窗口读取机制，不使用本页的整文件字节读取，详见[读取与显示 GeoTIFF](../data/geotiff.md)）：

```ts
import { TopologySource, type Emap } from '@mapseekai/emap';

async function importFile(map: Emap, input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;
  const maxInputBytes = 50 * 1024 * 1024;
  if (file.size > maxInputBytes) throw new Error('File exceeds the 50 MiB limit');
  const source = await TopologySource.fromBytes('upload', await file.arrayBuffer(), {
    filename: file.name,
    formats: map.formats,
    resourceLimits: { maxInputBytes },
    zipLimits: {
      maxCompressedBytes: maxInputBytes,
      maxBytes: 200 * 1024 * 1024,
      maxEntries: 1000,
      maxRatio: 100,
    },
  });
  return map.preflightSource({ id: 'upload', source });
}
```

关键参数说明：

- **提前检查 `file.size`**：上例中的 `50 MiB` 是应用层根据自身业务场景设定的文件预算（底层默认上限为 2 GiB）。在调用 `file.arrayBuffer()` 前先检查 `file.size`，可以在分配大块内存前快速拦截超限文件。
- **配置 `zipLimits` 防御压缩炸弹**：导入 Shapefile ZIP 时，`zipLimits` 会限制压缩包体积、解压后总字节数（`maxBytes`）、文件条目数（`maxEntries`）及最大压缩比（`maxRatio`），防止极小的异常压缩包在浏览器内存中展开成巨量数据。
- **传入 `filename` 与 `formats`**：`filename` 的扩展名用于匹配解析器；`formats: map.formats` 则确保已挂载到地图的 Arrow / GeoParquet 等可选格式插件能够被识别。

## 2. 处理预检结果与注册图层

<span id="更多导入选项" />

调用 `importFile()` 时，请用 `try/catch` 捕获解析异常，并根据 `preflightSource()` 返回的三种 `status` 分支处理（详细状态契约见[数据源与图层](../concepts/source-layer.md)）：

1. **`status === 'ready'`**：数据与坐标系校验通过。调用 `await map.confirmSource(result.plan)` 正式注册后，通过 `map.getSource('upload')` 获取数据源，再根据 `getLayers()` 中数据图层的几何类型（`point` / `polyline` / `polygon`）调用 `map.addLayer()` 添加渲染样式，并用 `fitBounds()` 定位视野。
2. **`status === 'needs-input'`**：文件缺少 CRS 元数据（例如未包含 `.prj` 文件的 Shapefile）。此时尚未注册数据源，界面应向用户弹出坐标系选择框，拿到用户指定的 `sourceCrs` 后基于 `result.draft` 重新预检。
3. **`status === 'rejected'`**：数据不满足导入契约或发生数据源 ID 冲突。向用户展示 `result.diagnostics` 中的具体诊断原因。

> **处理重复导入与 ID 冲突**：如果用户多次上传文件，请为每次上传生成唯一的数据源 ID，或者在复用 `'upload'` ID 前先移除旧的渲染图层与数据源（或使用 `source.setData()` 替换数据），不要把数据源 ID 冲突误判为文件格式损坏。

## 3. 接入可选矢量格式与栅格数据

除内置的 GeoJSON、TopoJSON、Shapefile ZIP、KML 和 MSX 外，接入其他格式时请注意：

- **Arrow / GeoArrow / GeoParquet**：需先通过 `map.ctx.plugin(arrowFormatsPlugin)` 注册插件并等待就绪，再将 `map.formats` 传给 `TopologySource.fromBytes()`。
- **GeoPackage（`.gpkg`）**：支持多表选择、CRS 转换与 Worker 导入，详见[导入 GeoPackage](../data/geopackage.md)。
- **GeoTIFF（`.tif` / `.tiff`）**：请直接将 `File` 对象传给 `map.ctx.geoTIFF.addFile()`，不要调用 `file.arrayBuffer()` 将数 GB 的影像一次性读入内存。

## 4. 上线前验证清单

在完成文件导入功能后，建议逐一测试以下场景：

- 用户打开文件选择框后直接点击“取消”：页面应保持原有地图状态不变，不报错。
- 上传空文件、损坏文件或超过 `maxInputBytes` 的大文件：应给出清晰提示，且文件输入框仍可重新选择。
- 上传缺失 `.prj` 的 Shapefile ZIP：能正常进入 `needs-input` 流程并在补充 CRS 后完成加载。
- 在大文件解析期间直接切换页面卸载组件：确认不会向已销毁的地图实例提交结果。

## API

<span id="核心参数" />
<span id="topologysourcefrombytesid-bytes-options" />
<span id="created-reusable-source" />
<span id="创建可复用-source" />

- `TopologySource`
- `TopologySourceFromBytesOptions`

## 可运行示例

- [GeoParquet 查看器](/mapseekai/emap/examples/geoparquet-viewer/)
- [FlatGeobuf 查看器](/mapseekai/emap/examples/flatgeobuf-viewer/)
- [点图层入门](/mapseekai/emap/examples/getting-started/points/)

## 实现依据

- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
- [`src/engine/map/source-loading.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/source-loading.ts)
