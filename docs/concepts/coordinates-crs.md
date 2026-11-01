---
id: coordinates-crs
slug: /concepts/coordinates-crs
title: 坐标与 CRS
description: "区分地图坐标、Canvas 像素与 CRS，配置坐标系并执行重投影。"
api: ["AffineTransform", "AnimationOptions", "Bounds", "CameraOptions", "DEFAULT_CRS", "Emap", "FitBoundsOptions", "FlyToOptions", "inferFromPrj", "normalizeCrsString", "Projection", "resolveDatasetCRS", "setDatasetCrsMetadata", "Viewport"]
examples: ["crs-switch","project","duckdb-buffer"]
stability: stable
verifiedVersion: unreleased
---

# 坐标空间与坐标系（CRS）

<span id="更多-crs-设置" />
<span id="更多坐标空间" />

空间参考系（CRS，Coordinate Reference System）决定了坐标数值的地理含义与线性/角度单位。在 Emap 中，**底层几何顶点与相机中心使用项目 CRS 坐标，而鼠标交互命中与屏幕绘制使用 Canvas 本地像素坐标**。清晰区分这两个坐标空间以及三类坐标操作，是避免相机定位跑偏和距离/面积测量失真的关键。

## 1. 分清三类名称相近的坐标操作

许多开发者容易混淆 `project()`、`setCRS()` 和 `reproject()`。请对照下表确认它们的真实行为：

| 方法名称 | 输入与输出 | 是否改变底层几何数据 | 核心用途 |
| --- | --- | --- | --- |
| `map.project(x, y)` / `map.unproject(px, py)` | 项目 CRS 坐标与 Canvas 屏幕像素互转 | **否** | 将地图坐标换算为画布上的像素位置（如定位自定义 HTML 浮层），或将鼠标点击像素反算为地图坐标 |
| `map.setCRS(crs)` | CRS 标识字符串（如 `'EPSG:3857'`） | **否** | 在**尚未加载任何数据的空地图**上预设项目坐标系约定 |
| `await map.reproject(targetCrs)` | 目标 CRS 标识字符串 | **是（转换已注册矢量数据源与视图）** | 将地图内矢量数据源的几何坐标重投影到新坐标系，并记录到编辑历史 |

需要特别留意两个命名细节：

1. **`map.project()` 不做 EPSG 投影转换**：它只是当前相机视口矩阵的屏幕投影变换。
2. **要素事件中的 `lngLat` 字段**：在 `feature:click` 等事件载荷中，虽然字段名沿用了 `lngLat`，但其中的坐标值始终属于**当前项目 CRS**（如果项目处于平面投影坐标系，该值就是平面坐标，切勿无条件当作经纬度使用）。

## 2. 建立与统一项目 CRS

一张地图在同一时刻只有一个活动的项目 CRS：

- **自动继承首个数据源的 CRS**：如果你没有预先调用 `setCRS()`，当第一个数据源通过确认注册到地图时，地图会自动采用该数据源的 CRS 作为项目 CRS；后续注册的其他数据源必须与该项目 CRS 保持一致（或通过导入流程转换一致）。
- **在空地图上显式预设 CRS**：你也可以在添加任何数据源之前，主动声明项目所使用的坐标系：

```ts
map.setCRS('EPSG:3857');
```

**严禁凭数值大小猜测缺失的 CRS**：当导入的数据缺少 CRS 元数据（或 `.prj` 内容无法识别）时，不要仅仅因为坐标数值在 `[-180, 180]` 之间就盲目篡改元数据标签。请通过[数据源预检（`preflightSource`）](./source-layer.md)向用户询问原始坐标系，区分“为无标签数据补齐正确的源 CRS 声明”与“在不同 CRS 之间执行数学重投影”。

## 3. 在项目坐标与 Canvas 像素之间换算

当你需要把自定义的 React / Vue 悬浮卡片精准定位到地图上的某个坐标点，或者把屏幕像素位置反算回地图坐标时，使用 `project()` 与 `unproject()`：

