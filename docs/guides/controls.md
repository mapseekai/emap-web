---
id: controls
slug: /guides/controls
title: 控件
description: "挂载地图控件，配置导航、图层、选择和编辑工具。"
api: ["BasemapControl", "BasemapOptions", "BasemapStyle", "BoxSelectControl", "BoxSelectControlOptions", "Control", "ControlPosition", "DrawFeatureControl", "DrawFeatureControlOptions", "EditToolbar", "EditToolbarOptions", "Emap", "GetScaleMetricsOptions", "HistoryControl", "HistoryControlOptions", "LassoSelectControl", "LassoSelectControlOptions", "LayerChangeEvent", "LayerChangeReason", "LayerControl", "MapLibreBasemapService", "MapLibreIntegrationOptions", "MapLibreOverlayService", "MapLibreOverlayServiceBase", "MapLibreOverlayResourceService", "MapLibreOverlayStyleService", "MapLibreServiceChangeEvent", "MapLibreServiceChangeReason", "MapLibreServiceErrorEvent", "MapLibreServiceEventMap", "MapLibreServiceManager", "MapLibreServiceState", "MapOptions", "MeasureControl", "MeasureControlOptions", "MeasureHandler", "MeasurementMode", "MeasureOptions", "MeasureResult", "NavigationControl", "NavigationOptions", "ScaleCalculationMethod", "ScaleControl", "ScaleControlOptions", "ScaleControlStyle", "ScaleMetrics", "ScaleViewMetrics", "SimplifyControl", "SimplifyControlOptions", "StatusControl", "StatusOptions", "VertexEditControl", "VertexEditControlOptions"]
examples: ["lasso-select","china-editing","draw-snap","interaction-handlers","measurement","online-map-services","simplify-control","vertex-editing"]
stability: stable
verifiedVersion: unreleased
---

# 添加地图控件

<span id="更多控件与参数" />

地图控件（Controls）为用户提供悬浮在画布四角的交互按钮与状态读数面板。虽然内置预设（如 `editor` 或 `viewer`）会自动注册底层服务与控件工厂，但为了保持宿主界面整洁，Emap 不会默认往画布上塞满按钮，应用需要根据自身界面布局显式挂载所需控件，并确保已导入 `@mapseekai/emap/style.css`。

## 1. 挂载与移除内置控件

当 `map` 实例就绪后，你可以实例化控件类并调用 `await map.addControl(control, position)` 将其挂载到画布的四个角落之一（`'top-left'`、`'top-right'`、`'bottom-left'` 或 `'bottom-right'`）：

```ts
import '@mapseekai/emap/style.css';
import { HistoryControl, NavigationControl, ScaleControl } from '@mapseekai/emap';

const navigation = new NavigationControl({ showHome: true });
await map.addControl(navigation, 'top-left');
await map.addControl(new HistoryControl(), 'top-right');
await map.addControl(new ScaleControl(), 'bottom-left');
```

`addControl()` 和 `removeControl()` 均为异步方法，调用时请使用 `await` 等待挂载或卸载完成：

- **单独卸载某个控件**：调用 `await map.removeControl(navigation)`。
- **随地图一起销毁**：当调用 `await map.dispose()` 销毁地图实例时，地图会自动清理并释放当前已挂载的所有控件，无需逐个手动移除。

## 2. 常用内置控件选型表

你可以根据页面任务从下表中选择对应的内置控件：

| 业务需求 | 控件类名称 | 功能说明与注意事项 |
| --- | --- | --- |
| 缩放与一键复位视野 | `NavigationControl` | 提供放大、缩小及可选的回到初始/数据范围（`showHome`）按钮 |
| 撤销与重做操作 | `HistoryControl` | 自动监听编辑历史变化并更新按钮禁用状态，详见[撤销与重做](../recipes/undo-redo.md) |
| 显示比例尺与鼠标坐标 | `ScaleControl`、`StatusControl` | 显示当前比例尺线段，或在角落实时展示指针坐标与活动 CRS，详见[显示坐标状态](../recipes/status-control.md) |
| 图层显隐与在线底图切换 | `LayerControl`、`BasemapControl` | 管理图层可见性，或配合 MapLibre 服务切换在线底图与叠加层 |
| 框选與套索选择 | `BoxSelectControl`、`LassoSelectControl` | 切换矩形框选与自由套索选择模式 |
| 要素绘制、顶点编辑与工具栏 | `DrawFeatureControl`、`VertexEditControl`、`EditToolbar` | 启动交互式几何绘制与编辑，要求目标 `source` 与数据图层已存在，详见[编辑几何](./editing.md) |
| 交互式简化预览 | `SimplifyControl` | 提供滑块动态调整并应用图层简化阈值 |
| 距离与面积测量 | `MeasureControl` | 在地图上点选测量长度或面积；测量结果依赖当前 CRS 与 `MeasurementMode`，状态栏有坐标读数不代表当前 CRS 必然以米为单位 |

## 3. 通过注册表挂载或编写自定义控件

除了直接 `new` 控件实例外，你也可以使用控件注册表按名称挂载预设中已注册的控件工厂，例如执行 `await map.controls.add('navigation')`。注意：如果创建地图时使用了精简的 `empty` 预设，必须在挂载控件前自行安装该控件所依赖的运行时服务。

如果内置控件不能满足业务 UI 需求，你可以实现从根入口导出的 `Control` 接口编写自定义控件。`onAdd` 和 `onRemove` 接收的是能力受限的 `ControlContext`，不是完整的 `Emap` 实例：

1. 在 `onAdd(map)` 方法中创建并返回控件的根 DOM 元素，同时绑定所需的 DOM 事件与 `map.on(...)` 监听。
2. 在 `onRemove(map)` 方法中解除所有事件订阅并清理创建的资源。
3. **无障碍与交互规范**：自定义控件中的交互按钮应当提供明确的 `aria-label` 或文本标签、清晰的 `:focus-visible` 键盘焦点样式以及足够的点击热区，不要仅依赖图标形状或颜色变化传达工具激活状态。

## 4. 验证控件布局与交互

挂载控件后，建议在目标屏幕上检查以下细节：

- 四角控件在窄屏或移动端视口下是否相互重叠，或遮挡核心业务要素。
- 互斥的交互工具（如绘制、顶点编辑、框选、测量）在切换时是否能正确接管鼠标手势。
- 控件卸载后，移动鼠标或触发地图事件时是否已不再执行旧控件的回调。如果控件样式异常或点击无响应，请依次检查 CSS 导入、`await addControl()` 时序以及预设服务依赖。

## 可运行示例

- [编辑中国数据](/mapseekai/emap/examples/china-editing/)
- [顶点编辑](/mapseekai/emap/examples/vertex-editing/)
- [测量](/mapseekai/emap/examples/measurement/)

## 实现依据

<span id="核心方法" />
<span id="构造参数" />
<span id="navigationcontrol" />
<span id="statuscontrol" />
<span id="scalecontrol" />
<span id="historycontrol" />
<span id="layercontrol" />
<span id="basemapcontrol" />
<span id="drawfeaturecontrol" />
<span id="vertexeditcontrol" />
<span id="edittoolbar" />
<span id="measurecontrol" />
<span id="boxselectcontrol" />
<span id="lassoselectcontrol" />
<span id="simplifycontrol" />

- [`src/ui/control.ts`](https://github.com/mapseekai/emap/blob/master/src/ui/control.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
