---
id: index
slug: /guides/
title: 操作指南
description: "按地图显示、交互编辑、数据处理和集成任务查找操作指南。"
api: []
examples: []
stability: stable
verifiedVersion: unreleased
---

# 操作指南总览

操作指南面向已经完成地图初始化、希望解决某项具体业务功能的开发者。每一篇指南都围绕一个明确的任务展开，提供可直接复用的代码片段、核心参数说明与常见边界处理。

如果你是第一次使用 Emap，建议先花 5 分钟完成[创建第一张地图](../getting-started/quick-start.md)，了解数据源（`TopologySource`）、数据图层与渲染图层的基本配合方式。

## 地图显示与交互

<span id="地图与显示" />

| 我要完成的任务 | 推荐指南 | 接入前需确认的前提 |
| --- | --- | --- |
| 定位中心点、平移缩放与适配数据边界 | [控制相机与视图](./camera.md) / [适配数据范围](../recipes/fit-bounds.md) | 地图容器已挂载且具有非零尺寸，明确当前项目 CRS |
| 配置填充、线型、按字段分级配色、文字标注与图标 | [设置图层样式](./styling.md) | 数据源已注册，了解用于驱动样式的属性字段名称与类型 |
| 通过点击、拉框或套索选择要素 | [选择与查询要素](./selection.md) | 明确要命中的数据图层名称（而非渲染图层 ID） |
| 监听相机移动、要素点击与编辑状态更新 | [订阅地图事件](./events.md) | 在组件卸载时使用同一函数引用调用 `map.off()` 清理监听 |
| 挂载导航、比例尺、历史、测量与状态栏控件 | [添加地图控件](./controls.md) / [显示坐标状态](../recipes/status-control.md) | 已导入 `@mapseekai/emap/style.css` 样式表 |

## 数据读写、编辑与空间分析

<span id="交互与编辑" />
<span id="数据处理" />

| 我要完成的任务 | 推荐指南 | 接入前需确认的前提 |
| --- | --- | --- |
| 绘制新要素、编辑顶点、切分改形与事务提交 | [编辑几何](./editing.md) | 使用包含编辑能力的 `editor` 预设，并指定目标数据图层 |
| 绑定撤销/重做按钮与键盘快捷键 | [撤销与重做](../recipes/undo-redo.md) | 将快捷键解绑函数与组件生命周期绑定 |
| 读取要素属性、修改字段值、新建带字段图层 | [读取和修改属性](../data/attributes.md) | 区分只读属性快照与可撤销的 `map.attributes` 写入接口 |
| 导入导出 GeoJSON、Shapefile、Arrow、GeoParquet | [导入与导出格式](../data/formats.md) / [文件导入](../recipes/file-upload.md) | 配置合理的文件大小与 ZIP 解压限制，处理缺失 CRS 的预检 |
| 执行缓冲区、裁剪、擦除、融合、简化与投影转换 | [执行数据操作](../data/operations.md) | 检查返回的 `OpResult.ok`，区分就地修改与导出型操作 |
| 读取本地 GeoTIFF 影像或导入多表 GeoPackage | [读取与显示 GeoTIFF](../data/geotiff.md) / [导入 GeoPackage](../data/geopackage.md) | 部署对应的 Web Worker 与 WASM 静态资源 |
| 在浏览器内运行 SQL 与 DuckDB 空间分析 | [使用 DuckDB 进行空间处理](../data/duckdb.md) | 安装 DuckDB-Wasm 相关依赖，注意平面距离工具要求投影坐标系 |

## 运行时扩展、性能与排错

<span id="集成与性能" />

| 我要完成的任务 | 推荐指南 | 接入前需确认的前提 |
| --- | --- | --- |
| 编写 Cordis 插件、接入在线底图或注册 AI 工具能力 | [编写与安装插件](./plugins.md) | 理解服务依赖注入（`inject` / `provide`）与 Fiber 生命周期 |
| 将耗时空间操作与解码任务卸载到后台线程 | [配置 Web Worker](./worker.md) | 正确部署 Worker 与 vendor 静态资源，明确运行时所有权 |
| 排查操作失败、回滚未完成事务或恢复错误状态 | [处理失败与恢复](../recipes/error-handling.md) | 同时处理 Promise 异常、结构化 `OpResult` 与诊断事件 |
| 定位并优化大规模矢量或动态栅格的渲染帧率与内存 | [定位和改善性能](../recipes/performance.md) | 建立固定视口与设备的基准，按需调整几何 LOD、点 LOD 与缓存预算 |

> **如何配合其他章节阅读**：如果你在阅读操作步骤时需要核对某个接口的完整参数签名，请随时查阅[生成的 API 文档](/mapseekai/emap/api/)；如果你想理解为什么某个接口这样设计，请结合[概念说明](../concepts/overview.md)阅读。

## 实现依据

- [`src/index.ts`](https://github.com/mapseekai/emap/blob/master/src/index.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
