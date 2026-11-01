---
id: performance
slug: /recipes/performance
title: 性能
description: "配置几何 LOD、Worker 和缓存预算，区分 CPU、GPU 与内存诊断。"
api: ["Emap", "Emap.setGeometryLod", "Emap.setScreenPathFiltering", "MapOptions", "SimplifyOptions"]
examples: ["simplify", "simplify-control", "web-worker", "point-lod", "geometry-lod", "luma-benchmark"]
stability: stable
verifiedVersion: unreleased
---

# 定位和改善性能

在浏览器中处理大规模空间数据时，卡顿或高内存占用可能出现在**文件读取与解析**、**空间计算**、**GPU 几何准备**或**每帧画布绘制**等不同阶段。优化的第一步是定位瓶颈所在阶段，再针对性地启用显示 LOD、Web Worker 卸载或缓存预算控制。

文件体积、总顶点数、属性列宽度、屏幕设备像素比（DPR）和终端显卡能力都会显著影响表现，切勿仅凭“要素个数（Feature Count）”这一项指标来决定性能配置。

## 1. 建立可对比的性能测试基线

在修改任何优化开关前，请先固定测试条件以建立可复现的基线：

1. **固定环境与视图参数**：固定测试数据集、初始相机范围、画布像素宽高、设备像素比（DPR）、渲染后端（`webgl2` / `canvas2d` / `webgpu`）、图层过滤条件以及缓存冷热状态。
2. **分阶段记录耗时**：分别测量**首次加载到首帧可见**、**首次全精度就绪**、**连续拖拽平移**、**缩放停止后细节恢复**以及**单次几何编辑提交**五个阶段的耗时。
3. **区分 CPU 提交与 GPU 完成**：JavaScript 主线程的绘制函数返回并不代表 GPU 已经完成光栅化；汇报性能数据时，请明确区分主线程帧耗时、Worker 往返耗时、端到端完成延迟与稳定帧率（FPS），并注明测试设备配置。

## 2. 降低数据导入与空间处理开销

- **按需裁剪输入范围**：尽早配置 `resourceLimits` 与 `zipLimits`；导入 GeoPackage 时通过 `layers` 参数只读取业务需要的要素表；使用 DuckDB 查询时只投影必需的属性列。
- **大影像使用窗口与金字塔读取**：通过 `File` 或 `FileSystemFileHandle` 按窗口读取本地 GeoTIFF，并在可用时使用内部/外部金字塔（Overview）降低缩小视图的读取量。窗口覆盖范围仍会影响实际解码和内存开销。
- **高成本操作启用 Worker 路由**：将 `useWorker` 设为 `'auto'`，让超过顶点阈值（默认 `50,000` 顶点）的 Mapshaper 空间操作自动卸载到后台 Worker 执行。注意：Worker 能够解放主线程响应，但跨线程数据传输、快照与并发结果依然占用内存，部署与调优方法见[配置 Web Worker](../guides/worker.md)。

## 3. 选择合适的渲染后端

Emap 默认使用 `webgl2` 渲染后端；`canvas2d` 适合小数据量或无 GPU 加速环境的兼容性兜底，`webgpu` 则面向支持 WebGPU 适配器与安全上下文的现代设备。

- 渲染后端在 `Emap.create()` 时确定，运行期切换后端需要销毁旧实例并重新创建地图。
- GPU 几何准备 Worker（`geometryWorkerUrl`）与 MSDF 字体图集 Worker（`msdfWorkerUrl`）独立于 Mapshaper 的 `useWorker` 开关。
- 评估渲染帧率时，请将首次缓冲区上传、多边形三角化、字体图集生成和首次 Shader 编译等**冷启动开销**与后续平滑拖拽的**稳态帧率**区分开来。

## 4. 调整显示细节（LOD）与简化策略

<span id="显示弧-lod" />

当画布在中小比例尺下同时呈现数百万个顶点或密集点群时，可以通过以下开关控制渲染负载。请务必分清**仅影响画面的显示优化**与**真正修改底层数据的简化操作**：

