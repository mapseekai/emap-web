---
id: runtime
slug: /concepts/runtime
title: Runtime composition
description: "Understand Cordis Context, map presets, and service composition."
api: ["Emap", "Context", "TopologySource"]
examples: ["plugin-install", "web-worker"]
stability: stable
verifiedVersion: unreleased
---

# Runtime composition

Emap assembles map services, interaction handlers, and optional extensions using [Cordis](https://github.com/cordiverse/cordis). Every `Emap` instance owns an isolated Cordis `Context` (`map.ctx`) where services are shared within that map workspace and plugin `Fiber` handles manage activation order and teardown cleanup.

## Service contracts, providers, and feature plugins

Emap's runtime architecture separates three roles:

1. **Service contracts (`src/runtime/services/contracts/`)**: Define the TypeScript interface and capability boundaries exposed on `ctx`.
2. **Service providers (`src/runtime/providers/`)**: Instantiate concrete implementations, register them via `ctx.provide()`, and own their internal state and cleanup.
3. **Feature plugins (`src/runtime/plugins/`)**: Declare required services via `inject` and contribute interaction handlers, UI controls, format codecs, or AI capabilities.

`map.ctx` is the live Cordis `Context`, while the `Emap` class serves as an ergonomic facade that delegates calls to mounted services. Note that source code directories organize files by architectural layer rather than mapping 1:1 to runtime instances.

## Built-in presets (`preset`)

When calling `Emap.create({ preset })`, you select the baseline set of providers and feature plugins installed in `map.ctx`:

| Preset | Included capabilities | Typical use case |
| --- | --- | --- |
| `'editor'` (default) | All `'viewer'` capabilities plus interactive drawing, vertex, transform, and topology editing handlers | Full-featured GIS editors and annotation apps |
| `'viewer'` | Data management, canvas rendering, camera navigation, feature queries, and selection | Read-only map viewers, dashboards, and inspection tools |
| `'headless'` | Document, source, and data-processing services without a DOM canvas or pointer handlers | In-browser data conversion, batch processing, and automated tests |
| `'empty'` | Only the base options provider | Custom minimal compositions assembled explicitly via `plugins` |

Note that registering control factories in a preset does not automatically mount buttons into the DOM; call `map.addControl()` or `map.controls.add()` for the specific controls your UI needs. Passing `plugins` in `MapOptions` replaces preset entries with the same `name`, and `excludePlugins` omits named preset entries.

## Lifecycle and resource ownership

- **Readiness and dynamic Fibers**: `await Emap.create()` waits for initial preset plugins to settle. Mounting a plugin later with `const fiber = map.ctx.plugin(myPlugin)` returns a `Fiber` that you can `await fiber.await()` or unload early with `await fiber.dispose()`.
- **Owned vs. borrowed resources**: Services and plugins clean up resources they create inside `ctx.effect()`. However, a shared `workerRuntime` passed into `MapOptions` is **borrowed** by the map; your host application owns that runtime and disposes it after all consuming maps have completed `await map.dispose()`.

## Inspect and extend the runtime

Follow [Develop and install plugins](../guides/plugins.md) to write custom Cordis plugins, register format codecs, or expose AI capabilities. During debugging, use `inspectContext()`, `inspectServices()`, and `settleContext()` from `@mapseekai/emap/context` to inspect active services and pending dependencies. To understand how source files are organized across packages, see [Source organization](./architecture.md).

## Runnable examples

- [Install a plugin](/mapseekai/emap/examples/plugin-install/)
- [Web Worker](/mapseekai/emap/examples/web-worker/)

## Implementation sources

- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
- [`src/runtime/services/context.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/services/context.ts)
- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
