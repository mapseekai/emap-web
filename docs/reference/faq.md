---
id: faq
slug: /reference/faq
title: 常见问题
description: "排查地图显示、数据加载、格式插件和后台处理的常见问题。"
api: ["Emap", "MapOptions", "TopologySource", "SourceLoadError"]
examples: ["geoparquet-viewer","web-worker"]
stability: stable
verifiedVersion: unreleased
---

# 常见问题与排错指南（FAQ）

当你在集成 Emap 过程中遇到地图不显示、坐标跑偏、编辑无响应或部署后 Worker 报错时，可以按本页的症状清单快速定位原因。排查问题时建议先保留原始输入文件与控制台错误栈，不要通过盲目重复导入或随意切换配置掩盖根因。

## 1. 页面上有 DOM 容器，但地图画布完全空白？

<span id="核心问题" />

请按以下顺序检查：

1. **检查容器尺寸**：在浏览器开发者工具中检查目标 `<div>` 的计算后宽高（Computed Width / Height），确认它在调用 `Emap.create()` 时已经挂载到 DOM 树且宽高均大于 `0`（常见原因是父容器使用了未撑开的 Flex/Grid 布局或隐藏 Tab）。
2. **检查 `container` 参数格式**：传入字符串时应直接写元素 ID（如 `container: 'map'`），**不要带 `#` 号**（写成 `'#map'` 会找不到元素）。
3. **捕获异步创建异常**：确认调用 `await Emap.create()` 时使用了 `try/catch`。如果当前环境不支持默认的 `'webgl2'`，会抛出初始化异常，此时可显式传入 `renderer: 'canvas2d'` 验证。详见[安装与环境配置](../getting-started/installation.md)与[环境与兼容性](./compatibility.md)。

## 2. 地图已经创建成功，为什么加载的数据看不见？

<span id="如何设置地图显示" />
<span id="如何显示指定图层" />

画布存在但没有绘制出任何图形时，逐一核对以下五个环节：

1. **是否等待了全部异步步骤**：确认 `TopologySource.fromBytes()` / `fromUrl()` 和 `map.addSource()` 都已经 `await` 完成，之后才调用 `map.addLayer()`。
2. **核对三种 ID 是否拼写一致**：渲染图层的 `source` 必须等于 `addSource(id, source)` 注册的 ID；多图层数据源的 `source-layer` 必须等于 `source.getLayers()` 中的数据图层名称。
3. **是否将相机定位到了数据范围**：如果数据位于北京而默认相机还在 `(0, 0)`，画布自然看起来是空的。请调用 `const bounds = source.getExtent(); if (bounds.hasBounds()) map.fitBounds(bounds)` 将视口移至数据所在区域。
4. **检查图层可见性与过滤条件**：确认未调用 `setLayerVisibility(id, 'none')`，图层 `paint` 的不透明度（`opacity`）不为 `0`，且图层 `filter` 没有把所有记录过滤掉。详见[数据源与图层](../concepts/source-layer.md)。

## 3. 要素位置明显偏移，或者距离/面积测量结果不对？

这通常是坐标系（CRS）混用导致的：

1. **核对坐标顺序与源 CRS**：GeoJSON 经纬度遵循 `[经度, 纬度]`（`[lng, lat]`）顺序，切勿填反；导入无 `.prj` 的外部数据时，使用 `map.preflightSource()` 确认源 CRS，不要把 `EPSG:3857` 的米制平面坐标直接标成 `EPSG:4326` 经纬度。
2. **不要把 `map.project()` 当作投影转换**：`map.project(x, y)` 只是将当前项目坐标换算为画布屏幕像素；跨坐标系转换数据请调用 `await map.reproject(targetCrs)` 或 `map.ops.projectLayer()`。
3. **注意事件中 `lngLat` 的真实含义**：`feature:click` 等事件中的 `lngLat` 字段返回的是当前项目 CRS 坐标，并非在任何投影下都是经纬度。详见[坐标空间与坐标系（CRS）](../concepts/coordinates-crs.md)。

## 4. 已经选中了要素，为什么无法拖拽顶点或绘制编辑？

1. **检查地图 `preset`**：确认创建地图时使用的是默认的 `'editor'` 预设；如果使用了 `'viewer'` 预设，默认不会装配几何编辑 Handler。
2. **检查目标图层与 Handler 激活状态**：确认已对目标编辑 Handler（如 `map.vertexEdit` 或 `map.drawFeature`）设置了正确的 `source` 与 `sourceLayer`（数据图层名），并调用了 `.enable()`；同时确保没有其他互斥的选择/测量 Handler 正在抢占鼠标拖拽手势。
3. **检查要素索引是否已失效**：如果刚才执行过删除、合并或 `setData()` 替换，旧的 `FeatureRef.id` 可能已失效，需重新点选或查询要素。同时确认没有悬而未决的未关闭事务（`Transaction`）阻塞了新编辑。详见[编辑几何与管理事务](../guides/editing.md)。

## 5. 直接修改了 `feature.properties.xxx`，为什么画面和面板没反应？

