---
id: plugins
slug: /guides/plugins
title: Cordis 原生插件与 AI Capability
description: "编写 Cordis 插件，组合服务、预设和 AI Capability。"
api: ["AffineDelta", "CacheContract", "CapabilityAuthorization", "CapabilityAuthorizer", "CapabilityCallContext", "CapabilityDefinition", "CapabilityDescriptor", "CapabilityEffect", "CapabilityInvocation", "CapabilityOrigin", "CapabilityRegistry", "CapabilityRegistryContract", "CapabilityRun", "Context", "ControlContext", "ControlsContract", "DocumentContract", "DuckDbProcessing", "DuckDbRuntimeOptions", "DuckDbRuntimeScope", "EditStateContract", "EmapOptions", "ExecutionContract", "FeatureReadContext", "FormatRegistry", "FormatRegistryContract", "HandlerRegistration", "HistoryContract", "InputSchema", "InteractionContract", "LayerContract", "MapLibreService", "MapLibreServiceDefinition", "MutationContract", "PainterFactoryContract", "PolicyContract", "PresetName", "ProjectionContract", "QueryContract", "RenderAction", "RenderContract", "RenderSignalsContract", "RoutingContract", "ScaleContract", "SelectionContract", "ShortcutsContract", "SnapshotContract", "SourceContract", "SourceFactoryContract", "SurfaceContract", "ValidationContract", "ViewContract", "arrowFormatsPlugin", "attributeCapabilityPlugins", "attributesPlugin", "autoCompletePolygonPlugin", "basemapControlPlugin", "boxSelectPlugin", "cachePlugin", "canvasPainterPlugin", "capabilitiesPlugin", "clickSelectPlugin", "controlContextPlugin", "controlPlugin", "controlsPlugin", "describeAgentTools", "documentPlugin", "dragPanPlugin", "drawFeaturePlugin", "duckDbCapabilityPlugins", "duckDbPlugin", "editCapabilityPlugins", "editSessionsPlugin", "editStatePlugin", "editorControlPlugins", "editorPreset", "eventsPlugin", "executionPlugin", "formatPlugin", "formatsPlugin", "headlessPreset", "historyPlugin", "inspectContext", "inspectServices", "interactionPlugin", "invokeAgentTool", "lassoSelectPlugin", "layersPlugin", "mapLibrePlugin", "mapshaperCapabilityPlugins", "mapshaperProcessingPlugin", "measurePlugin", "mutationPlugin", "operationHostPlugin", "partEditPlugin", "policyPlugin", "projectionPlugin", "queryPlugin", "renderPlugin", "renderSignalsPlugin", "reshapeFeaturePlugin", "resolvePlugins", "ringEditPlugin", "routingPlugin", "scalePlugin", "scrollZoomPlugin", "selectionPlugin", "settleContext", "shortcutsPlugin", "snapshotPlugin", "sourcePlugin", "splitFeaturePlugin", "summarizeCapabilityResult", "surfacePlugin", "topologySourceFactoryPlugin", "topologyValidationPlugin", "transformFeaturePlugin", "validateCapabilityInput", "validationPlugin", "validatorPlugin", "vertexEditPlugin", "viewPlugin", "viewerControlPlugins", "viewerPreset", "workspaceCapabilityPlugins"]
examples: ["plugin-install", "plugin-capability", "export-formats", "online-map-services"]
stability: experimental
verifiedVersion: unreleased
---

# 编写与安装插件

Emap 的运行时基于原生 `cordis` 构建。每张地图实例都拥有一个独立的 `map.ctx`（Cordis `Context`），用于声明服务（Service）、注入依赖（`inject`）以及管理插件的 Fiber 生命周期。你可以通过预设（Preset）选择基础能力组合，再通过插件机制按需挂载格式解析器、在线底图服务、自定义交互或 AI Agent 可调用能力。

## 1. 在创建时或运行期安装插件

<span id="插件与服务契约" />

你有两种方式向地图工作区安装插件：

1. **创建地图时传入 `plugins`**：在 `Emap.create({ container: 'map', plugins: [...] })` 中声明。如果传入的插件与当前 `preset` 中的内置插件同名，新插件会自动替换内置项；你也可以通过 `excludePlugins` 显式剔除不需要的内置插件（注意保留其他插件所依赖的核心服务）。
2. **运行期动态挂载**：在地图就绪后调用 `const fiber = map.ctx.plugin(myPlugin)`。该方法返回一个可等待、可销毁的 `Fiber` 实例。如果后续代码依赖该插件提供的服务，请先执行 `await fiber.await()` 等待其激活完成。

## 2. 声明服务提供者（Provider）与消费者（Consumer）

<span id="可注入的-emap-服务" />

编写自定义插件时，可以通过 TypeScript 模块补充声明（`declare module 'cordis'`）扩展 `Context` 接口，利用 `provide` 暴露服务，并在消费侧通过 `inject` 声明依赖。

