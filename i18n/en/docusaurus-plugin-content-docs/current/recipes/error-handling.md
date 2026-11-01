---
id: error-handling
slug: /recipes/error-handling
title: Error handling
description: "Handle operation results and source diagnostics, and roll back failed transactions."
api: ["Emap", "OpResult", "OpError"]
examples: ["check-geometry", "duckdb-buffer", "duckdb-query"]
stability: stable
verifiedVersion: unreleased
---

# Handle failures and recovery

Emap surfaces errors through three distinct channels: `OpResult` return values (`{ ok: false, error }`), rejected Promises (during initialization, file parsing, or standalone tool calls), and diagnostic events (`error` and `validationfailed`). Handle each channel explicitly so your UI never reports success when a change was rejected or rolled back.

## 1. Branch on `OpResult` and `error.kind`

Workspace operations under `map.ops.*`, `map.attributes.*`, and `transaction.commit()` resolve to an `OpResult` rather than throwing on expected domain errors. Check `result.ok` and switch on the structured `result.error.kind` discriminant instead of parsing human-readable message strings:

```ts
const result = await map.ops.checkGeometry({ source: 'main' });
if (result.ok) {
  console.log(result.value);
} else {
  switch (result.error.kind) {
    case 'not-found':
      console.error(`Missing ${result.error.what}: ${result.error.id}`);
      break;
    case 'validation':
      console.error(`${result.error.field}: ${result.error.reason}`);
      break;
    default:
      console.error(result.error);
  }
}
```

Note that for inspection operations such as `checkGeometry()`, `result.ok === true` means the check executed to completion; inspect `result.value` to see whether the dataset itself contains geometry defects.

## 2. Catch rejected Promises for initialization and imports

Map creation (`Emap.create()`), byte parsing (`TopologySource.fromBytes()`), Worker/WASM asset loading, and standalone DuckDB tools reject their Promise on failure:

- Wrap `await` calls in `try/catch` and preserve the user's selected file and form input so they can fix parameters and retry.
- Use `map.on('error', ...)` for centralized telemetry or non-blocking banners, not as a replacement for local `try/catch` or `result.ok` checks. Coordinate both paths so one failure does not trigger duplicate toast notifications.

## 3. Recovery actions by failure category

| Failure state | Recommended UI and application response |
| --- | --- |
| `validation` or `not-found` | Keep the dialog open and highlight the invalid parameter or missing layer/field |
| `source-crs-required` (preflight `needs-input`) | Prompt the user for the source CRS and resubmit the preflight draft |
| `stale-operation` | Target data changed while the async job was running; do not force-commit the stale result, and rerun against current data if appropriate |
| User cancellation (`AbortSignal`) | Await cleanup completion and restore toolbar button states without showing an error alert |
| `host-removed` | The map was disposed before the async task finished; discard UI updates for that map |
| Worker or WASM asset load failure | Verify asset URLs, MIME types, and network/CSP headers before retrying |

Never blindly retry a write operation in a loop without checking whether the previous attempt already mutated the source version.

## 4. Roll back failed transactions safely

<span id="roll-back-a-transaction" />

When an operation inside a transaction fails, roll back the open transaction immediately. In a `catch` block, check `if (tx.isOpen)` before calling `tx.rollback()` so you do not attempt to roll back a transaction that was already closed. Always await `tx.commit()` and inspect its returned `OpResult`.

See [Errors reference](../reference/errors.md) for the complete catalog of `OpError.kind` values, source preflight diagnostic codes, and DuckDB error kinds.

## API

<span id="core-methods" />
<span id="opresult-shape" />
<span id="more-error-details" />
<span id="source-load-error-event" />

- `Emap`
- `OpResult`
- `OpError`

## Runnable examples

- [Geometry check](/mapseekai/emap/examples/check-geometry/)
- [DuckDB buffer](/mapseekai/emap/examples/duckdb-buffer/)
- [DuckDB query](/mapseekai/emap/examples/duckdb-query/)

## Implementation sources

- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
- [`src/engine/map/source-loading.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/source-loading.ts)
- [`src/domain/edit/transaction.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/edit/transaction.ts)
