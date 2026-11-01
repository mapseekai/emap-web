---
id: fit-bounds
slug: /recipes/fit-bounds
title: 适配范围
description: "使用数据范围调整地图视图，配置内边距和动画。"
api: ["Emap", "Bounds", "FitBoundsOptions"]
examples: ["getting-started/vector-file", "getting-started/polygon-fill"]
stability: stable
verifiedVersion: unreleased
---

# 适配数据范围

当矢量数据源解析完成并注册到地图后，调用 `map.fitBounds()` 可以根据当前容器尺寸自动计算中心坐标与缩放比例，将目标要素完整展示在视口中央。在调用前，务必先通过 `hasBounds()` 检查边界是否有效，避免空图层或异常坐标导致相机定位失败。

## 1. 自动适配单个数据源

对于已经加载并注册到地图的 `source`（且其坐标与当前地图项目 CRS 一致），可以先读取 `source.getExtent()`，验证非空后执行适配：

```ts
const extent = source.getExtent();
if (extent.hasBounds()) {
  map.fitBounds(extent, { padding: 48, duration: 0 });
}
```

- **`padding`**：为画布四周预留的内边距（单位：像素），防止多边形顶点或线端点紧贴画布边缘。
- **`duration`**：首次打开页面加载数据时，建议设为 `0` 直接呈现结果画面；当用户在界面上点击“定位到图层”按钮时，可以设置平滑过渡时长（如 `300` 毫秒）。

## 2. 适配已知的坐标边界框

如果你已经从业务接口或配置中拿到了目标区域的边界坐标数组，可以使用 `Bounds.fromArray([xmin, ymin, xmax, ymax])` 构造 `Bounds` 实例：

```ts
import { Bounds } from '@mapseekai/emap';

const knownBounds = Bounds.fromArray([116.2, 39.7, 116.6, 40.1]);
if (knownBounds.hasBounds()) map.fitBounds(knownBounds, { padding: 24 });
```

注意：传入数组的坐标值必须与当前地图的项目 CRS 一致。上例中的 `[116.2, 39.7, 116.6, 40.1]` 是经纬度范围，仅适用于经纬度坐标系；如果地图当前处于 `EPSG:3857` 或其他投影坐标系，请先将边界坐标转换到目标 CRS，不能只修改坐标系标签而直接传入原始经纬度。

## 3. 处理多数据源、单点要素与侧边面板遮挡

在复杂业务界面中，适配范围时常遇到以下三种边界情况：

1. **合并多个数据源的范围**：如果页面同时加载了多个数据源，请先合并各个有效 `Bounds` 得到总包络框，再调用一次 `map.fitBounds()`。切勿在循环中对每个数据源连续调用 `fitBounds()`，否则最后一次调用会覆盖前面的视图。
2. **单点或零宽高边界**：当边界宽高都为零时，`fitBounds()` 保持当前 `scale`（并应用可选的 `maxScale`），不会自动放大到该点；需要指定视野时可先扩展边界或显式设置缩放比例。
3. **侧边栏或悬浮面板遮挡**：如果页面左侧或右侧有固定宽度的业务面板覆盖在地图上方，或者容器刚刚发生折叠/展开，请等待 DOM 布局稳定后再计算适配范围，并通过 `padding` 留出安全可视区域。

## 4. 验证适配效果

接入完成后，建议在以下场景下验证视图表现：

- 目标要素四周是否留有均匀边距，且不被四角控件遮挡。
- 导入不含任何几何记录的空图层时，代码是否能安全跳过 `fitBounds()` 并保持当前视图不变。
- 浏览器窗口缩放或侧边栏折叠后，再次触发适配是否能按新容器尺寸正确居中。更多相机控制参数请参见[控制相机与视图](../guides/camera.md)。

## API

<span id="核心参数" />
<span id="更多-bounds-操作" />

- `Emap`
- `Bounds`
- `FitBoundsOptions`

## 可运行示例

- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)
- [面填充](/mapseekai/emap/examples/getting-started/polygon-fill/)

## 实现依据

- [`src/domain/geo/bounds.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/geo/bounds.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
