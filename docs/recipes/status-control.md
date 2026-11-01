---
id: status-control
slug: /recipes/status-control
title: 状态控件
description: "挂载状态栏并配置坐标显示、精度和位置。"
api: ["Emap", "StatusControl", "StatusOptions"]
examples: ["duckdb-geoparquet-query", "duckdb-query", "web-worker"]
stability: stable
verifiedVersion: unreleased
---

# 显示坐标与 CRS 状态栏

`StatusControl` 在地图画布边缘实时显示鼠标指针所在的地图坐标以及当前活动坐标系（CRS），帮助用户在浏览与编辑时直观确认当前所处的坐标空间。注意：`StatusControl` 仅作为只读状态展示面板，本身不执行任何坐标系转换。

## 1. 挂载并配置状态控件

<span id="更多挂载选项" />

确认已导入 `@mapseekai/emap/style.css` 且 `map` 实例就绪后，实例化 `StatusControl` 并调用 `await map.addControl()` 将其挂载到画布角落：

```ts
import { StatusControl } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const status = new StatusControl({
  showMousePos: true,
  showEPSG: true,
  alignment: 'right',
});
await map.addControl(status, 'bottom-left');
```

配置项说明：

- **`showMousePos`**：是否实时显示鼠标指针当前所在的地图坐标。
- **`showEPSG`**：是否显示当前地图的活动 CRS 标识（如 `EPSG:4326` 或 `EPSG:3857`）。
- **`alignment`**：控制状态栏内部文本的对齐方式（如 `'left'` 或 `'right'`）；而控件整体位于画布的哪个角落，则由 `map.addControl(status, position)` 的第二个参数决定。

## 2. 正确理解状态栏读数

在使用状态栏读数核对数据时，请注意以下两点：

1. **坐标读数始终使用当前项目 CRS**：状态栏显示的数值直接取自当前地图的项目坐标空间，不一定总是经纬度。例如在 `EPSG:3857` 或地方平面投影下，读数通常是以米为单位的平面坐标。同时，若状态栏未显示标准 `EPSG:xxxx` 编号，仅代表当前 CRS 未匹配到简短 EPSG 标识，不代表数据缺失坐标系定义。
2. **小数位精度与自定义格式化**：内置 `StatusControl` 当前固定保留 4 位小数显示坐标，不提供单独的 `precision` 参数。如果业务场景需要度分秒（DMS）格式、自定义小数位数或附加高程读数，建议实现自定义 `Control`，通过监听[指针移动事件](../guides/events.md)并结合 `ControlContext.getCRS()` 自行格式化输出。

## 3. 卸载清理与界面检查

- **卸载控件**：需要单独移除状态栏时，执行 `await map.removeControl(status)`；当调用 `await map.dispose()` 销毁地图时，已挂载的状态栏会自动随地图一同释放。
- **验证清单**：在画布上移动鼠标确认坐标读数平滑更新；将鼠标移出画布边界确认空闲状态显示正常；切换地图 CRS 后确认状态栏标签与坐标单位同步更新；在窄屏视口下确认状态栏不会遮挡底部比例尺或其他操作按钮。

## API

<span id="核心参数" />
<span id="控件参数" />

- `Emap`
- `StatusControl`
- `StatusOptions`

## 可运行示例

- [DuckDB GeoParquet 查询](/mapseekai/emap/examples/duckdb-geoparquet-query/)
- [DuckDB 查询](/mapseekai/emap/examples/duckdb-query/)
- [Web Worker](/mapseekai/emap/examples/web-worker/)

## 实现依据

- [`src/ui/status-control.ts`](https://github.com/mapseekai/emap/blob/master/src/ui/status-control.ts)
