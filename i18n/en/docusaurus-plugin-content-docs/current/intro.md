---
id: intro
slug: /
title: Emap documentation
api: ["Emap", "LayerSpecification", "TopologySource"]
examples: ["china-editing","export-formats","getting-started/vector-file"]
stability: stable
verifiedVersion: unreleased
description: "Tutorials, how-to guides, concepts, and API reference for the Emap browser mapping engine."
---

# Emap developer documentation

Emap is an interactive mapping and spatial data editing engine for the browser. It separates underlying datasets (`TopologySource`), visual presentation (`LayerSpecification`), and reversible editing history (`EditHistory` and `Transaction`) into distinct responsibilities. This separation allows multiple visual styles to share a single copy of geometry while ensuring all spatial and attribute edits support reliable undo and redo.

## Choose a reading path

This documentation is organized into four sections based on your goal:

<div className="docs-paths">

<section>

### Tutorials

Install `@mapseekai/emap` from scratch and build a working interactive map from an inline GeoJSON dataset, covering creation, styling, and cleanup.

[Installation](./getting-started/installation.md) / [Your first map](./getting-started/quick-start.md)

</section>

<section>

### How-to guides

Step-by-step instructions for integrating camera controls, styling, feature selection, geometry editing, file uploads, Web Workers, and plugins.

[Browse how-to guides](./guides/index.md)

</section>

<section>

### Concepts

Understand how Emap models sources and layers, shared arc topology, coordinate reference systems (CRS), and Cordis runtime composition.

[Map and data model](./concepts/overview.md)

</section>

<section>

### Reference

Look up event payloads, error codes, browser and peer dependency requirements, and complete TypeScript API signatures.

[Reference manual](./reference/index.md) / [API reference](/mapseekai/emap/api/)

</section>

</div>

## Find a task quickly

If you already have a specific goal in mind, jump directly to the relevant guide:

| Task | Recommended entry point |
| --- | --- |
| Import and export local vector files | [File import](./recipes/file-upload.md) and [Data formats](./data/formats.md) |
| Style features by attribute and add labels or icons | [Styling layers](./guides/styling.md) |
| Draw or reshape geometry and edit attribute tables | [Editing geometry](./guides/editing.md) and [Attributes](./data/attributes.md) |
| Run spatial analysis (buffer, clip, dissolve, SQL) | [Data operations](./data/operations.md) and [DuckDB toolbox](./data/duckdb.md) |
| Load and browse local GeoTIFF / COG imagery | [Local GeoTIFF rasters](./data/geotiff.md) |
| Handle operation errors or tune rendering performance | [Error handling](./recipes/error-handling.md) and [Performance](./recipes/performance.md) |

## Core capabilities and boundaries

- **Browser-first execution**: Emap runs in the browser main thread and Web Workers. Vector datasets use a shared-arc topology model, while GeoTIFF rasters use a dedicated windowed reading and rendering pipeline.
- **Pluggable rendering backends**: `webgl2` is the default renderer. You can explicitly select `canvas2d` for broad compatibility or `webgpu` in supported environments.
- **On-demand extensions**: Optional format codecs (`@mapseekai/emap/arrow`, `@mapseekai/emap/geopackage`), DuckDB spatial analysis (`@mapseekai/emap/duckdb`), local rasters (`@mapseekai/emap/geotiff`), and MapLibre basemaps (`@mapseekai/emap/maplibre`) are published as separate subpath exports so you only bundle what your application uses.
- **Host application responsibilities**: The `headless` preset provides a DOM-free browser data workspace, not a Node.js server runtime. Server persistence, remote storage, and LLM service hosting remain the responsibility of your application.

## Explore runnable examples

<span id="runnable-examples" />

The [Runnable examples](/mapseekai/emap/examples/) gallery demonstrates individual features in isolation. When adapting example code into a production component, verify the target CRS, rendering backend fallback, and `await map.dispose()` teardown lifecycle.

## Implementation sources

- [`src/index.ts`](https://github.com/mapseekai/emap/blob/master/src/index.ts)
- [`src/engine/map/types.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/types.ts)
- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
