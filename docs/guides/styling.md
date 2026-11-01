---
id: styling
slug: /guides/styling
title: 样式图层
description: "配置矢量图层绘制属性、表达式、注记和图片符号。"
api: ["SymbolStyle", "SymbolLayout", "SymbolPaint", "SymbolImage", "SymbolLabeling", "SymbolIconSettings", "Emap.setLayerSymbol", "Emap.removeLayerSymbol", "Emap.setSymbolLayoutProperty", "Emap.setSymbolPaintProperty", "IconOptions", "Emap.setLayerIcon", "LabelOptions", "Emap.setLayerLabel", "ClassificationResult", "ClassifyFeaturesOptions", "Emap.setPaintProperty", "FillPaint", "LayerSpecification", "LineDashStyle", "LinePaint", "PointMarkerShape", "StyleExpression", "Emap", "CirclePaint"]
examples: ["getting-started/lines","getting-started/point-style","labels","point-icons","getting-started/polygon-fill","getting-started/polygons","attribute-styling"]
stability: stable
verifiedVersion: unreleased
---

# 设置图层样式

<span id="更多图层操作" />
<span id="属性驱动样式" />
<span id="统一的附属-symbol-样式" />

在 Emap 中，渲染图层（`LayerSpecification`）将数据源引用与视觉外观配置结合在一起。你可以通过基础绘制属性（`paint`）、属性驱动表达式、分级设色以及附属的文字标注与图标（`symbol`）定制地图外观，所有样式变更都不会修改底层源几何数据。

## 1. 添加填充、线与点图层

<span id="属性分级填充桶" />

Emap 支持三种基础矢量渲染图层类型：

- `fill`：用于多边形要素的内部填充与可选描边。
- `line`：用于线要素或多边形轮廓的绘制，支持线宽、颜色、虚线与箭头配置。
- `circle`：用于点要素的符号化绘制，按屏幕显示尺寸指定半径与颜色。

同一个数据图层可以被多个渲染图层同时引用。下面示例假设数据源 `parcels` 中包含面数据图层 `lots`，我们用两个独立的渲染图层分别绘制半透明填充和深色边界线：

```ts
map.addLayer({
  id: 'parcel-fill', type: 'fill', source: 'parcels', 'source-layer': 'lots',
  paint: { 'fill-color': '#47b878', 'fill-opacity': 0.35 },
});
map.addLayer({
  id: 'parcel-outline', type: 'line', source: 'parcels', 'source-layer': 'lots',
  paint: { 'line-color': '#195533', 'line-width': 2 },
});
```

图层创建后，你可以随时调用 `map.setPaintProperty(layerId, name, value)` 动态更新单个绘制属性，或调用 `map.setLayerVisibility(layerId, 'none')` 隐藏该图层而不销毁它。

## 2. 按属性字段驱动着色

当你需要根据要素的属性值展示不同颜色（如土地利用类型或行政区分级）时，有两种常用方式：

### 方式一：使用类型化样式表达式

将绘制属性设置为表达式数组。例如，使用 `match` 运算符根据要素的 `zone` 字段分配填充色：

```ts
map.setPaintProperty('parcel-fill', 'fill-color', [
  'match', ['get', 'zone'],
  'residential', '#47b878', 'industrial', '#d99c31', '#9aa8a0',
]);
```

注意：

- 表达式的最后一个值（上例中的 `'#9aa8a0'`）是未匹配记录、空值或字段缺失时的默认回退颜色，必须显式提供。
- Emap 的样式表达式是经过校验的类型化子集（由专用求值器按属性版本缓存计算结果），请勿将任意未声明的 MapLibre 表达式或原始 JavaScript 代码直接传入 `paint`。

#### 常用样式表达式操作符速查

| 操作符 | 语法结构 | 典型用途与示例 |
| --- | --- | --- |
| `get` | `['get', 'fieldName']` | 获取要素属性：`['get', 'population']` |
| `match` | `['match', input, k1, v1, k2, v2, ..., fallback]` | 多值枚举匹配：`['match', ['get', 'type'], 'park', '#4caf50', '#ccc']` |
| `step` | `['step', input, default, stop1, value1, ...]` | 数值分段：`['step', ['get', 'population'], '#ccc', 100, '#4caf50']` |
| `interpolate` | `['interpolate', 'linear', input, stop1, value1, stop2, value2, ...]` | 数值或颜色线性插值，阈值必须递增 |
| `==` / `!=` | `['==', a, b]` / `['!=', a, b]` | 相等/不等判断：`['==', ['get', 'status'], 'active']` |
| `<`, `<=`, `>`, `>=` | `['<', a, b]` / `['>=', a, b]` | 数值区间比较：`['>=', ['get', 'speed'], 60]` |
| `!` / `all` / `any` | `['!', condition]` / `['all', condition1, ...]` / `['any', condition1, ...]` | 组合布尔条件 |