下面示例展示了一个提供 `counter` 服务的 Provider 插件和一个读取该服务的 Consumer 插件：

```ts
import type { Plugin } from 'cordis';

declare module 'cordis' {
  interface Context {
    counter: { value: number };
  }
}

const counterPlugin: Plugin.Object = {
  name: 'demo.counter',
  provide: ['counter'],
  apply(ctx) {
    ctx.effect(function* () {
      yield ctx.provide('counter', { value: 1 });
    });
  },
};

const readerPlugin: Plugin.Object = {
  name: 'demo.reader',
  inject: ['counter'],
  apply(ctx) {
    console.log(ctx.counter.value);
  },
};
```

挂载并等待两个插件就绪：

```ts
const provider = map.ctx.plugin(counterPlugin);
const reader = map.ctx.plugin(readerPlugin);
await provider.await();
await reader.await();
```

Cordis 会自动维护依赖拓扑：只有当 `counter` 服务就绪后，`readerPlugin` 的 `apply` 才会执行；如果调用 `await provider.dispose()` 卸载了提供者，依赖它的消费插件也会自动失活，并在服务恢复时重新挂载。

## 3. 使用 `ctx.effect()` 安全管理副作用与资源清理

在插件内部绑定 DOM 事件、注册地图监听器、创建控件或打开 Worker / 文件句柄时，请始终将生命周期绑定到 `ctx.effect()` 中：

- **先注册清理逻辑，再对外暴露服务**：确保即使初始化中途失败，已分配的资源也能被干净回收。
- **严格区分拥有权**：插件只负责销毁自己创建的资源；对于从宿主应用借用的共享资源（如外部传入的 `workerRuntime`），只需解除当前插件的订阅，交还给宿主统一释放。
- **不要维护脱离 Fiber 的全局状态**：当调用 `await map.dispose()` 时，地图会通过 `map.ctx` 统一卸载所有插件并等待异步清理完成。

## 4. 注册可选数据格式与第三方集成

<span id="formats-注册契约" />

Arrow / GeoParquet、GeoPackage、GeoTIFF、DuckDB 和 MapLibre 等扩展能力均通过各自的插件接入地图上下文：

- **格式插件（`ctx.formats`）**：挂载 `arrowFormatsPlugin` 或 `geoPackagePlugin` 后，插件会向当前地图的 `map.formats` 注册格式编解码器；GeoPackage 插件目前只提供导入。如果你通过 `new TopologySource(...)` 或 `TopologySource.fromBytes(...)` 手动创建数据源，请显式传入 `{ formats: map.formats }`，否则独立创建的 `TopologySource` 无法自动感知地图内注册的可选格式。更多细节见[导入与导出格式](../data/formats.md)。

## 5. 注册与调用 AI Capability（Agent 工具协议）

`map.capabilities` 提供了一个带有输入参数 Schema、读写副作用标记与执行函数的类型化能力注册表；`@mapseekai/emap/ai` 子入口则负责将这些能力描述符转换为供大语言模型（LLM）或 Agent 使用的工具调用协议（`describeAgentTools` / `invokeAgentTool`）：

- **Emap 不内置 LLM 服务**：模型推理与对话编排由宿主应用负责。
- **默认安全策略**：由 Agent 发起的具有写副作用（修改数据或状态）的能力调用默认被拒绝，宿主应用必须通过 `authorizeCapability` 显式授权后方可执行。
- **异步结果确认**：能力调用返回 Promise，宿主需等待其执行结果并处理潜在错误，切勿将“已生成工具调用描述”当作操作已执行成功。

## 6. 诊断上下文与服务就绪状态

<span id="检查真实运行状态" />

当某个自定义插件没有按预期生效时，可以从 `@mapseekai/emap/context` 导入 `inspectContext()`、`inspectServices()` 和 `settleContext()`，先检查目标 Fiber 是否处于活动状态、所需的 `inject` 服务是否均已提供，再排查具体业务代码。关于不同内置预设（`editor`、`viewer`、`headless`、`empty`）所包含的服务清单，请参见[运行时组成](../concepts/runtime.md)。

## 可运行示例

- [安装插件](/mapseekai/emap/examples/plugin-install/)
- [导出格式](/mapseekai/emap/examples/export-formats/)
- [在线地图服务](/mapseekai/emap/examples/online-map-services/)

## 实现依据

<span id="核心参数" />
<span id="pluginobject-形状" />
<span id="ctxplugin-与-fiber" />
<span id="feature-组合" />
<span id="原生-effects-与异步资源" />
<span id="运行时职责" />
<span id="preset-与可选-provider" />
<span id="ai-调用" />

- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
- [`src/runtime/services/options.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/options.ts)
- [`src/runtime/services/context.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/context.ts)
