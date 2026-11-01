---
id: architecture
slug: /concepts/architecture
title: 源码组织
description: "Emap 六个源码职责区、依赖边界、运行时组合和验证入口。"
api: ["Emap", "Context", "TopologySource"]
examples: ["plugin-install", "getting-started/vector-file"]
stability: experimental
verifiedVersion: unreleased
---

import DocsDiagram from '@site/src/components/DocsDiagram';

# 源码组织与架构边界

<span id="测试组织" />

Emap 引擎仓库将**GIS 领域模型**、**地图渲染与交互热路径**、**Cordis 运行时装配**、**第三方生态桥接**与**浏览器 UI 控件**严格划分在六个一级源码目录中。阅读或修改引擎实现时，先确认目标能力所属的职责区，再沿着服务契约定位具体实现，可以避免跨层耦合。

## 1. 六个一级源码职责区

<DocsDiagram name="architecture" language="zh" alt="源码职责区的依赖关系：UI 依赖引擎；引擎依赖运行时、领域模型和集成；运行时与集成依赖领域模型。" />

| 源码目录 | 核心职责 | 架构依赖边界 |
| --- | --- | --- |
| `src/domain/` | 空间数据源（`TopologySource`）、坐标与投影数学、可逆编辑命令（`EditCommand`）、事务与拓扑验证器 | 纯 GIS 领域层，不依赖 Cordis、浏览器 DOM 或具体渲染器 |
| `src/engine/` | `Emap` 门面、相机变换、指针交互 Handler、渲染调度器、Canvas2D / Luma（WebGL2/WebGPU）绘制器与 Worker 路由 | 引擎高频执行热路径，承载地图渲染与空间操作编排 |
| `src/runtime/` | Cordis 服务契约（Contracts）、Provider 装配、Feature 插件、四大内置 Preset 与 AI Capability 注册表 | 仅负责依赖注入、插件组合与生命周期管理 |
| `src/integrations/` | Mapshaper 内部适配器、MapLibre 在线服务、Arrow / GeoParquet、DuckDB-Wasm、GeoPackage 与 GeoTIFF 集成 | 隔离第三方库与 WASM 模块的调用边界（例如仅通过 `mapshaper/adapter.ts` 访问内部接口） |
| `src/ui/` | 导航、比例尺、状态栏、历史、测量与编辑工具栏等浏览器控件、主题变量与 SVG 图标 | 浏览器 DOM 界面层，通过公开地图接口与服务工作 |
| `src/shared/` | 跨层共享的基础类型定义与外部模块 Ambient 声明 | 跨职责区的纯类型边界 |

根入口 `src/index.ts` 定义了核心包 `@mapseekai/emap` 的公共导出；`/arrow`、`/duckdb`、`/geopackage`、`/geotiff`、`/maplibre`、`/context`、`/services`、`/providers`、`/plugins`、`/presets` 和 `/ai` 等子路径则由 `package.json` 的 `exports` 字段严格约束。请注意：**未在公开 `exports` 中导出的内部源文件路径不属于受支持的公共 API 契约**。

## 2. 从数据加载到画布渲染的执行路径

<span id="数据与渲染路径" />

当用户在地图上加载数据或执行交互编辑时，数据在各层之间的流转路径非常清晰：

1. **数据源与图层管理**：`TopologySource` 注册进入工作区后，由 `document`、`source` 和 `layers` 服务维护数据源版本与渲染图层配置。
2. **渲染调度与绘制**：当相机移动、样式更新或数据版本递增时，触发渲染失效信号；`RenderScheduler` 将同一帧内的多次刷新合并为一次绘制请求，交由各图层渲染器与底层的 `CanvasPainter` 或 `LumaPainter`（WebGL2 / WebGPU）完成光栅化。
3. **交互手势与可逆编辑**：DOM 指针事件进入 `src/engine/core/handlers/` 中的当前激活 Handler，生成经过校验的编辑计划或调用 `map.ops` 数据操作；随后通过 `src/domain/edit/` 中的 `EditCommand` 或事务更新 `TopologySource` 的几何/属性版本号、维护历史栈并触发重绘。若操作卸载到了后台 Web Worker，主线程在提交结果前会核对数据源身份与版本号，防止过期结果覆盖最新编辑。

## 3. 修改代码或排查问题时的定位指南

- **排查运行时装配或插件依赖问题**：先看 `src/runtime/presets/index.ts` 中各 Preset 包含的插件清单，再看 `src/runtime/services/contracts/` 中的服务契约与对应 Provider。
- **排查文件导入、CRS 或拓扑结构问题**：从 `src/domain/source/`、`src/engine/map/source-loading.ts` 以及对应的格式集成目录（如 `src/integrations/arrow/` 或 `src/integrations/geopackage/`）入手。
- **排查画面渲染或视觉差异**：先区分是底层源数据问题、显示弧段 LOD（`geometryLod` / `pointLod`）、样式表达式求值（`style-expression.ts`），还是特定渲染后端（`CanvasPainter` vs. `LumaPainter`）的实现差异。
- **新增第三方扩展或 UI 控件**：第三方库桥接代码放入 `src/integrations/`，新增浏览器控件放入 `src/ui/` 并通过公开服务契约调用地图能力。关于插件编写方法请参见[编写与安装插件](../guides/plugins.md)。

## 4. 测试布局与工程校验门禁

Emap 引擎工程通过自动化脚本严格守护架构边界与代码质量：

- **同目录同名单元测试**：每个实现文件 `foo.ts` 最多对应一个同目录下的 `foo.test.ts` 单元测试文件（由 `pnpm run test-layout:check` 自动强制校验）。
- **专项测试目录**：跨模块集成与回归测试位于 `test/integration/`；浏览器端渲染测试、构建产物检查、公开类型契约测试、文档与示例校验、安全回归测试则分别位于 `test/browser/`、`test/build/`、`test/types/`、`test/docs/`、`test/examples/` 和 `test/security/`。
- **常用校验命令**：修改公开类型后运行 `pnpm run typecheck:contracts`；移动文件或测试后运行 `pnpm run test-layout:check` 与 `pnpm run architecture:check`；在本独立文档站点（`emap-web`）修改文档后，则运行本站的 `pnpm verify` 完成双语构建、API 链接与元数据校验。

## 可运行示例

- [安装插件](/mapseekai/emap/examples/plugin-install/)
- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)

## 实现依据

<span id="核心结构" />
<span id="emapcreate" />
<span id="更多运行时组合" />
<span id="pluginobject-与-effect" />
<span id="ctxplugin-与-fiber" />
<span id="serviceproviderfeature-与-capability" />
<span id="发布与验证" />

- [`AGENTS.md`](https://github.com/mapseekai/emap/blob/master/AGENTS.md)
- [`src/index.ts`](https://github.com/mapseekai/emap/blob/master/src/index.ts)
- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