| 控制手段 | 核心作用 | 对底层源数据的影响 |
| --- | --- | --- |
| `geometryLod`（`setGeometryLod()`） | 按屏幕像素容差动态选择线/面显示弧段细节 | **纯显示优化**，不修改源坐标或导出结果 |
| `pointLod` | 按网格抽稀高密度点，保留原始点作为代表，不计算聚类中心 | **纯显示优化**，需结合点选命中与编辑需求评估 |
| `screenPathFiltering`（`setScreenPathFiltering()`） | 对不透明路径执行半设备像素级屏幕空间去重过滤 | **纯显示优化**（独立开关，默认关闭） |
| `map.ops.simplifyLayer()` | 计算并应用拓扑简化阈值 | **修改数据集简化状态**，会影响后续分析与导出 |

关键细节：

- `geometryLod.pixelTolerance` 默认值为 `0.5`（允许范围为 `(0, 64]`），传入 `false` 可关闭几何显示 LOD。
- 不要因为缩小视图下开启了显示 LOD 就误以为原始坐标精度丢失；反过来，如果你已经执行了 `simplifyLayer()` 数据操作，仅关闭显示 LOD 并不会恢复被简化的数据（需通过撤销或重置简化级别恢复）。在进行精细边界核验、顶点编辑或数据导出前，请明确当前使用的是哪一层精度。

## 5. 管理内存预算与诊断统计

<span id="动态栅格内存诊断" />

排查内存增长时，建议分别核查 **CPU 拓扑几何**、**GPU 顶点/纹理缓冲区**、**Worker 传输副本**、**动态栅格块缓存**以及**撤销历史栈**五个来源：

- 单项缓存预算（如 `rasterPlugin({ cacheBytes })`）只约束该服务直接管理的缓存池，不等于整个浏览器标签页进程的物理内存硬上限。
- 动态栅格的 `getStats().performance` 包含累计计数，分析单次缩放或平移开销时请比较操作前后的差值；缓存占用和最近的规划信息则是当前快照。并发 Worker 解码时的各任务耗时之和不等于用户感知的墙钟延迟。
- 在单页应用中切换地图或重开大文件时，务必 `await map.dispose()` 等待异步清理完成，防止旧任务与新地图实例的内存叠加驻留。

## 6. 验证优化是否真正生效

每次调优只改变一个变量，并在相同数据和相同相机路径下对比前后指标。除了观察帧率与耗时外，还必须同时验证**画面正确性、要素点击命中、框选/套索结果、撤销重做历史以及错误事件**，确保性能优化没有破坏业务交互准确性。

## API

<span id="交互更新与数据复用" />
<span id="核心参数" />
<span id="更多-worker-配置" />
<span id="更多优化" />
<span id="simplifyoptions" />
<span id="屏幕同像素去重" />
<span id="视口裁剪参数" />
<span id="更多密集点-lod" />
<span id="pointlod-参数" />
<span id="渲染行为与预算" />
<span id="luma-gpu-真实数据基准与可选点聚合" />
<span id="线数据全精度渲染" />
<span id="快照导航与保守路径过滤" />
<span id="canvas-屏幕过滤luma-实验页" />
<span id="近景退远的缓存恢复" />
<span id="动态-uint16-栅格对照" />
<span id="动态栅格放大补图" />
<span id="原始源块gpu-halo-与文件夹读取" />
<span id="正式-webgl2--webgpu-的导航与缓存" />
<span id="完整-geopackage-浏览器压测" />
<span id="二进制批次与稳定描边缓存" />
<span id="几何缓存和批次效率" />
<span id="有效描边与直接上传缓冲页" />
<span id="有序命令复用与空闲页回收" />
<span id="无损描边格式与依赖失效" />
<span id="有界几何微批次" />
<span id="已驻留描边范围与可见区间合批" />

- `Emap`
- `MapOptions`
- `SimplifyOptions`

## 可运行示例

- [Web Worker](/mapseekai/emap/examples/web-worker/)
- [简化控件](/mapseekai/emap/examples/simplify-control/)
- [几何简化](/mapseekai/emap/examples/simplify/)
- [密集点 LOD / Dense point LOD](/mapseekai/emap/examples/point-lod/)
- [luma WebGL2 Benchmark](/mapseekai/emap/examples/luma-benchmark/)

## 实现依据

- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/engine/map/worker-routing.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/worker-routing.ts)
- [`src/runtime/services/contracts/raster.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/contracts/raster.ts)
