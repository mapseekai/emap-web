---
id: emap
slug: /concepts/emap
title: Emap 地图实例
description: "创建 Emap 实例，配置地图选项并管理相机、数据和生命周期。"
api: ["Emap", "Feature", "FeatureAccessor", "FeatureQuery", "findInvalidFieldName", "HighlightManager", "isValidFieldName", "VisibleLayerLookup", "MapOptions", "TopologySource"]
examples: ["getting-started/vector-file","interaction-handlers","undo-redo"]
stability: stable
verifiedVersion: unreleased
---

# Emap 地图实例

`Emap` 类是整个浏览器地图工作区的统一门面（Facade），负责协调数据源注册、相机变换、图层渲染、交互手势以及可撤销编辑历史。在前端工程中，宿主应用应当持有 `Emap` 实例引用，并将它的异步创建、日常调用与卸载销毁严格绑定到同一个组件的生命周期中。

## 1. 创建实例与等待就绪

对于带画布的浏览器预设（`'editor'` 或 `'viewer'`），必须在目标 DOM 容器已经挂载到文档且具有非零宽高后初始化地图。

推荐使用异步静态工厂 `await Emap.create(options)`：它会等待内部所有预设插件和服务初始化完毕后再返回就绪的 `map` 实例（如果直接使用 `new Emap(options)` 构造函数，则会立即返回尚未完成异步装配的实例，调用方必须额外 `await map.ready`）：

```ts
import { Emap } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const map = await Emap.create({
  container: 'map',
  preset: 'viewer',
  renderer: 'canvas2d',
});
```

初始化关键参数说明：

- **`container`**：传入 DOM 元素的 `id` 字符串（不带 `#`）或直接传入 `HTMLElement` 对象。
- **`preset`**：选择基础能力组合，默认为包含完整编辑工具的 `'editor'`；仅浏览分析可选 `'viewer'`；无画布数据处理可选 `'headless'`。
- **`renderer`**：在创建时指定渲染后端，默认为 `'webgl2'`，也可显式指定 `'canvas2d'` 或 `'webgpu'`。如果所选 GPU 后端在当前设备或浏览器环境下初始化失败，`Emap.create()` 会直接 reject Promise（不会静默降级为 `canvas2d`），宿主应用可捕获该异常并根据[环境与兼容性](../reference/compatibility.md)显式选择回退后端重新创建。

## 2. 按职责域划分的实例入口

`Emap` 实例将常用能力归纳为清晰的职责入口，方便你在代码中按任务调用：

| 业务职责 | 核心方法或子属性 | 详细指南入口 |
| --- | --- | --- |
| 数据源与渲染图层管理 | `addSource()`、`preflightSource()`、`addLayer()`、`setPaintProperty()` | [数据源与图层](./source-layer.md) / [设置图层样式](../guides/styling.md) |
| 相机定位与可视范围 | `jumpTo()`、`easeTo()`、`flyTo()`、`fitBounds()`、`setExtent()` | [控制相机与视图](../guides/camera.md) |
| 要素只读查询与选择集 | `features`、`queryFeatures()`、`select()`、`deselect()`、`clearSelection()` | [选择与查询要素](../guides/selection.md) |
| 属性编辑、几何编辑与空间操作 | `attributes`、`editSession`、`beginTransaction()`、`ops` | [编辑几何](../guides/editing.md) / [执行数据操作](../data/operations.md) |
| 运行时扩展、控件与 AI 能力 | `ctx`、`controls`、`capabilities` | [编写与安装插件](../guides/plugins.md) |

调用各方法时，请留意其同步或异步签名（以[生成的 API 文档](/mapseekai/emap/api/)为准）：特别是 `addSource()`、`addControl()`、`reproject()` 与 `ops.*` 均为异步方法，必须 `await` 其完成后再执行依赖它们结果的后续步骤。

## 3. 项目坐标系（CRS）与屏幕像素换算

每张 `Emap` 实例维护一个当前活动的项目坐标系（Project CRS）：

- **建立与校验 CRS**：你可以在注册第一个数据源前调用 `map.setCRS()` 预设项目坐标系；当数据源接入时，地图会自动校验其坐标系与当前项目 CRS 是否一致。如果需要将地图中已有的数据整体转换到另一个坐标系，请调用 `await map.reproject(targetCrs)`。
- **屏幕像素与地图坐标互转**：`map.project(x, y)` 和 `map.unproject(px, py)` 仅用于在“当前项目坐标”与“画布本地像素坐标”之间执行仿射变换，不会进行经纬度与平面投影之间的 EPSG 转换。关于相机、事件与坐标系的详细约定，请查阅[坐标与 CRS](./coordinates-crs.md) 与[事件参考](../reference/events.md)。

## 4. 销毁实例与释放资源

当包含地图的页面路由切换或组件卸载时，请调用 `await map.dispose()`：

```ts
await map.dispose();
```

- **`dispose()` vs. `remove()`**：`remove()` 仅发起同步卸载通知；而 `await map.dispose()` 会等待上下文中的所有插件 Fiber、内置控件、GPU 缓冲区以及地图自建的异步资源彻底清理完毕。如果你打算在同一个 DOM 容器上重新挂载新地图，必须等待 `await map.dispose()` 完成。
- **借用资源的释放边界**：通过 `MapOptions.workerRuntime` 从外部传入的共享 Worker 运行时属于借用资源，`map.dispose()` 不会销毁它；当所有借用该运行时的地图实例均已销毁后，再由创建它的宿主代码调用 `await runtime.dispose()`，详见[配置 Web Worker](../guides/worker.md)。

## API

<span id="核心方法" />
<span id="mapoptions-核心参数" />
<span id="layerspecification" />
<span id="更多创建选项" />
<span id="crs" />
<span id="事件与查询" />
<span id="相机" />
<span id="编辑与数据操作" />
<span id="生命周期" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [MapOptions](/mapseekai/emap/api/interfaces/emap.MapOptions.html)
- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)

## 可运行示例

- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)
- [交互处理器](/mapseekai/emap/examples/interaction-handlers/)
- [撤销与重做](/mapseekai/emap/examples/undo-redo/)

## 实现依据

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/runtime/services/options.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/options.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
