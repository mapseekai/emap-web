---
id: errors
slug: /reference/errors
title: Errors reference
description: "Look up error types, source-loading diagnostics, resource limits, and validator reports."
api: ["Emap", "Err", "OK", "okValue", "OpError", "OpResult", "topologyValidator", "TopologyValidatorOptions", "ValidationChange", "ValidationIssue", "ValidationReport", "Validator", "ValidatorPhase", "ValidatorRegistry", "ValidatorResult", "SourceLoadError", "DuckDbOperationError", "DuckDbOperationErrorKind"]
examples: ["check-geometry","duckdb-query","transaction"]
stability: stable
verifiedVersion: unreleased
---

# Errors reference

<span id="core-error-handling" />
<span id="more-error-construction" />

Emap operations return discriminated union results (`OpResult<T>`) and structured error objects. Always branch on `result.ok` and `result.error.kind` (or diagnostic `code` values) rather than parsing human-readable error strings.

## `OpResult` and `OpError` kinds

<span id="expression-and-worker-controls" />

`OpResult<T>` is either `{ ok: true, value: T }` (created via `OK` or `okValue(value)`) or `{ ok: false, error: OpError }` (created via `Err` helpers):

| `OpError.kind` | Payload fields | Meaning and recovery |
| --- | --- | --- |
| `'not-found'` | `what`, `id` | Target source, data layer, mask, divider, or attribute field was not found; verify IDs |
| `'validation'` | `field`, `reason` | Invalid option or parameter value; highlight the offending input field |
| `'expression-disabled'` | `operation` | JavaScript expression execution was blocked by default policy; use typed APIs or `expressionPolicy: 'trusted'` |
| `'duckdb'` | `operation`, `duckDbKind`, `reason`, `field?`, `cause?` | Wrapped DuckDB operation error; inspect `duckDbKind` |
| `'mapshaper'` | `cause`, `cmd?`, `operation?` | Mapshaper command execution, Worker transfer, or commit failed |
| `'stale-operation'` | `sourceId`, `operation` | Source data version changed while the async operation was running; do not force-commit the obsolete output |
| `'host-removed'` | No extra fields | The `Emap` instance was disposed before the operation finished; skip UI updates |

## Source-loading diagnostics and `SourceLoadError`

`map.preflightSource()` returns `SourceLoadDiagnostic` entries (`{ code, severity, message?, suppliedCrs?, metadataCrs?, effectiveCrs? }`), while `addSource()` and `confirmSource()` throw `SourceLoadError` when registration cannot proceed:

| Diagnostic `code` | Meaning | Recommended action |
| --- | --- | --- |
| `'source-crs-required'` | Source lacks CRS metadata | Collect `sourceCrs` from the user and resubmit `result.draft` to `preflightSource()` |
| `'source-crs-invalid'` | Supplied or embedded CRS string is invalid | Prompt for a valid EPSG code or WKT/Proj definition |
| `'source-crs-overrides-metadata'` | Explicit `sourceCrs` overrides file metadata (warning) | Confirm that the override is intentional |
| `'source-id-conflict'` | Source ID is already registered or reserved | Choose a unique ID or remove the existing source first |
| `'source-load-cancelled'` | Loading was cancelled via `AbortSignal` | Await cleanup and reset the upload UI |
| `'source-load-rejected'` | File content or import contract was rejected | Display diagnostic details to the user |
| `'source-plan-invalid'` | Plan is malformed, belongs to another map, or was already consumed | Run `preflightSource()` again |
| `'source-plan-stale'` | Source or map state changed after preflight | Run `preflightSource()` again against current state |

Remember that a `ReadySourceLoadPlan` is bound to a single `Emap` instance and can be confirmed only once, and a `'needs-input'` preflight result has not registered the source yet.

## Default input and ZIP resource limits

<span id="import-resource-limits" />

`TopologySource.fromBytes()` enforces resource limits to reject oversized inputs or ZIP bombs early:

| Option | Default value | Purpose |
| --- | --- | --- |
| `resourceLimits.maxInputBytes` | `2 GiB` | Maximum raw bytes per import request, summed across multiple input files |
| `zipLimits.maxCompressedBytes` | `2 GiB` | Maximum compressed `.zip` archive size |
| `zipLimits.maxBytes` | `2 GiB` | Maximum total uncompressed bytes across archive entries |
| `zipLimits.maxEntries` | `5000` | Maximum number of files inside a `.zip` archive |
| `zipLimits.maxRatio` | `100` | Maximum uncompressed-to-compressed expansion ratio |

These defaults act as upper safety bounds, not a guarantee that every client device has enough memory for a 2 GiB dataset. Check `file.size` against a stricter application limit before calling `file.arrayBuffer()`. GeoPackage and GeoTIFF modules define their own limits.

## DuckDB error categories (`DuckDbOperationErrorKind`)

<span id="more-loading-and-duckdb-errors" />
<span id="duckdb-failure-kinds" />

Standalone `@mapseekai/emap/duckdb` tools throw `DuckDbOperationError` (while map-level wrappers surface the same category in `OpError.duckDbKind`):

| `kind` / `duckDbKind` | Meaning |
| --- | --- |
| `'validation'` | Input dataset, CRS, distance unit, or SQL query violated preconditions |
| `'runtime-unavailable'` | `DuckDbRuntime` was not initialized or has already been closed |
| `'spatial-extension-unavailable'` | DuckDB `spatial` extension failed to load |
| `'query-failed'` | SQL execution or connection failure inside DuckDB-Wasm |
| `'conversion-failed'` | Arrow / WKB / dataset conversion failed |

## Post-commit validator reports (`ValidationReport`)

<span id="more-validator-reports" />

Registered validators (such as `topologyValidator()`) run asynchronously in the `'after-commit'` phase. Each `ValidationReport` contains `ok: boolean` and an `issues` array (`{ severity, message, ref? }`); uncaught exceptions inside a custom validator are captured as `'error'`-severity issues.

When a validator reports a failed result, the map emits `validationfailed` (`{ results, label }`). Use any `ref` in the report to locate affected features. Later edits may have occurred while validation was running, so only offer undo for the target commit after confirming it remains the latest history entry.

## API

<span id="err-constructor-parameters" />
<span id="topologyvalidator-parameters" />

- [src.OpError](/mapseekai/emap/api/types/emap.OpError.html)
- [src.SourceLoadError](/mapseekai/emap/api/classes/emap.SourceLoadError.html)
- [src_duckdb.DuckDbOperationError](/mapseekai/emap/api/classes/duckdb.DuckDbOperationError.html)

## Runnable examples

- [check-geometry](/mapseekai/emap/examples/check-geometry/)
- [duckdb-query](/mapseekai/emap/examples/duckdb-query/)
- [transaction](/mapseekai/emap/examples/transaction/)

## Implementation sources

- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
- [`src/engine/map/source-loading.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/source-loading.ts)
- [`src/domain/validation/validator.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/validation/validator.ts)
- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