```ts
const [pixelX, pixelY] = map.project(500000, 3400000);
const [mapX, mapY] = map.unproject(pixelX, pixelY);
console.log(mapX, mapY);
```

注意：

- 上例中的 `(500000, 3400000)` 应替换为你当前项目 CRS 下的真实坐标。
- `pixelX` 和 `pixelY` 是相对于地图 Canvas 容器左上角的本地像素坐标；如果你从原生 `window` 鼠标事件中拿到的是 `clientX` / `clientY`，需先减去地图容器的 `getBoundingClientRect()` 偏移量。
- 相机控制中的 `center` 同样使用项目坐标，任意 CRS 下均可使用正数 `scale` 控制缩放比例；关于 `zoom` 与 `scale` 的详细换算关系见[控制相机与视图](../guides/camera.md)。

## 4. 重投影整张地图 vs. 按目标 CRS 导出副本

根据业务需求的不同，你可以选择转换当前工作区，或者仅在导出文件时转换坐标系：

1. **转换当前地图工作区**：调用 `await map.reproject(targetCrs)`，地图内所有矢量数据源的坐标和相机视口会同步重投影到 `targetCrs`，且该操作支持撤销与重做。
2. **仅导出另一坐标系的副本**：如果希望当前地图保持原坐标系不变，仅生成一个转换到 `EPSG:3857` 或 `EPSG:4326` 的外部文件供下载，请调用 `map.ops.projectLayer()`：

```ts
const result = await map.ops.projectLayer({
  source: 'districts', target: 'districts', crs: 'EPSG:3857',
  output: { format: 'geojson', filename: 'districts-3857.geojson' },
});
if (!result.ok) console.error(result.error);
else console.log(result.value.blob, result.value.filename);
```

最后，在执行缓冲区（Buffer）、最近邻或面积计算前，请务必确认目标分析工具对 CRS 的要求：例如 GeoJSON 规范默认期望 `EPSG:4326` 经纬度，而 [DuckDB 空间处理](../data/duckdb.md) 中的平面距离算子则明确要求输入数据必须位于投影坐标系中（以米或投影线性单位计算）。

## API

<span id="核心方法" />
<span id="更多重投影" />
<span id="范围距离和单位" />
<span id="相机-zoom-与-scale" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [Bounds](/mapseekai/emap/api/classes/emap.Bounds.html)
- [AffineTransform](/mapseekai/emap/api/classes/emap.AffineTransform.html)
- [Projection](/mapseekai/emap/api/classes/emap.Projection.html)
- [Viewport](/mapseekai/emap/api/classes/emap.Viewport.html)
- [CameraOptions](/mapseekai/emap/api/interfaces/emap.CameraOptions.html)
- [AnimationOptions](/mapseekai/emap/api/interfaces/emap.AnimationOptions.html)
- [FitBoundsOptions](/mapseekai/emap/api/interfaces/emap.FitBoundsOptions.html)
- [FlyToOptions](/mapseekai/emap/api/interfaces/emap.FlyToOptions.html)
- [DEFAULT_CRS](/mapseekai/emap/api/variables/emap.DEFAULT_CRS.html)
- [resolveDatasetCRS](/mapseekai/emap/api/functions/emap.resolveDatasetCRS.html)
- [normalizeCrsString](/mapseekai/emap/api/functions/emap.normalizeCrsString.html)
- [inferFromPrj](/mapseekai/emap/api/functions/emap.inferFromPrj.html)
- [setDatasetCrsMetadata](/mapseekai/emap/api/functions/emap.setDatasetCrsMetadata.html)

## 可运行示例

- [CRS 切换](/mapseekai/emap/examples/crs-switch/)
- [投影操作](/mapseekai/emap/examples/project/)
- [DuckDB buffer](/mapseekai/emap/examples/duckdb-buffer/)

## 实现依据

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/geo/projection.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/geo/projection.ts)
- [`src/engine/map/ops/project.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/ops/project.ts)
