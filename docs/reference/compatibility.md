---
id: compatibility
slug: /reference/compatibility
title: 兼容性
description: "查阅浏览器要求、渲染后端、peer 依赖和 Worker/WASM 部署约定。"
api: ["RendererBackend", "Emap.getRenderer", "ArcCollection", "ArcCutPoint", "ArcIterator", "ArcVertexData", "ArrowDotPathOptions", "bumpAttributeVersion", "bumpEditVersion", "CanvasPainter", "Coord2", "DataTable", "DefaultMapshaperAdapter", "EditOverlayRenderer", "ExportedFile", "FeatureShape", "GeometryType", "getDefaultMapshaperAdapter", "Handler", "HandlerManager", "HandlerResult", "isHandler", "isPathLayer", "isPointLayer", "LegacyPointShape", "MapshaperAdapter", "MapshaperBBox", "MapshaperDataset", "MapshaperLayer", "MapshaperWorkerPool", "MapshaperWorkerPoolOptions", "NormalizedPointerEvent", "PackedSession", "PathGeometryType", "PathLayer", "PathPart", "PathShape", "PointerModifiers", "PointerMoveEvent", "PointLayer", "PointShape", "PointStyle", "RunnerInputFiles", "SegmentIntersection", "setDefaultMapshaperAdapter", "SignedArcId", "StrokeStyle", "TopologySource.fromBytes", "Transform", "VertexDotStyle", "Emap", "MapOptions", "initParquetWasm", "setParquetWasm", "createDuckDbRuntimeFromJsDelivr"]
examples: ["geoparquet-viewer","web-worker"]
stability: stable
verifiedVersion: unreleased
---

# 环境与兼容性

本页汇总 `@mapseekai/emap` 当前源码声明的浏览器版本要求、三大渲染后端特性、可选 Peer 依赖版本以及 Web Worker / WASM 静态资源部署清单。请注意：声明的浏览器版本下限代表语法与基础 Web API 支持基线，具体项目的最大承载数据量与渲染表现仍取决于终端设备的内存与 GPU 能力。

## 1. 运行与构建环境矩阵

<span id="核心环境要求" />

| 环境类别 | 声明版本范围 | 用途说明 |
| --- | --- | --- |
| Chrome / Edge | `109` 及以上 | 现代桌面与移动浏览器客户端运行 |
| Firefox | `115` 及以上 | 现代浏览器客户端运行 |
| Safari | `16.4` 及以上 | macOS / iOS 浏览器客户端运行 |
| Node.js | `>=22.18 <25` | 前端工程本地开发、打包构建与测试工具链 |
| TypeScript 编译目标 | `ES2022`，含 `DOM` 与 `DOM.Iterable` | 浏览器 ESM 模块解析（`moduleResolution: "bundler"`） |

浏览器端带画布的地图运行需要具有非零像素尺寸的 DOM 容器、`CanvasRenderingContext2D`、`requestAnimationFrame` 以及标准 Pointer Events。可选模块会额外依赖 `Worker`、`WebAssembly` 或 `FileSystemFileHandle`。`headless` 预设代表无 DOM 画布的浏览器内数据处理工作区，并非服务端数据库引擎。

## 2. 渲染后端对比与回退策略

在调用 `Emap.create({ renderer })` 时，可以选择以下三种渲染后端：

| `renderer` 选项 | 环境要求 | 初始化与回退行为 |
| --- | --- | --- |
| `'webgl2'`（默认） | 浏览器与显卡开启 WebGL2 上下文支持 | 默认启用 GPU 加速绘制；若上下文创建失败则直接 reject Promise |
| `'canvas2d'` | 标准 HTML5 2D Canvas | 显式指定启用，兼容性最广，适合首次入门练习或无 GPU 环境兜底 |
| `'webgpu'` | 安全上下文（HTTPS / localhost）且具备可用 GPU Adapter | 显式指定启用，创建前检查设备 Adapter 能力 |

关于渲染后端的三个重要约定：

1. **不会静默降级**：当请求的 `'webgl2'` 或 `'webgpu'` 初始化失败时，`Emap.create()` 会直接抛出异常拒绝创建，而不会在背后静默替换成 `'canvas2d'`。应用层可以捕获该异常，向用户提示或显式改用 `renderer: 'canvas2d'` 重新创建实例。
2. **查询当前活动后端**：调用 `map.getRenderer()` 返回当前实例实际使用的后端名称；在 `headless`、`empty` 预设、已销毁实例或未声明后端标识的自定义 Painter 下返回 `null`。
3. **混合覆盖物绘制**：即使主图层使用 WebGL2 或 WebGPU 渲染，交互编辑控制点（Handles）和部分瞬态绘制覆盖物仍使用顶层 Canvas2D 辅助绘制。

