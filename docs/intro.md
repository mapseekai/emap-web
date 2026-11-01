---
id: intro
slug: /
title: Emap 开发文档
api: ["Emap", "LayerSpecification", "TopologySource"]
examples: ["china-editing","export-formats","getting-started/vector-file"]
stability: stable
verifiedVersion: unreleased
description: "Emap 浏览器地图引擎的入门教程、操作指南、概念说明和 API 参考。"
---

# Emap 开发文档

**Emap**（`@mapseekai/emap`）是运行在浏览器中的 TypeScript 地图渲染、空间分析与拓扑编辑引擎。它将矢量数据保存为共享弧段拓扑（Mapshaper 拓扑结构），将几何存储与渲染样式解耦，并通过可逆命令与事务机制支持完整的要素编辑、撤销重做和本地空间数据处理。

无论是构建本地 GIS 数据查看器、交互式矢量地图编辑器，还是在浏览器端结合 Web Worker、DuckDB-Wasm 与 GeoTIFF 处理大规模空间数据，你都可以通过统一的 `Emap` 实例完成集成。

## 选择阅读路径

<div className="docs-paths">

<section>

### 入门教程

从零开始安装 `@mapseekai/emap`，使用一段内嵌 GeoJSON 代码在浏览器中创建、交互并销毁你的第一张地图。

[安装与环境配置](./getting-started/installation.md) / [创建第一张地图](./getting-started/quick-start.md)

</section>

<section>

### 操作指南

针对实际开发中的具体任务，查阅相机控制、图层样式、要素选择、几何编辑、文件导入、Web Worker 和插件扩展的实现步骤。

[浏览全部操作指南](./guides/index.md)

</section>

<section>

### 概念说明

深入理解数据源与渲染图层的解耦关系、共享拓扑模型、坐标空间与 CRS 转换，以及基于 Cordis 的运行时架构。

[理解地图与数据模型](./concepts/overview.md)

</section>

<section>

### 参考手册

快速核对地图事件载荷、结构化错误码、浏览器与 Peer 依赖兼容性矩阵，或查阅完整的 TypeDoc API 签名。

[查阅参考手册](./reference/index.md) / [API 文档](/mapseekai/emap/api/)

</section>

</div>

## 按常见任务快速定位

如果你已经明确当前要实现的功能，可以直接从下表跳转到对应指南：

| 我要完成的任务 | 推荐阅读入口 | 核心涉及能力 |
| --- | --- | --- |
| 导入并显示用户本地文件 | [文件导入](./recipes/file-upload.md) 与 [数据格式](./data/formats.md) | `TopologySource.fromBytes()`、资源限制与 CRS 预检 |
| 为地图要素配色、分级或添加标注 | [设置图层样式](./guides/styling.md) | `fill` / `line` / `circle` 图层、属性表达式、附属 `symbol` |
| 绘制、修改几何或编辑属性字段 | [编辑几何](./guides/editing.md) 与 [属性管理](./data/attributes.md) | 编辑 Handler、`map.attributes`、事务与撤销重做 |
| 执行缓冲区、裁剪、融合或 SQL 分析 | [数据操作](./data/operations.md) 与 [DuckDB 空间处理](./data/duckdb.md) | `map.ops`、DuckDB-Wasm 工具箱、GeoParquet 查询 |
| 在浏览器中浏览本地大尺寸影像 | [读取与显示 GeoTIFF](./data/geotiff.md) | 按窗口读取、金字塔（Overview）、波段拉伸 |
| 导入多图层 GeoPackage 数据 | [导入 GeoPackage](./data/geopackage.md) | SQL.js WASM 解析、多表选择、主线程或 Worker 导入 |
| 排查报错、处理事务回滚或优化大文件卡顿 | [错误处理](./recipes/error-handling.md) 与 [性能优化](./recipes/performance.md) | `OpResult`、几何与密集点 LOD、Web Worker 路由 |

## 核心能力与系统边界

<span id="能力与使用边界" />

在将 Emap 集成到业务系统前，建议先了解它的核心设计与职责边界：

1. **纯前端本地执行**：地图渲染、拓扑编辑与空间操作均在浏览器内完成。创建地图时可选择 `webgl2`（默认）、`canvas2d` 或 `webgpu` 渲染后端，三者共享同一套数据源、样式、选择与编辑服务。
2. **矢量拓扑与栅格分离**：矢量数据通过 `TopologySource` 保存为共享弧段拓扑，支持相邻多边形共边编辑与动态显示简化；本地 GeoTIFF 影像则通过独立的栅格服务按视口窗口按需读取，不转换为矢量拓扑。
3. **按需加载可选能力**：GeoJSON、TopoJSON、Shapefile ZIP、KML 与 MSX 快照开箱即用；Arrow / GeoParquet、GeoPackage、GeoTIFF、DuckDB-Wasm 与 MapLibre 在线底图通过独立子路径与插件按需引入，需要宿主应用配置相应的 Peer 依赖与静态 Worker / WASM 资源。
4. **宿主应用职责**：`headless` 预设提供无画布的浏览器端数据处理工作区，但并非 Node.js 服务端数据库。跨会话的数据持久化存储、远端文件托管以及大语言模型（LLM）服务调用均由宿主应用负责。

## 可运行示例

[在线可运行示例库](/mapseekai/emap/examples/)演示了从基础图层渲染、交互编辑到 DuckDB 空间查询的完整用法。在将示例代码复制到业务工程时，请同时确认示例所使用的数据格式、坐标系（CRS）、Worker 资源路径以及组件卸载时的 `await map.dispose()` 清理逻辑。

## 实现依据

<span id="可运行示例" />

- [`src/index.ts`](https://github.com/mapseekai/emap/blob/master/src/index.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
