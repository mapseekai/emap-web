---
id: quick-start
slug: /getting-started/quick-start
title: 第一张地图
api: ["Emap", "TopologySource", "LayerSpecification"]
examples: ["getting-started/vector-file"]
stability: stable
verifiedVersion: unreleased
---

# 创建第一张地图

本教程带你使用一份内嵌的 GeoJSON 多边形数据，在浏览器中创建一张可平移、可缩放的交互式地图。

跑通这段代码只需要几分钟。完成后，画布中央会显示一个带深绿色描边的半透明绿色矩形区域，你将直观理解 Emap 最核心的工作流：**创建地图实例 -> 加载拓扑数据源 -> 添加渲染图层 -> 适配视图范围 -> 销毁释放资源**。

## 1. 准备地图容器

<span id="1-创建容器" />

在开始前，请确认你已完成[安装与环境配置](./installation.md)。在页面 HTML 或组件模板中添加一个具有明确宽高的 DOM 容器：

```html
<div id="map" style="width: 100%; height: 480px"></div>
```

地图容器在挂载时必须具有非零的像素宽高。调用 `Emap.create()` 时，`container` 参数可以直接传入元素的 `id` 字符串（注意写 `'map'`，不要带 CSS 选择器的 `#`），也可以直接传入 `HTMLElement` 对象。

## 2. 创建地图并渲染数据

<span id="2-加载数据并添加图层" />

将以下完整代码放入你的客户端入口文件中（为了排除首次运行时浏览器 GPU 环境的影响，这里显式指定 `renderer: 'canvas2d'`；在常规项目中默认使用性能更高的 `'webgl2'`）：

```ts
import { Emap, TopologySource } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const map = await Emap.create({ container: 'map', renderer: 'canvas2d' });
const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'Example area' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[116.35, 39.88], [116.45, 39.88],
        [116.45, 39.96], [116.35, 39.96], [116.35, 39.88]]],
    },
  }],
};
const source = await TopologySource.fromBytes(
  'districts',
  new TextEncoder().encode(JSON.stringify(geojson)),
  { filename: 'districts.geojson' },
);
await map.addSource('districts', source);
map.addLayer({
  id: 'district-fill',
  type: 'fill',
  source: 'districts',
  paint: { 'fill-color': '#47b878', 'fill-opacity': 0.45 },
});
map.addLayer({
  id: 'district-outline',
  type: 'line',
  source: 'districts',
  paint: { 'line-color': '#195533', 'line-width': 1.5 },
});
map.setExtent(source.getExtent());
```

这段代码按顺序完成了四件事：

1. **初始化地图实例**：`await Emap.create(...)` 异步装配地图运行时与内置插件，就绪后返回 `map` 实例。
2. **解析并注册数据源**：GeoJSON 坐标遵循 `[经度, 纬度]` 顺序，且多边形外环首尾坐标相同。`await TopologySource.fromBytes(...)` 将字节流解析为拓扑数据集，`await map.addSource('districts', source)` 将其注册到地图工作区。
3. **声明两个共享数据的渲染图层**：`addLayer()` 只定义外观样式，不复制底层几何数据。这里我们用同一个 `districts` 数据源分别渲染了面填充层（`district-fill`）和边界线层（`district-outline`）。
4. **定位到数据范围**：`map.setExtent(source.getExtent())` 读取数据源的边界框，并将相机视口自动定位到该多边形区域。

## 3. 验证交互效果

<span id="3-检查显示结果" />

启动前端开发服务器并在浏览器中打开页面，你可以验证以下行为：

- **拖拽平移**：在画布上按住鼠标左键拖动，绿色矩形会随视图平滑移动。
- **滚轮缩放**：在画布上滚动鼠标滚轮，矩形会围绕指针位置放大或缩小。
- **独立修改样式**：尝试修改代码中 `'fill-color'` 的颜色值（或调用 `map.setPaintProperty('district-fill', 'fill-color', '#3b82f6')`），你会看到无需重新导入数据即可实时更新画面配色。

如果页面没有按预期显示，请按以下顺序快速检查：

- **画布完全空白**：检查 `#map` 容器计算后的宽高是否为 `0`，并查看浏览器控制台是否有报错。
- **画布存在但看不见图形**：确认 `Emap.create()`、`TopologySource.fromBytes()` 和 `map.addSource()` 三个异步调用均已 `await` 完成，且 `addLayer()` 中的 `source: 'districts'` 与注册时的数据源 ID 完全一致。更多排查方法见[常见问题](../reference/faq.md)。

## 4. 在组件卸载时释放地图

<span id="4-释放地图" />

在单页应用（如 React、Vue）中切换路由、卸载组件，或者准备在同一个 DOM 容器上重新创建新地图时，请务必调用并等待 `dispose()` 完成，以彻底释放画布、事件监听器与后台资源：

```ts
await map.dispose();
```

## 下一步

<span id="前置条件" />
<span id="下一步" />

现在你已经跑通了第一张 Emap 地图！接下来你可以：

- 阅读[地图与数据模型](../concepts/overview.md)，全面理解数据源、数据图层与渲染图层的关系。
- 阅读[从文件选择器导入数据](../recipes/file-upload.md)，将内嵌示例数据替换为用户上传的本地矢量文件。
- 浏览[设置图层样式](../guides/styling.md)或[编辑几何](../guides/editing.md)，为地图添加按属性着色、文字标注和交互式几何编辑能力。

## 可运行示例

- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)：演示如何从文件获取数据并渲染到地图画布。

## 实现依据

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