### 方式二：使用 `classifyFeatures()` 烘焙分级样式

如果你需要按分位数（`quantile`）或等间距对数值字段做统计分级，可以调用 `await map.ops.classifyFeatures(...)` 将计算出的颜色写入 Mapshaper 样式字段，然后为图层显式配置 `styleSource: 'mapshaper'` 来读取该分级结果（调用后请先检查返回值的 `ok` 字段）。

## 3. 配置文字注记、图标与附属 Symbol

你既可以使用轻量接口单独挂载文字注记或点图标，也可以使用统一的附属 `symbol` 配置将图标与文字组合在同一个图层上：

- **独立文字注记**：在图层上配置 `label`（`LabelOptions`）指定字段名、字号、颜色与碰撞避让策略；调用 `map.setLayerLabel(id, null)` 可仅移除文字注记。
- **独立点图标**：在点图层上配置 `icon` 或调用 `map.setLayerIcon()`，由宿主应用提供可访问的图片 URL。
- **组合式附属 `symbol`**：当点要素需要同时显示自定义图标与偏移文字标签时，直接在父图层上声明 `symbol` 块。

以下示例为已注册的点数据源 `poi`（含 `name` 属性字段）配置圆点底座、自定义图片图标与带白色光晕（halo）的文字标注，并演示如何动态调整或移除附属符号：

```ts
map.addLayer({
  id: 'poi', type: 'circle', source: 'poi',
  paint: { 'circle-radius': 4, 'circle-color': '#237a49' },
  symbol: {
    images: { marker: { url: '/images/marker.png', size: [24, 32] } },
    layout: {
      'icon-image': 'marker', 'icon-size': 1, 'icon-anchor': 'bottom',
      'text-field': ['get', 'name'], 'text-size': 14,
      'text-offset': [0, 1.2], 'text-allow-overlap': false,
    },
    paint: {
      'icon-opacity': 1, 'text-color': '#243447',
      'text-halo-color': '#ffffff', 'text-halo-width': 1.5,
    },
  },
});
map.setSymbolLayoutProperty('poi', 'text-size', 20);
map.setSymbolPaintProperty('poi', 'icon-opacity', 0.6);
map.setSymbolLayoutProperty('poi', 'text-offset', null);
map.removeLayerSymbol('poi'); // 同时去掉附属文字/图标，保留父图层
// map.setLayerSymbol('poi', null); // 等价写法
```

附属 `symbol` 会自动沿用父图层的数据源、显示过滤条件（`filter`）和图层顺序。调用 `removeLayerSymbol('poi')`（或 `setLayerSymbol('poi', null)`）只会清除附属的图标与文字，不会删除底层的 `poi` 圆点图层。在上线前，建议在目标设备像素比（DPR）和窄屏视口下检查文字碰撞避让、图标锚点（`icon-anchor`）与偏移效果。

## 4. 跨渲染后端的显示验证

`canvas2d`、`webgl2` 与实验性 `webgpu` 后端共享同一套图层样式声明，但在复杂纹理、抗锯齿细节与动态 LOD 路径上可能存在细微渲染差异。排查样式显示问题时，建议先固定测试数据、相机位置与窗口尺寸，再依次核对基础 `paint`、表达式回退值、`symbol` 图片加载状态以及当前渲染后端的支持范围。关于渲染帧率与显示精度开关的调优，请参见[定位和改善性能](../recipes/performance.md)。

## 可运行示例

- [面填充](/mapseekai/emap/examples/getting-started/polygon-fill/)
- [线样式](/mapseekai/emap/examples/getting-started/lines/)
- [属性样式](/mapseekai/emap/examples/attribute-styling/)

## 实现依据

<span id="核心参数" />
<span id="更多绘制属性" />
<span id="line-paint" />
<span id="fill-paint" />
<span id="circle-paint" />
<span id="表达式形式" />
<span id="绑定式文字注记" />
<span id="点图层的图片符号" />

- [`src/engine/map/label.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/label.ts)
- [`src/engine/map/style-expression.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/style-expression.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
