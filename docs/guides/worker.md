---
id: worker
slug: /guides/worker
title: Web Worker
description: "配置后台操作路由、Worker 资源和任务生命周期。"
api: ["Emap", "MapOptions", "MapshaperWorkerPool", "MapshaperWorkerPoolOptions", "createEmapWorkerRuntime", "EmapWorkerRuntimeOptions", "EmapWorkerPool"]
examples: ["web-worker"]
stability: stable
verifiedVersion: unreleased
---

# 配置 Web Worker

<span id="更多路由控制" />
<span id="使用自有-worker-池" />

将耗时的数据解析、空间计算与栅格解码卸载到 Web Worker，可以避免大文件操作阻塞浏览器主线程，保持地图拖拽与界面交互流畅。需要注意的是，**后台线程将计算移出了主线程，但并不会消除内存开销**；Mapshaper 空间操作、GPU 几何准备、MSDF 文本图集、GeoTIFF 与 GeoPackage 各自走不同的任务通道，应按需配置并测量。

## 1. 开启 Mapshaper 数据操作的后台路由

在 `MapOptions` 中，`useWorker` 默认为 `false`，该开关专门控制 `map.ops.*`（Mapshaper 数据操作）是否路由到后台 Worker：

- `false`（默认）：所有 Mapshaper 操作在主线程执行。
- `true`：强制将支持后台执行的 Mapshaper 操作发送到 Worker。
- `'auto'`：根据操作类型与当前数据集规模智能选择。默认顶点数阈值（`workerThreshold`）为 `50,000`，对于缓冲区、叠加裁剪等高计算复杂度命令会自动采用减半阈值，而字段重命名等轻量元数据修改则直接留在主线程完成。

```ts
const routedMap = await Emap.create({
  container: 'map',
  useWorker: 'auto',
  workerThreshold: 50_000,
  workerUrl: '/assets/emap/emap-worker.js',
  workerPoolSize: 2,
});
// 当不再需要该地图实例时：
await routedMap.dispose();
```

如果需要更细粒度的控制，可以通过 `workerRouting` 回调函数，结合命令名称、顶点数、属性记录数与默认路由建议自行决定是否走 Worker。在调大 `workerPoolSize` 并发数之前，建议先评估数据跨线程传输、快照复制和并发临时结果的内存占用。

## 2. 在多张地图间共享统一 Worker 运行时

<span id="统一-tasklane-运行时" />

当页面中存在多张地图实例，或者同时启用了多种后台能力（Mapshaper、GPU 几何、MSDF 字体、GeoTIFF、GeoPackage）时，推荐使用 `createEmapWorkerRuntime()` 创建一个统一的共享运行时：

```ts
import { Emap, createEmapWorkerRuntime } from '@mapseekai/emap';

const runtime = createEmapWorkerRuntime({
  urls: {
    mapshaper: '/assets/emap/emap-worker.js',
    geometry: '/assets/emap/emap-geometry-worker.js',
    msdf: '/assets/emap/emap-msdf-worker.js',
    geotiff: '/assets/emap/emap-geotiff-worker.js',
    geopackage: '/assets/emap/emap-geopackage-worker.js',
  },
});
const map = await Emap.create({ container: 'map', workerRuntime: runtime });
// 销毁顺序：先销毁借用该运行时的所有地图消费者，最后释放共享运行时。
await map.dispose();
await runtime.dispose();
```

**所有权约定**：向 `Emap.create()` 传入 `workerRuntime` 表示地图只是**借用**该运行时，调用 `map.dispose()` 时不会销毁 `runtime`，从而避免影响其他正在运行的地图实例。当所有消费者都销毁完毕后，由创建 `runtime` 的宿主代码调用 `await runtime.dispose()`。注意不要将旧式的独占 `workerPool` 实例同时传给多张地图并让各自销毁。

## 3. 部署 Worker 与 Vendor 静态资源

<span id="发布-worker-资源" />

启用任何后台 Worker 或 WASM 功能时，宿主应用必须确保对应的静态资源文件已正确部署且可被浏览器访问：

1. **保持版本严格一致**：主线程打包产物、`emap-worker.js`、同目录下的 `mapshaper-vendor.js`（或 `.mjs`）以及 GeoPackage 的 Worker / SQL.js WASM 必须来自同一次 `@mapseekai/emap` 版本构建。
2. **核对生产环境路径与响应类型**：静态站点的 `baseUrl`、跨域头（CORS）和内容安全策略（CSP）都会影响 Worker 加载。请在本地开发与生产构建预览环境下分别触发一次真实的 Worker 任务，在浏览器网络面板中确认请求返回的是真正的 `application/javascript` 或 `application/wasm` 内容，而不是单页应用（SPA）路由未命中时回退的 `index.html`。
3. **独立控制的渲染辅助 Worker**：用于 GPU 渲染准备的 `geometryWorkerUrl` 与 `msdfWorkerUrl` 只要配置了有效 URL 即可工作，不受 Mapshaper 的 `useWorker` 开关限制。

### 复制包内静态资源

Worker 和 WASM 文件位于包的 `dist/` 目录，不在 `dist/workers/` 中。以下命令将全部相关资源复制到示例使用的 `/assets/emap/` 路径；只使用部分功能时，也可以仅复制[兼容性清单](../reference/compatibility.md)中对应的资源：

```sh
mkdir -p public/assets/emap
cp node_modules/@mapseekai/emap/dist/*-worker.js \
  node_modules/@mapseekai/emap/dist/mapshaper-vendor.js \
  node_modules/@mapseekai/emap/dist/mapshaper-vendor.mjs \
  node_modules/@mapseekai/emap/dist/sql-wasm.wasm public/assets/emap/
cp -R node_modules/@mapseekai/emap/dist/msdf public/assets/emap/
```

每次升级 `@mapseekai/emap` 后重新复制，或将等效复制步骤纳入项目构建。若应用部署在子路径下，请相应调整上面的 URL。

## 4. 任务取消、版本校验与诊断事件

在后台任务执行期间，用户可能会取消操作或继续编辑地图，Emap 通过以下机制保障状态一致性：

- **提交前版本校验**：当后台 Worker 完成计算并将结果传回主线程时，主线程会在提交前核对目标 `TopologySource` 的身份、几何版本号与属性版本号。如果期间数据源已被修改或替换，主线程会拒绝覆盖并返回 `stale-operation` 错误，确保不会用过期计算结果冲掉用户的新编辑。
- **精准取消单个作业**：通过 `AbortSignal` 取消后台任务只会中止当前作业，不会破坏共享运行时的初始化状态；但如果后台栅格会话因异常丢失，应用需引导用户重新打开数据源。
- **监控耗时与资源预算**：你可以监听地图的 `workerjobstart` 和 `workerjobend` 事件获取任务 ID、命令类型和往返耗时（`durationMs`）。分析性能时，请区分**队列等待时间**、**Worker 实际计算时间**与**主线程提交耗时**；同时注意运行时内存预算控制的是受管任务队列准入，并不等同于整个浏览器进程的物理内存（RSS）硬上限。

## 可运行示例

- [Web Worker](/mapseekai/emap/examples/web-worker/)

## 实现依据

<span id="核心参数" />
<span id="结果提交与版本检查" />
<span id="连续任务与物理释放" />
<span id="二进制传输与预算" />

- [`src/engine/map/worker-routing.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/worker-routing.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