`map.features.get(ref)` 返回的 `feature.properties` 是**冻结的只读快照**，而 `source.getDataset()` 返回的是只读实时视图，直接赋值不会触发地图版本更新或样式重绘。

请改用 `map.attributes.setFeatureProperties(ref, { ... })` 提交属性修改，检查返回的 `result.ok` 为 `true` 后再刷新你的外部业务面板。详见[读取和修改属性](../data/attributes.md)。

## 6. 本地开发正常，为什么打包部署后 Worker 或 WASM 报错？

打开浏览器开发者工具的 **Network（网络）** 面板，找到报错的 `.js` 或 `.wasm` 请求：

1. **排查 SPA 路由回退（最常见）**：如果请求状态码是 `200`，但响应类型（`Content-Type`）是 `text/html`（内容是站点的 `index.html`），说明 Worker / WASM 静态文件没有部署到该 URL，或者未拼接站点的子路径 `baseUrl`。
2. **检查版本匹配与响应头**：确认部署的 `emap-worker.js`、`mapshaper-vendor.js` 及 `.wasm` 文件与当前安装的 `@mapseekai/emap` 版本完全一致，且服务器返回了正确的 `application/javascript` / `application/wasm` MIME 类型与合规的 CSP 策略。详见[配置 Web Worker](../guides/worker.md)。

## 7. 为什么设置了图层 `filter` 后，导出的文件里仍然包含被隐藏的要素？

渲染图层上的 `filter` 属性属于**纯视觉与点击命中过滤**，它只控制当前图层画哪些要素，绝不会删减底层 `TopologySource` 中的数据记录。

如果你希望导出的文件只包含符合条件的要素子集，请先通过 `map.ops.filterFeatures()` 或 DuckDB 查询生成筛选后的数据集，再调用 `source.export()` 导出。详见[导入与导出数据格式](../data/formats.md)。

## 8. 打开大体积矢量或影像文件后，页面出现卡顿或内存升高怎么办？

1. **先分阶段定位瓶颈**：区分卡顿是发生在一次性文件解析阶段、空间计算阶段，还是日常拖拽渲染阶段。
2. **针对性开启优化开关**：本地大尺寸 GeoTIFF 务必直接传入 `File` 并配合内部/外部金字塔（`.ovr`）按窗口读取，切勿调用 `file.arrayBuffer()`；高密度矢量渲染可开启 `geometryLod`、`pointLod` 与 `screenPathFiltering`；耗时空间操作可配置 `useWorker: 'auto'` 卸载到后台线程。详见[定位和改善性能](../recipes/performance.md)。

## 9. 在 Vue 3 中使用时报错 `Cannot read private member` 或 `Context is destroyed`？

**原因**：Vue 3 的深度响应式系统（`ref(map)` 或 `reactive({ map })`）会对对象创建 Proxy 代理。由于 `Emap` 内部包含 ECMAScript 私有成员（`#field`）以及 Cordis 依赖注入上下文，Proxy 代理拦截会导致私有成员访问越权失败或 Context 丢失。

**解法**：在 Vue 3 中保存地图实例时，**必须使用 `shallowRef` 或 `markRaw`**：

```ts
import { shallowRef } from 'vue';
import type { Emap } from '@mapseekai/emap';

const map = shallowRef<Emap | null>(null);
```

## 10. React 严格模式（StrictMode）下地图重复渲染或报错？

**原因**：React 18 / 19 的严格模式在本地开发环境下会故意执行两次挂载与卸载（Mount -> Unmount -> Mount），以检测组件清理是否完整。如果第一次异步 `Emap.create()` 尚未完成就触发卸载，或者未在清理钩子中调用 `map.dispose()`，会导致两个 Canvas 实例重叠或向已销毁的上下文派发事件。

**解法**：在 `useEffect` 中处理已取消的创建，并将创建与异步销毁串行化后再复用容器。完整代码模式请参见[安装与环境配置：React 接入最佳实践](../getting-started/installation.md#react-18--19-与-nextjs)。

## 11. 窗口缩放或折叠侧边栏后，地图画面被拉伸变形？

**原因**：当页面侧边栏折叠/展开、浏览器进入全屏或弹性布局容器尺寸改变时，地图 Canvas 默认不会自动监听父级容器的样式变动，继续以旧的绘制缓冲区宽高呈现画面，导致像素被拉伸或模糊。

**解法**：使用原生 `ResizeObserver` 监听地图父级容器大小，并在尺寸变化时调用 `map.resize()` 让视口重新适配：

```ts
const observer = new ResizeObserver(() => {
  map.resize();
});
observer.observe(containerElement);
```

## API

<span id="如何加载自己的文件" />
<span id="更多数据格式" />
<span id="更多后台处理" />
<span id="更多错误处理" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [TopologySource](/mapseekai/emap/api/classes/emap.TopologySource.html)
- [SourceLoadError](/mapseekai/emap/api/classes/emap.SourceLoadError.html)

## 可运行示例

- [GeoParquet 查看器](/mapseekai/emap/examples/geoparquet-viewer/)
- [Web Worker](/mapseekai/emap/examples/web-worker/)

## 实现依据

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
