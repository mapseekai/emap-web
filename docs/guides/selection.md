---
id: selection
slug: /guides/selection
title: 选择
description: "按要素引用或选择手势管理选择状态，并监听选择变化。"
api: ["BoxSelectHandler", "BoxSelectHandlerOptions", "BoxSelectStyle", "ClickSelectHandler", "DragPanHandler", "DragPanOptions", "DrawFeatureHandler", "DrawFeatureOptions", "DrawGeometryType", "Emap", "featureMatchesLasso", "LassoSelectHandler", "LassoSelectHandlerOptions", "LassoSelectStyle", "MergeSelectedOptions", "ModifierCombo", "pointInPolygon", "resolveMode", "ScrollZoomHandler", "ScrollZoomOptions", "SelectHandlerOptions", "Selection", "SelectionDiff", "SelectionSnapshot", "SelectMode", "TransformFeatureHandler", "TransformFeatureOptions", "VertexEditHandler", "VertexEditOptions", "FeatureQuery"]
examples: ["lasso-select","feature-rotate","feature-scale","feature-selection","feature-translate","merge-selected"]
stability: stable
verifiedVersion: unreleased
---

# 选择与查询要素

<span id="更多选择手势" />
<span id="监听选择变化" />

在 Emap 中，选择集（Selection）保存当前被选中的要素引用（`FeatureRef`），供几何编辑、属性面板展示以及批量空间操作使用。渲染高亮（Highlight）与业务选择集是相互独立的：如果只需要在鼠标悬停时给出视觉高亮反馈，可以直接使用高亮接口，而不必改动业务选择集。

## 1. 通过代码读写选择集（FeatureRef）

<span id="要素引用" />

每个要素引用 `FeatureRef` 由三个字段组成：`source`（地图数据源 ID）、`layer`（数据图层名称或 ID）和 `id`（要素在该数据图层内的从 0 开始的索引）。

以下示例演示如何通过代码将 `parcels` 数据源 `lots` 图层中的第 42 号要素加入选择集、读取当前选择集以及清空选择：

```ts
const refs = [{ source: 'parcels', layer: 'lots', id: 42 }];
map.select(refs, { mode: 'add' });
const selected = map.getSelection();
map.deselect(refs);
map.clearSelection();
```

使用 `FeatureRef` 时请注意两个关键边界：

1. **`layer` 是数据图层 ID**：请填写数据源内的数据图层名称（如 `'lots'`），切勿填入 `addLayer()` 使用的渲染图层 ID（如 `'parcel-fill'`）。
2. **`id` 是运行时位置索引**：当执行要素删除、合并、重排或调用 `setData()` 替换整个数据集后，要素在图层内的索引可能发生变化。若需要在外部业务状态中持久化关联某个要素，请将稳定的业务主键保存在要素属性字段中，并在数据变更后重新查询定位。

## 2. 启用点击选择（ClickSelect）

<span id="点击选择" />

通过配置并启用 `map.clickSelect` Handler，用户可以直接在画布上点击选中要素，并配合键盘修饰键（Modifiers）执行加选或反选：

```ts
map.clickSelect.setOptions({
  layers: ['lots'],
  modifiers: { replace: 'none', add: 'shift', toggle: 'shift+alt' },
});
map.clickSelect.enable();
```

在上述配置下：

- **普通点击（`none`）**：替换当前选择集。
- **按住 `Shift` 点击**：将点击到的要素追加到当前选择集（`add`）。
- **按住 `Shift + Alt` 点击**：切换目标要素的选中状态（`toggle`）。

注意：选择 Handler 的 `source` 选项目前不能作为可靠的命中过滤器；如果多个数据源中存在同名的数据图层，建议在监听选中或点击事件时根据 `ref.source` 自行二次筛选。

## 3. 启用矩形框选与自由套索选择

<span id="框选" />
<span id="套索" />

除了点选外，Emap 还内置了矩形拉框选择（`map.boxSelect`）和自由轨迹套索选择（`map.lassoSelect`）。由于框选、套索与画布拖拽平移都会响应鼠标拖拽手势，在激活其中一种工具前，请先禁用与之竞争的其他选择或编辑 Handler：

```ts
map.boxSelect.disable();
map.lassoSelect.setOptions({ layers: ['lots'], includeIntersecting: true });
map.lassoSelect.enable();
```

常用配置项：

- **`includeIntersecting`**：设为 `true` 时，只要要素与选框/套索边界相交即被选中；设为 `false` 时，仅选中完全落入选区内部的要素。
- **`dragActivator` 与 `modifiers`**：用于区分普通拖拽平移与拉框/套索选择（以及替换、加选、反选模式），各 Handler 的默认键位定义详见对应的 API 文档。

## 4. 监听选择变化与只读查询

当用户通过手势或代码改变选择集时，地图会触发 `selectionchange` 事件，载荷中包含完整选择集 `selected` 以及本次新增的 `added` 和移除的 `removed` 数组：

```ts
map.on('selectionchange', ({ selected, added, removed }) => {
  console.log(selected.length, added.length, removed.length);
});
```

如果你只想读取要素属性或执行空间点查，而不希望改变当前选中状态，可以直接使用 `map.features` 或 `map.queryFeatures()`。

此外请区分**渲染层显示过滤（Filter）**与**源数据子集**：在渲染图层上配置的 `filter` 会控制哪些要素在屏幕上可见并可被鼠标命中，但它不会删除源记录，也不会自动成为导出或 `map.ops` 批量操作的过滤条件。若需要仅对部分要素执行导出或空间处理，请显式传入目标要素或先执行属性筛选操作，详见[读取和修改属性](../data/attributes.md)。

## 可运行示例

- [要素选择](/mapseekai/emap/examples/feature-selection/)
- [框选](/mapseekai/emap/examples/lasso-select/)
- [套索选择](/mapseekai/emap/examples/lasso-select/)

## 实现依据

<span id="核心方法" />
<span id="变更和读取" />

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/engine/core/handlers/click-select.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/handlers/click-select.ts)
- [`src/engine/core/handlers/lasso-select.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/core/handlers/lasso-select.ts)
