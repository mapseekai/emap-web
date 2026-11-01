---
id: index
slug: /reference/
title: Reference
description: "API signatures, event payloads, errors, and compatibility requirements."
api: []
examples: []
stability: stable
verifiedVersion: unreleased
---

# Reference manual

Use the reference pages to look up exact event payloads, error codes, browser/dependency requirements, and TypeScript signatures while building or debugging an integration. For step-by-step task instructions, see the [How-to guides](../guides/index.md).

| Reference topic | Page |
| --- | --- |
| Map event names, payload fields, and feature event filters | [Events reference](./events.md) |
| `OpResult` / `OpError` kinds, CRS preflight diagnostics, resource limits, and validator reports | [Errors reference](./errors.md) |
| Browser version floors, rendering backends, peer dependencies, and Worker/WASM assets | [Compatibility](./compatibility.md) |
| Symptom-based diagnostic checklists for common integration issues | [Troubleshooting (FAQ)](./faq.md) |
| Complete generated classes, interfaces, methods, and type declarations | [Generated API reference](/mapseekai/emap/api/) |

## How to read API signatures

<span id="api-signatures" />

- **Synchronous values vs. `Promise` vs. `OpResult`**: Many workspace operations (`map.ops.*`, `transaction.commit()`) return `Promise<OpResult<T>>`. A resolved Promise does **not** mean the operation succeeded; always check `if (result.ok)` before reading `result.value`, and remember that in-place mutations often return `undefined` as their success value.
- **Optional payload fields**: High-frequency or incremental events (such as `move` and `historychange`) use partial payload types where fields may be `undefined`.
- **Identifiers and coordinate spaces**: `FeatureRef.id` is a zero-based index within a data layer (not a persistent database primary key), and canvas pixel coordinates (`point`) are distinct from project CRS coordinates (`lngLat` / `center`). See [Map and data model](../concepts/overview.md).

## Scope of this reference

These pages document the public exports, runtime contracts, and asset requirements of `@mapseekai/emap`, cross-checked against the generated TypeDoc API and runnable examples. When upgrading a published package version in your application, always verify its installed `.d.ts` declarations, `peerDependencies`, and matching Worker/WASM assets.

## Implementation sources

<span id="events-and-errors" />
<span id="environment-and-troubleshooting" />

- [`src/index.ts`](https://github.com/mapseekai/emap/blob/master/src/index.ts)
- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
