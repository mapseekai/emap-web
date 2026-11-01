---
id: camera
slug: /guides/camera
title: 相机
description: "设置地图中心、缩放和范围，并读取相机状态与事件。"
api: ["Emap", "Bounds", "Viewport", "CameraOptions", "AnimationOptions", "FlyToOptions", "FitBoundsOptions"]
examples: ["getting-started/vector-file","crs-switch"]
stability: stable
verifiedVersion: unreleased
---

# 控制相机与视图

Emap 通过相机（Camera）控制画布当前显示的中心坐标、缩放比例和可视范围。你可以通过 `jumpTo()`、`easeTo()`、`flyTo()` 或 `fitBounds()` 定位地图视图，并通过相机事件同步外部界面状态。

以下示例均假设你已经创建并就绪了 `map` 实例；涉及数据范围定位的代码还要求目标 `source` 已经注册且坐标系与地图一致。

## 1. 选择合适的定位方式

根据交互场景的不同，Emap 提供了四种主要的视图定位方法：

| 方法 | 过渡行为 | 典型适用场景 |
| --- | --- | --- |
| `map.jumpTo(options)` | 立即切换视图，无动画 | 首次打开页面恢复上次保存的视图状态，或切换坐标系后重置位置 |
| `map.easeTo(options)` | 平滑插值过渡 | 用户点击列表项定位到相邻要素，或平滑调整缩放级别 |
| `map.flyTo(options)` | 沿飞行曲线跨越较大距离 | 从全局视图飞入某个城市或具体业务地块 |
| `map.fitBounds(bounds, options)` | 自动计算中心点与缩放比例以容纳目标矩形 | 数据加载完成后自动完整展示整个图层，支持配置四周 `padding` |

最常用的场景是在数据加载后让视口自动适配数据边界。调用 `fitBounds()` 前，请先通过 `bounds.hasBounds()` 确认边界非空（空图层没有有效坐标范围，应当跳过适配）：

```ts
const bounds = source.getExtent();
if (bounds.hasBounds()) {
  map.fitBounds(bounds, { padding: 32, duration: 0 });
}
```

关于单点要素、零宽边界框以及合并多个数据源范围的详细做法，请参见[适配数据范围](../recipes/fit-bounds.md)。

## 2. 正确使用坐标、Scale 与 Zoom

在读写相机位置时，务必区分项目坐标与经纬度，以及 `scale` 与 `zoom` 的关系：

- **`center` 使用项目 CRS 坐标**：相机选项中的 `center` 始终采用当前地图的项目坐标系（CRS）。切勿将 `EPSG:3857` 下的米制坐标当作经纬度传入，也不要把经纬度直接传给平面投影地图。
- **`scale` 与 `zoom` 的优先级**：`scale` 必须为正数；在同一组更新参数中如果同时提供了 `scale` 和 `zoom`，以 `scale` 为准。
- **保存与恢复视图的推荐方式**：在 WebMercator（`EPSG:3857`）下，便捷的地理缩放级别与通用相机事件中的 `zoom`（定义为 `log2(scale)`）并不等价；同时 `map.getCenter()` 在 WebMercator 下返回经纬度，不能直接原样传回该投影的相机 `center`。若要在同一 CRS 下保存并恢复视图，可在 `moveend` 回调中保存事件的项目坐标 `center` 和 `Math.abs(map.getTransform().mx)` 作为 `scale`；事件载荷本身没有 `scale` 字段。如果跨 CRS 恢复视图，还需先将中心点转换到目标坐标系。

## 3. 控制动画与像素平移

<span id="范围管理" />

所有过渡动画的 `duration` 单位均为毫秒；传入 `animate: false` 或 `duration: 0` 可直接关闭动画过渡。

当页面弹出侧边抽屉或悬浮面板遮挡了部分画布时，可以使用 `panBy([dx, dy])` 按屏幕像素偏移视口，或者调用 `stop()` 立即中止正在进行的相机动画：

```ts
map.panBy([80, 0], { duration: 250 });
map.stop();
```

当用户快速连续点击多个定位按钮时，明确决定是让新动画接管还是先调用 `stop()` 中断上一次动画。如果页面容器大小刚刚发生改变（例如折叠了侧边栏），请确保容器完成布局更新后再执行 `fitBounds()`，以免按旧尺寸计算出偏差的视野。

## 4. 容器尺寸改变时自适应视口（map.resize）

当包含地图的侧边栏展开/折叠、全屏切换或窗口发生缩放时，地图容器的 DOM 像素大小会发生变化。如果 Canvas 仍沿用旧的视口尺寸，会导致画面拉伸模糊或边缘显示空白。

调用 `map.resize()` 让地图 Canvas 重新测量容器尺寸并更新相机投影矩阵：

```ts
// 配合原生 ResizeObserver 监听容器尺寸变化
const resizeObserver = new ResizeObserver(() => {
  map.resize();
});
resizeObserver.observe(document.getElementById('map')!);
```

在组件卸载或地图销毁前，记得调用 `resizeObserver.disconnect()` 释放监听。

## 5. 读取当前范围与监听相机事件

<span id="更多视图操作" />
<span id="读取视图与事件" />

在同步外部 UI 或触发按需数据查询时，按更新频率选择合适的入口：

- **实时跟随覆盖物**：监听高频触发的 `move` 事件，实时更新自定义浮层或十字准星位置。
- **持久化状态或发起重查询**：监听在交互结束时触发一次的 `moveend` 事件，将当前视图写入 URL 参数或发起后端空间查询。
- **读取边界框**：需要当前屏幕可见区域的地图坐标范围时调用 `map.getExtent()`；需要整个数据源的完整包络框时调用 `source.getExtent()`。

完整的相机事件名称与载荷字段说明见[事件参考](../reference/events.md)。

## 可运行示例

- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)
- [CRS 切换](/mapseekai/emap/examples/crs-switch/)

## 实现依据

<span id="核心方法" />
<span id="cameraoptions" />
<span id="animationoptions" />
<span id="fitboundsoptions" />

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/geo/camera.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/geo/camera.ts)
