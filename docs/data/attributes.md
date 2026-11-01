---
id: attributes
slug: /data/attributes
title: 属性
description: "读取属性记录，筛选要素并通过可撤销操作修改字段。"
api: ["Emap", "Feature", "ApplyExpressionOptions", "JoinTableOptions", "CreateLayerOptions", "LayerFieldDefinition"]
examples: ["create-layer","attribute-editing","attribute-expressions","feature-attributes","join"]
stability: stable
verifiedVersion: unreleased
---

# 读取和修改属性

在 Emap 中，要素的属性记录（Properties）与数据图层内的要素索引一一对应。读取属性时使用只读要素查询接口（`map.features`）；修改属性值或增删字段结构时，请始终通过 `map.attributes` 或 `map.ops` 提交，以确保属性版本号、属性驱动样式重绘以及撤销/重做历史保持同步。

## 1. 读取单个要素的属性快照

<span id="更多读取属性" />
<span id="更多属性操作" />
<span id="修改要素属性" />
<span id="属性写入参数" />
<span id="属性分级参数" />

传入要素引用 `{ source, layer, id }` 调用 `map.features.get()`，即可读取目标要素的几何与属性：

```ts
const feature = map.features.get({ source: 'main', layer: 'districts', id: 3 });
console.log(feature?.properties);
```

注意：

- **`feature.properties` 是浅冻结的属性快照**：不要修改返回对象及其嵌套值；嵌套对象仍可能与源记录共享引用，直接修改不会触发地图更新或写入历史。
- **处理空返回值**：当指定的数据源、图层或要素索引无法解析时，`get()` 返回 `null`，业务面板需做好空状态兜底。

## 2. 可逆修改要素属性值

要修改某个要素的属性字段并让修改进入撤销历史栈，请调用 `map.attributes.setFeatureProperties(ref, patch)` 并检查返回的 `OpResult`：

```ts
const result = map.attributes.setFeatureProperties(
  { source: 'main', layer: 'districts', id: 3 },
  { name: 'Central district', population: 120000 },
);
if (!result.ok) console.error(result.error);
```

更新规则：

- **局部补丁合并**：`patch` 中未列出的原有字段会保持原值不变；将某个字段显式设为 `undefined` 表示从该记录中移除该字段。
- **字段类型校验**：`setFeatureProperties()` 不会按图层字段定义校验写入值；如果业务要求类型一致，请在调用前自行校验。

## 3. 创建带字段定义的空图层与管理字段结构

<span id="管理字段" />
<span id="字段操作参数" />
<span id="字段名校验" />
<span id="表达式与字段筛选参数" />

在从零开始采集数据时，你可以通过 `await map.createLayer()` 预先声明数据图层的几何类型、CRS 以及属性字段结构（`fields`）。即使图层中还没有任何要素，字段定义和默认值也会立即生效，后续通过 `drawFeature` 新绘制的要素会自动沿用这套字段结构：

```ts
const source = await map.createLayer('survey', {
  name: 'survey-points',
  geometryType: 'point',
  crs: 'EPSG:4326',
  fields: [
    { name: 'name', type: 'string', defaultValue: '' },
    { name: 'height', type: 'number' },
    { name: 'checked', type: 'boolean', defaultValue: false },
  ],
});

// 即使没有要素，字段名称和定义也可以读取。
console.log(source.getLayers()[0].data?.getFields?.());
console.log(source.getLayers()[0].fields);

map.drawFeature.setOptions({ source: 'survey', sourceLayer: 'survey-points', type: 'point' });
map.drawFeature.enable();
```

支持声明 `string`、`number`、`boolean` 等字段类型，且 `defaultValue` 必须与声明的类型一致。对已有图层新增、重命名或删除字段时，请使用 `map.attributes` 下的 `addField()`、`renameField()` 与 `removeField()` 方法，并检查返回的 `OpResult` 以处理字段名非法或重名冲突。

## 4. 区分渲染层显示过滤与数据层批量处理

<span id="图层显示过滤" />
<span id="过滤参数" />

在日常开发中，请务必分清以下两种“过滤”机制的职责边界：

1. **渲染层显示过滤（`layer.filter`）**：只控制哪些要素在当前渲染图层上绘制及响应鼠标点击，**不会删除底层属性记录，也不会限制 `source.export()` 导出或 `map.ops` 批量操作的数据范围**。使用 `iterFiltered()` 时传入的是渲染图层 ID；而遍历底层数据记录时使用的是数据图层 ID，切勿混用。
2. **数据层批量操作（`map.ops`）**：当你需要真正剔除记录、按字段排序、计算新字段、执行统计分级（`classifyFeatures`）或将外部属性表关联到图层（`joinTable`）时，请调用 `map.ops` 下的对应方法。执行表连接前请确认主键字段匹配且类型一致；执行数值分级前请确认目标列为有效数值并妥善处理空值。

## 5. 属性表达式的安全执行策略

<span id="表达式筛选和连接" />

在 `map.ops.applyExpression()` 或 `filterFeatures()` 中使用的 Mapshaper JavaScript 表达式，出于安全考虑默认处于禁用状态（`expressionPolicy: 'disabled'`）。

- 只有当表达式字符串完全由受信任的应用代码生成并经过审阅时，才可在 `Emap.create({ expressionPolicy: 'trusted' })` 中显式开启。注意：`'trusted'` 并非安全沙箱，切勿直接传入未经校验的外部不可信用户输入。
- 常规的表单属性编辑与字段增删改，推荐直接使用无需开启表达式策略的 `map.attributes` 类型化接口。图层视觉配色所使用的样式表达式则是独立的安全子集，详见[设置图层样式](../guides/styling.md)。

## API

<span id="核心方法" />
<span id="查询与-feature-参数" />
<span id="datatable-方法" />
<span id="创建带字段的空图层" />
<span id="创建图层参数" />
<span id="表连接参数" />

- [Emap](/mapseekai/emap/api/classes/emap.Emap.html)
- [Feature](/mapseekai/emap/api/interfaces/emap.Feature.html)
- [ApplyExpressionOptions](/mapseekai/emap/api/interfaces/emap.ApplyExpressionOptions.html)
- [JoinTableOptions](/mapseekai/emap/api/interfaces/emap.JoinTableOptions.html)

## 可运行示例

- [要素属性](/mapseekai/emap/examples/feature-attributes/)
- [属性编辑](/mapseekai/emap/examples/attribute-editing/)
- [创建图层](/mapseekai/emap/examples/create-layer/)
- [属性表达式](/mapseekai/emap/examples/attribute-expressions/)
- [表连接](/mapseekai/emap/examples/join/)

## 实现依据

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/source/create-layer.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/create-layer.ts)
- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
