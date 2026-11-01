---
id: runtime
slug: /concepts/runtime
title: 运行时组成
description: "理解 Cordis Context、地图预设和服务的装配关系。"
api: ["Emap", "Context", "TopologySource"]
examples: ["plugin-install", "web-worker"]
stability: stable
verifiedVersion: unreleased
---

# 运行时组成与预设模型

Emap 的运行时基于原生 `cordis` 构建，通过**服务契约（Contract）**、**服务提供者（Provider）**、**功能插件（Feature Plugin）**和**预设（Preset）**将地图的各项能力模块化装配在一起。每张 `Emap` 地图实例都拥有一个完全隔离的 `map.ctx` 上下文，所有服务在该地图工作区内共享，并由插件的 `Fiber` 统一管理依赖就绪与资源释放。

## 1. 服务契约、Provider 与门面调用的关系

在 Emap 运行时内部，代码职责按以下三层协作：

1. **服务契约（Service Contracts）**：定义在 `src/runtime/services/contracts/` 中，声明每个核心服务（如 `source`、`layers`、`view`、`render`、`selection`、`history`、`execution`）对外提供的接口类型。
2. **服务提供者（Providers）与功能插件（Features）**：Provider 插件初始化具体实现并通过 `ctx.provide()` 将服务挂载到上下文；Feature 插件则通过 `inject` 声明所需的服务依赖，向工作区注册交互手势（Handlers）、UI 控件工厂、数据格式或 AI 工具能力（Capabilities）。
3. **`Emap` 门面与 GIS 热路径**：`map.ctx` 就是原生 Cordis `Context`。应用层调用 `map.addSource()`、`map.ops.*` 等门面方法时，内部会转发给已挂载的运行时服务；与此同时，高频的每帧画布渲染与指针空间命中则在服务就绪后沿着直接的引擎热路径执行，不会在每个顶点或每帧循环中产生额外的依赖查找开销。

## 2. 四种内置预设（Preset）选型表

创建地图时，你可以通过 `MapOptions.preset` 选择适合当前业务场景的基础插件组合：

| Preset 名称 | 装配的能力范围 | 典型适用场景 |
| --- | --- | --- |
| `'editor'`（默认） | 完整的数据源、渲染、相机、查询、选择集、编辑历史以及全部交互式几何编辑 Handler | 交互式 GIS 地图编辑器、数据采集与生产工作台 |
| `'viewer'` | 数据源、画布渲染、相机导航、要素查询、点选/框选/套索选择与基础数据处理服务（不含几何绘制与顶点编辑 Handler） | 数据浏览查看器、专题地图大屏与空间分析展示页 |
| `'headless'` | 数据源、格式注册表、属性管理、编辑历史与空间操作服务，**不创建 DOM 容器与渲染画布** | 浏览器内存中的纯数据处理流水线、自动化测试或无界面工作区 |
| `'empty'` | 仅挂载最基础的 `options` Provider，不自动安装任何其他服务 | 需要完全自主声明最小依赖图的深度定制运行时 |

配置预设时的注意事项：

- **控件工厂不等于已挂载按钮**：`editor` 和 `viewer` 预设会注册内置控件工厂，但不会主动往画布上添加 DOM 按钮；应用仍需按需调用 `await map.addControl(...)` 或 `await map.controls.add(...)` 挂载界面控件。
- **按名称替换或剔除插件**：在 `Emap.create({ preset, plugins, excludePlugins })` 中，如果 `plugins` 数组里包含与预设插件同名的插件，会自动替换预设中的对应项；`excludePlugins` 则可按名称剔除不需要的插件（剔除前请确认没有其他保留插件依赖它所提供的服务）。

## 3. 插件生命周期与资源所有权

- **异步就绪与动态挂载**：`await Emap.create()` 会等待预设中的所有插件完成激活后再返回。在运行期调用 `const fiber = map.ctx.plugin(plugin)` 会返回该插件的 `Fiber`，你可以 `await fiber.await()` 等待其就绪，或 `await fiber.dispose()` 将其单独卸载。插件内部通过 `ctx.effect()` 注册的事件监听、DOM 节点和异步句柄会在卸载时自动清理。
- **自建资源 vs. 借用资源**：地图实例负责销毁它自己创建的画布、控件与独占 Worker；而应用通过 `workerRuntime` 传入的共享 Worker 运行时属于**借用资源**，`map.dispose()` 不会销毁它。在切换页面或复用同一个 DOM 容器前，请始终等待异步的 `await map.dispose()` 完成，而不是只调用同步的 `map.remove()`。

## 4. 进一步扩展与运行时诊断

- 如果你想编写自定义插件、注册新数据格式或暴露 AI Agent 工具能力，请阅读[编写与安装插件](../guides/plugins.md)。
- 如果在定制预设时遇到服务未就绪的问题，可以从 `@mapseekai/emap/context` 导入 `inspectContext()`、`inspectServices()` 和 `settleContext()` 检查当前上下文的活跃 Fiber 与已注册服务列表。
- 如果你想了解仓库源码的六个一级目录是如何划分职责边界的，请继续阅读[源码组织与架构边界](./architecture.md)。

## 可运行示例

- [安装插件](/mapseekai/emap/examples/plugin-install/)
- [Web Worker](/mapseekai/emap/examples/web-worker/)

## 实现依据

- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
- [`src/runtime/services/context.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/context.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
