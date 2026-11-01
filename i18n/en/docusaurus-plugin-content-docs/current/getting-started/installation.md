---
id: installation
slug: /getting-started/installation
title: Installation
description: "Install the Emap core and stylesheet, then select entry points and peer dependencies."
api: ["Emap", "TopologySource"]
examples: ["getting-started/vector-file"]
stability: stable
verifiedVersion: unreleased
---

# Installation

Install `@mapseekai/emap` in a browser application, import its stylesheet, and initialize the map after its DOM container mounts. Emap renders on the client; Node.js is used only for your development server and build toolchain.

## 1. Install the core package and stylesheet

<span id="install-the-core-package" />

Install `@mapseekai/emap` with your package manager (keep a single package manager in charge of the lockfile):

```bash
pnpm add @mapseekai/emap
# or npm install @mapseekai/emap
```

In your client entry file, import `Emap`, `TopologySource`, and the default stylesheet. Give the map container an explicit non-zero width and height, and await `Emap.create()` after the container is mounted in the DOM:

```ts
import { Emap, TopologySource } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';
```

## 2. Configure TypeScript and your bundler

Emap is published as ES2022 modules (`ESM`) and uses extensionless relative imports in its `.d.ts` declarations. Configure your `tsconfig.json` with `moduleResolution: "bundler"` for modern browser bundlers such as Vite, Rspack, or Webpack 5:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true
  }
}
```

If your application uses server-side rendering (SSR, such as Next.js or Nuxt), create the map inside a client-only lifecycle hook (`useEffect` or `onMounted`) rather than during server rendering. See [Compatibility](../reference/compatibility.md) for browser version floors and rendering backend requirements.

## 3. Choose optional feature entry points

The root entry point (`@mapseekai/emap`) includes the map core, built-in vector formats (GeoJSON, TopoJSON, Shapefile ZIP, KML, MSX), and interactive editing tools. Additional capabilities are split into subpath exports so you only install and bundle the dependencies you need:

| Capability | Import path | Guide |
| --- | --- | --- |
| Map core, vector sources, and editing | `@mapseekai/emap` | [Your first map](./quick-start.md) |
| Arrow, GeoArrow, and GeoParquet | `@mapseekai/emap/arrow` | [Data formats](../data/formats.md) |
| In-browser SQL and spatial analysis | `@mapseekai/emap/duckdb` | [DuckDB toolbox](../data/duckdb.md) |
| Local `.gpkg` vector feature tables | `@mapseekai/emap/geopackage` | [GeoPackage import](../data/geopackage.md) |
| Local GeoTIFF / COG window reading | `@mapseekai/emap/geotiff` | [Local GeoTIFF rasters](../data/geotiff.md) |
| Online basemaps and MapLibre overlays | `@mapseekai/emap/maplibre` | [Plugins](../guides/plugins.md) |

If you are building custom runtime compositions or AI tool integrations, you can also import from `/context`, `/services`, `/providers`, `/plugins`, `/presets`, and `/ai`. When using optional format plugins, mount the plugin on the map first and pass `map.formats` when creating a `TopologySource`.

## 4. Frontend framework integration best practices

When using Emap with React, Vue 3, or Next.js, follow these lifecycle and reactivity guidelines to avoid common integration pitfalls:

### React 18 / 19 and Next.js

In React, store the container and map with `useRef`. React does not await a Promise returned by effect cleanup, so this example serializes creation and disposal before StrictMode reruns the effect on the same container:

```tsx
import { useEffect, useRef } from 'react';
import { Emap } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Emap | null>(null);
  const lifecycle = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    lifecycle.current = lifecycle.current.then(async () => {
      if (cancelled) return;
      const map = await Emap.create({ container });
      if (cancelled) await map.dispose();
      else mapRef.current = map;
    });
    void lifecycle.current.catch(console.error);

    return () => {
      cancelled = true;
      lifecycle.current = lifecycle.current.then(async () => {
        const map = mapRef.current;
        mapRef.current = null;
        if (map) await map.dispose();
      });
      void lifecycle.current.catch(console.error);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

> **Next.js App Router tip**: Emap relies on browser Canvas and DOM APIs. Add the `'use client'` directive at the top of client component files, or import dynamically via `dynamic(() => import('./MapView'), { ssr: false })`.

### Vue 3

> [!CAUTION] Avoid deep reactive wrappers around map instances
> Never place an `Emap` instance inside Vue's `ref()` or `reactive()`. Vue 3's deep Proxy intercepts private class members and internal Cordis Context properties, causing `Cannot read private member` or context lookup errors.

In Vue 3, always use `shallowRef` or `markRaw`:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import { Emap } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const container = useTemplateRef<HTMLDivElement>('container');
const mapInstance = shallowRef<Emap | null>(null);
let unmounted = false;

onMounted(async () => {
  if (!container.value) return;
  const map = await Emap.create({ container: container.value });
  if (unmounted) await map.dispose();
  else mapInstance.value = map;
});

onUnmounted(() => {
  unmounted = true;
  const map = mapInstance.value;
  mapInstance.value = null;
  if (map) void map.dispose().catch(console.error);
});
</script>

<template>
  <div ref="container" style="width: 100%; height: 500px;" />
</template>
```

If unmount happens before creation finishes, the example disposes the resulting map. Vue does not await the unmount callback; application code must wait for `dispose()` before reusing the same container.

### Observe container resize with `ResizeObserver`

When collapsible sidebars, full-screen toggles, or floating panels change the map container's CSS dimensions, call `map.resize()` to synchronize the Canvas drawing buffer:

```ts
const observer = new ResizeObserver(() => {
  map.resize();
});
observer.observe(containerElement);
// Disconnect on teardown: observer.disconnect();
```

## 5. Verify the installation

Follow [Your first map](./quick-start.md) to render an inline GeoJSON polygon. Because it uses inline data, it verifies your package setup without depending on external files or network services.

- **Missing peer dependency errors**: Install the matching version listed in the [Peer dependency matrix](../reference/compatibility.md#peer-dependency-configuration).
- **Unstyled or misplaced controls**: Confirm that `@mapseekai/emap/style.css` is imported.
- **Worker or WASM loading failures**: Verify that Worker and WASM URLs resolve to actual JavaScript or WebAssembly files in both development and production builds.

## Runnable examples

- [Open a vector file](/mapseekai/emap/examples/getting-started/vector-file/)

## Implementation sources

<span id="prerequisites" />
<span id="more-environment-and-module-configuration" />
<span id="more-optional-capabilities-and-peer-dependencies" />
<span id="geoarrow-and-geoparquet" />
<span id="duckdb-queries-and-spatial-processing" />
<span id="geopackage-import" />
<span id="maplibre-online-basemaps-and-overlays" />
<span id="worker-execution" />
<span id="next-steps" />

- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
- [`tsconfig.json`](https://github.com/mapseekai/emap/blob/master/tsconfig.json)