## Peer 依赖配置

<span id="部署配置" />

按需使用可选子路径功能时，请对照 `package.json` 中的声明安装对应版本的 Peer 依赖：

| 使用的功能模块 | 导入入口 | 需安装的 Peer 依赖及版本范围 |
| --- | --- | --- |
| 根入口公开类型、MapLibre 在线底图与叠加层 | `@mapseekai/emap`、`@mapseekai/emap/maplibre` | `maplibre-gl` `^6.4.1`（安装后仍需注册 `mapLibrePlugin` 才会启用底图服务） |
| Arrow / GeoArrow 表格与矢量互转 | `@mapseekai/emap/arrow` | `apache-arrow` `^17.0.0` |
| GeoParquet 导入与导出 | `@mapseekai/emap/arrow` | `apache-arrow` `^17.0.0`、`parquet-wasm` `^0.7.1` |
| DuckDB-Wasm SQL 与空间分析工具箱 | `@mapseekai/emap/duckdb` | `@duckdb/duckdb-wasm` `1.33.1-dev64.0`、`apache-arrow` `^17.0.0` |

TypeScript 项目的 `tsconfig.json` 配置示例请参见[安装与环境配置](../getting-started/installation.md)。

## 3. Worker 与 WASM 静态资源部署清单

<span id="worker-与-wasm-资源" />
<span id="mapoptions-的-worker-参数" />

当应用启用后台 Worker 路由或 WASM 扩展格式时，必须将包内对应的静态资源复制到生产环境可访问的路径：

| 启用的能力 | 需要部署并核对的静态资源文件 |
| --- | --- |
| Mapshaper 后台空间操作（`useWorker`） | `emap-worker.js` 以及同级目录下的 `mapshaper-vendor.js`（或 `.mjs`） |
| GPU 渲染文字标注（MSDF） | `emap-msdf-worker.js` 及配套的 `msdf/` 字体图集资源 |
| GPU 渲染几何准备 | `emap-geometry-worker.js` |
| 本地 GeoTIFF 影像按窗口读取 | `emap-geotiff-worker.js` |
| 本地 GeoPackage 矢量导入 | `emap-geopackage-worker.js`、配套 vendor 脚本及 `sql-wasm.wasm` |
| GeoParquet 读写 | `parquet-wasm` 的 `.wasm` 模块文件（或通过 `initParquetWasm` / `setParquetWasm` 注入） |
| DuckDB-Wasm 空间分析 | DuckDB Worker、WASM Bundle 以及按需加载的 Spatial Extension `.duckdb_extension.wasm` |

生产环境部署核查要点：

- **构建版本一致**：所有 Worker 脚本与 vendor 文件必须与主线程安装的 `@mapseekai/emap` 来自同一版本构建。
- **校验真实响应内容而非仅看 HTTP 200**：单页应用（SPA）服务器常将未匹配到的静态路径回退到 `index.html`（状态码仍为 200，但返回 `text/html`），导致 Worker 启动报语法错误或 WASM 报 `magic word` 错误。请确认子路径 `baseUrl`、MIME 类型（`application/javascript` / `application/wasm`）、CORS 头与 CSP（如 `worker-src`、`wasm-unsafe-eval`）配置正确。

## 4. 上线前真机验证建议

TypeScript 编译通过与单元测试通过，不能替代真实浏览器环境下的图形与静态资源检查。在发布上线前，建议在目标浏览器与目标渲染后端下实际跑通一次**文件导入、图层渲染、交互编辑与后台 Worker 操作**。关于后台运行时所有权与任务取消约定，请参见[配置 Web Worker](../guides/worker.md)。

## API

<span id="浏览器版本下限" />
<span id="核心浏览器-api" />
<span id="地图创建时选择渲染后端" />
<span id="打包器与-typescript" />
<span id="mapshaperworkerpool-参数" />
<span id="initparquetwasm-与-setparquetwasm-参数" />

- [src.MapOptions](/mapseekai/emap/api/interfaces/emap.MapOptions.html)
- [src.MapshaperWorkerPool](/mapseekai/emap/api/classes/emap.MapshaperWorkerPool.html)
- [src_arrow.initParquetWasm](/mapseekai/emap/api/functions/arrow.initParquetWasm.html)

## 可运行示例

- [geoparquet-viewer](/mapseekai/emap/examples/geoparquet-viewer/)
- [web-worker](/mapseekai/emap/examples/web-worker/)

## 实现依据

- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
