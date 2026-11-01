---
id: plugins
slug: /guides/plugins
title: Native Cordis plugins and AI capabilities
description: "Write Cordis plugins and compose services, presets, and AI capabilities."
api: ["AffineDelta", "CacheContract", "CapabilityAuthorization", "CapabilityAuthorizer", "CapabilityCallContext", "CapabilityDefinition", "CapabilityDescriptor", "CapabilityEffect", "CapabilityInvocation", "CapabilityOrigin", "CapabilityRegistry", "CapabilityRegistryContract", "CapabilityRun", "Context", "ControlContext", "ControlsContract", "DocumentContract", "DuckDbProcessing", "DuckDbRuntimeOptions", "DuckDbRuntimeScope", "EditStateContract", "EmapOptions", "ExecutionContract", "FeatureReadContext", "FormatRegistry", "FormatRegistryContract", "HandlerRegistration", "HistoryContract", "InputSchema", "InteractionContract", "LayerContract", "MapLibreService", "MapLibreServiceDefinition", "MutationContract", "PainterFactoryContract", "PolicyContract", "PresetName", "ProjectionContract", "QueryContract", "RenderAction", "RenderContract", "RenderSignalsContract", "RoutingContract", "ScaleContract", "SelectionContract", "ShortcutsContract", "SnapshotContract", "SourceContract", "SourceFactoryContract", "SurfaceContract", "ValidationContract", "ViewContract", "arrowFormatsPlugin", "attributeCapabilityPlugins", "attributesPlugin", "autoCompletePolygonPlugin", "basemapControlPlugin", "boxSelectPlugin", "cachePlugin", "canvasPainterPlugin", "capabilitiesPlugin", "clickSelectPlugin", "controlContextPlugin", "controlPlugin", "controlsPlugin", "describeAgentTools", "documentPlugin", "dragPanPlugin", "drawFeaturePlugin", "duckDbCapabilityPlugins", "duckDbPlugin", "editCapabilityPlugins", "editSessionsPlugin", "editStatePlugin", "editorControlPlugins", "editorPreset", "eventsPlugin", "executionPlugin", "formatPlugin", "formatsPlugin", "headlessPreset", "historyPlugin", "inspectContext", "inspectServices", "interactionPlugin", "invokeAgentTool", "lassoSelectPlugin", "layersPlugin", "mapLibrePlugin", "mapshaperCapabilityPlugins", "mapshaperProcessingPlugin", "measurePlugin", "mutationPlugin", "operationHostPlugin", "partEditPlugin", "policyPlugin", "projectionPlugin", "queryPlugin", "renderPlugin", "renderSignalsPlugin", "reshapeFeaturePlugin", "resolvePlugins", "ringEditPlugin", "routingPlugin", "scalePlugin", "scrollZoomPlugin", "selectionPlugin", "settleContext", "shortcutsPlugin", "snapshotPlugin", "sourcePlugin", "splitFeaturePlugin", "summarizeCapabilityResult", "surfacePlugin", "topologySourceFactoryPlugin", "topologyValidationPlugin", "transformFeaturePlugin", "validateCapabilityInput", "validationPlugin", "validatorPlugin", "vertexEditPlugin", "viewPlugin", "viewerControlPlugins", "viewerPreset", "workspaceCapabilityPlugins"]
examples: ["plugin-install", "plugin-capability", "export-formats", "online-map-services"]
stability: experimental
verifiedVersion: unreleased
---

# Develop and install plugins

<span id="native-plugin-and-service-contracts" />
<span id="ctxplugin-and-fiber" />
<span id="presets-and-optional-providers" />

Emap manages service dependencies and resource lifecycles through an embedded Cordis `Context` (`map.ctx`). Each map instance owns an isolated context. You can start from a built-in preset (`editor`, `viewer`, `headless`, or `empty`) and add, replace, or exclude plugins as needed.

## Install plugins at creation or runtime

- **At creation time**: Pass `plugins` in `Emap.create({ plugins, excludePlugins })`. A plugin whose `name` matches an existing preset entry replaces that entry, while `excludePlugins` removes named preset plugins. Make sure all required service dependencies remain satisfied.
- **At runtime**: Call `const fiber = map.ctx.plugin(plugin)`. This returns a Cordis `Fiber` handle. Always `await fiber.await()` before calling services provided by the newly mounted plugin, and call `await fiber.dispose()` when you want to unload it early.

## Declare services and `inject` dependencies

<span id="injectable-emap-services" />

Extend the `cordis` module interface to type your custom service. Use `provide` and `ctx.provide()` to register a service provider, and declare `inject` in consumer plugins so Cordis activates the consumer only after its dependencies are ready:

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

```ts
const provider = map.ctx.plugin(counterPlugin);
const reader = map.ctx.plugin(readerPlugin);
await provider.await();
await reader.await();
```

If `provider` is disposed (`await provider.dispose()`), dependent plugins (`reader`) automatically deactivate until a `counter` provider becomes available again.

## Manage side effects with `ctx.effect()`

<span id="effects-and-asynchronous-resources" />

Wrap event listeners, UI controls, Worker handles, or timers inside `ctx.effect()`. Register cleanup callbacks before exposing a service so partial initialization failures cannot leak resources:

- Clean up only resources that the plugin itself created. Borrowed resources (such as a shared `workerRuntime` passed by the host application) remain the host's responsibility.
- Do not maintain a separate global singleton registry alongside Cordis Fibers. Calling `await map.dispose()` tears down the context and awaits all plugin cleanup effects.

## Register custom format codecs

<span id="formats-registration-contract" />

Format plugins register parsers and exporters into `ctx.formats` (`map.formats`). When creating a detached `TopologySource`, pass `{ formats: map.formats }` explicitly so the source can resolve formats registered on that map instance.

Optional official integrations (`@mapseekai/emap/arrow`, `/duckdb`, `/maplibre`, `/geopackage`, `/geotiff`) follow this same plugin pattern. See [Data formats](../data/formats.md) for implementing a custom `DatasetFormatPlugin`.

## Expose AI and agent capabilities (`map.capabilities`)

`map.capabilities` registers structured capabilities with input validation schemas, effect metadata, and execution handlers. The `@mapseekai/emap/ai` entry point (`describeAgentTools`, `invokeAgentTool`) adapts registered capabilities into tool-calling schemas for LLM agents without bundling a specific model provider.

By default, agent-initiated write operations (`origin: 'agent'`) are blocked until authorized by your application's `authorizeCapability` policy callback. Always await capability execution and inspect the returned result.

## Inspect runtime state

<span id="inspect-the-actual-runtime" />

Import `inspectContext()`, `inspectServices()`, and `settleContext()` from `@mapseekai/emap/context` to diagnose missing service dependencies or inactive Fibers during development. See [Runtime composition](../concepts/runtime.md) for preset details.

## Runnable examples

- [Install a plugin](/mapseekai/emap/examples/plugin-install/)
- [Export formats](/mapseekai/emap/examples/export-formats/)
- [Online map services](/mapseekai/emap/examples/online-map-services/)

## Implementation sources

<span id="core-parameters" />
<span id="pluginobject-shape" />
<span id="feature-composition" />
<span id="runtime-responsibilities" />
<span id="agent-access" />

- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
- [`src/runtime/services/options.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/options.ts)
- [`src/runtime/services/context.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/context.ts)
