# Metrics Consumption Layer

Implemented read API for pre-aggregated metric rows. Design intent: [query-aggregations.md](./query-aggregations.md). Write pipeline: [aggregations.md](./aggregations.md).

## Overview

Metrics are stored at:

```text
/tenants/{tenantId}/metrics/{metricName}/rows/{docId}
```

Reads use **deterministic document IDs** (O(1) `get` / `getAll`), not Firestore queries. The same key algorithm used by the aggregation engine (`buildMetricDocId` in `@repo/metrics-engine`) is used by the read API.

## Document shape

```json
{
  "id": "32-char hex doc id",
  "tenantId": "tenant_a",
  "metricName": "metric_definition_id",
  "userId": "firebase_uid",
  "group": { "month": "2026-06" },
  "dimensions": { "categoryId": "food" },
  "values": {
    "sum_amount": 400,
    "count": 10,
    "avg_amount": 40
  },
  "updatedAt": "2026-06-02T12:00:00.000Z"
}
```

- `metricName` is the metric definition’s `target.collection` (defaults to the definition id).
- `userId` is the **owner** of the metric row (from source entity `ownerId` on write; from JWT on read).
- `values` keys follow aggregation naming: `sum_*`, `count_*`, `count`, `avg_*`.

## Key algorithm

```ts
buildMetricDocId(userId, group, dimensions)
// → sha256(stableStringify({ userId, group, dimensions })).slice(0, 32)
```

`stableStringify` sorts object keys recursively so dimension key order in JSON does not change the id.

**Write path:** `userId` = `record.ownerId` (system field injected on entity create). Records without `ownerId` do not produce metric deltas.

**Read path:** `userId` = authenticated user’s `uid` (never accepted from the client body).

## API

Base URL: same as the rest of the API (`/api/...`). Requires Firebase Auth + App Check (same as CRUD).

### Permission

| Permission | Description |
| --- | --- |
| `metricValue.read` | Fetch metric rows for the authenticated user |

Separate from `metricDefinition.*` (definition admin). Tenant built-in `admin` role includes `*.read`, which covers `metricValue.read`.

### POST `/api/metrics/:metricDefinitionId/row`

Fetch a single row.

**Request body:**

```json
{
  "group": { "month": "2026-06" },
  "dimensions": { "categoryId": "food" }
}
```

Rules:

- `group` must contain **exactly** the fields listed in the definition’s `groupBy` (same keys, no extras).
- `dimensions` must contain **exactly** the fields listed in the definition’s `dimensions`.
- Values must be string, number, or boolean.

**Success (200):**

```json
{
  "data": {
    "values": { "sum_amount": 400 },
    "updatedAt": "2026-06-02T12:00:00.000Z"
  },
  "error": null
}
```

**Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid body or query keys vs definition |
| 401 | `UNAUTHORIZED` | Missing auth |
| 403 | `FORBIDDEN` | Missing `metricValue.read` |
| 404 | `NOT_FOUND` | Unknown metric definition id |
| 404 | `METRIC_ROW_NOT_FOUND` | No row for this user + group + dimensions |

### POST `/api/metrics/:metricDefinitionId/batch`

Fetch up to **50** rows in one request (Firestore `getAll`).

**Request body:**

```json
{
  "queries": [
    { "group": { "month": "2026-06" }, "dimensions": { "categoryId": "food" } },
    { "group": { "month": "2026-05" }, "dimensions": { "categoryId": "food" } }
  ]
}
```

**Success (200):**

```json
{
  "data": {
    "items": [
      { "values": { "sum_amount": 100 }, "updatedAt": "..." },
      { "values": { "sum_amount": 50 }, "updatedAt": "..." },
      null
    ]
  },
  "error": null
}
```

`items[i]` corresponds to `queries[i]`. `null` means no row exists (not an error).

## Mapping UI → queries

1. Load the metric definition (`GET /api/metric-definitions/:id`) or cache it in the widget config.
2. For each dashboard cell, build `group` and `dimensions` from **known** field values (e.g. selected month, category id).
3. Use **row** for a single KPI; use **batch** for charts/tables with a fixed set of buckets.
4. Do not send partial dimension filters or date ranges—the API does not support exploration queries.

Example: definition with `groupBy: ["month"]`, `dimensions: ["categoryId"]`, user viewing June + Food:

```json
{ "group": { "month": "2026-06" }, "dimensions": { "categoryId": "food" } }
```

Time bucketing (hour/day/month/year) is whatever the source entity stores in `groupBy` fields; there is no `timeGrouping` field on definitions yet.

## Operations

### After deploying the `userId` key change

Existing rows keyed without `userId` will not match new reads. For each metric with data:

1. `POST /api/metric-definitions/:id/backfill` (initial or version-bump backfill per [aggregations-ops.md](./aggregations-ops.md)).
2. This rebuilds rows under the new `docId` scheme.

No composite Firestore indexes are required for the read API.

## Explicit non-goals

- Partial dimension filters, date ranges, or dynamic `WHERE` clauses
- Cross-user or tenant-wide metric reads (owner-only via `userId` in the key)
- `timeGrouping` on metric definitions (deferred)
- Firestore security rules for metric rows (optional future hardening)

## Web client (implemented)

### API client (`apps/web/app/lib/api-client.ts`)

| Export | Purpose |
| --- | --- |
| `getMetricDefinition(id)` | `GET /api/metric-definitions/:id` |
| `fetchMetricRow(id, query)` | `POST /api/metrics/:id/row` |
| `fetchMetricRowOrNull(id, query)` | Same; returns `null` on `METRIC_ROW_NOT_FOUND` |
| `fetchMetricBatch(id, queries)` | `POST /api/metrics/:id/batch` |
| `isMetricRowNotFoundError(error)` | Type guard for empty KPI state |
| `MetricRowQuery`, `MetricRowResponse` | Request/response types |

Auth and App Check use the existing `apiRequest` helper. Callers pass only `metricDefinitionId` from the database—never hardcoded metric names or Firestore paths.

### Query helpers (`apps/web/app/lib/metric-query-utils.ts`)

| Export | Purpose |
| --- | --- |
| `buildMetricRowQuery(definition, { groupBindings, dimensionBindings })` | Build + validate `group`/`dimensions` before fetch |
| `validateMetricQueryAgainstDefinition` | Re-export from `@repo/metrics-engine` |
| `chunkMetricQueries(queries, maxSize?)` | Split batch requests (default 50) |
| `formatMetricValueKey(operation, field?)` | Map aggregation spec → `values` key names |
| `listRequiredMetricQueryFields(definition)` | Lists `groupBy` / `dimensions` field names |

### Permissions

- `metricValue.read` is available in Role Manager (`apps/web/app/components/roles/RoleManager.tsx`).
- Settings → Metrics remains gated by `metricDefinition.*` only.

---

## Global UI components

Runtime, **user-scoped** widgets on entity list views (table and card). No hardcoded metrics: every widget references a `metricDefinitionId` and bindings from definitions created in **Settings → Metrics**.

### Principles

| Principle | Detail |
| --- | --- |
| No hardcoded metrics | Widget config stores `metricDefinitionId` + `MetricBindingSource` bindings only |
| User scope | API injects JWT `uid`; UI never sends `userId` |
| Runtime data | `useMetricDefinition` → `buildMetricRowQueryFromBindings` → `useMetricRow` / `useMetricBatch` |
| Definition-driven labels | Title from `definition.name`; values via `formatPrimaryMetricValue` |

### Components and hooks

| Location | Role |
| --- | --- |
| `MetricValueDisplay` | Single KPI card (loading / empty / forbidden) |
| `MetricValueSeries` | Grid of KPI cells from batched queries |
| `MetricWidgetRenderer` | Dispatches `ViewMetricWidget` (`kpi` \| `series`) |
| `EntityViewMetricsStrip` | Renders `activeView.metricWidgets` above the list |
| `useMetricDefinition` / `useMetricRow` / `useMetricBatch` | React Query; `enabled` when `metricValue.read` and bindings resolve |
| `metric-binding-resolution.ts` | Resolves `MetricBindingSource` → `MetricRowQuery` |

**Typical KPI flow:**

```text
usePermission("metricValue.read")
  → useMetricDefinition(metricDefinitionId)
  → buildMetricRowQueryFromBindings(definition, bindings, context)
  → useMetricRow → fetchMetricRow
  → formatPrimaryMetricValue(definition, row.values)
```

**Batch flow:** each series bucket has full bindings → `chunkMetricQueries` → `useMetricBatch` merges chunk results in order.

### Schema (`@repo/entities`)

- `ViewConfig.metricWidgets?: ViewMetricWidget[]` — per table/card view in entity UI overrides
- `ViewMetricWidget`: `display: "kpi" | "series"` + `metricDefinitionId` + `groupBindings` / `dimensionBindings` (series adds `buckets[]`)
- Card slot `component: "metric-kpi"` — same bindings on `CardMetricKpiSlotBinding` (no `fieldPath`)

`MetricBindingSource` kinds:

- `static` — fixed value in config
- `entityField` — field on the current card row (`record`)
- `listFilter` — active list filter values (`listFilters`)
- `routeParam` — React Router search param

### Builder entry points

1. **Entity list → View settings** — `MetricWidgetsBuilderSection` below the table/card switch; persists `metricWidgets` on the active view type.
2. **Card layout builder** — slot component `metric-kpi`: pick ACTIVE definition from `listMetricDefinitions()`, configure bindings (emphasize `entityField` for row-scoped dimensions).

Gated by `metricValue.read` (read/fetch) and `ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS` (save layout).

### Runtime wiring

- `EntityPage` renders `EntityViewMetricsStrip` when `activeView.metricWidgets` is non-empty; passes `listFilters` and `routeParams` as binding context.
- `EntityLayoutCardView` passes the same context into `metric-kpi` slots via `renderEntityLayoutSlotPreview`.

### Permission gating

`usePermission("metricValue.read")` on fetch and builder sections; forbidden copy in `metrics.widget.forbidden`.

### Testing

- `metric-binding-resolution.test.ts` — binding source resolution
- `MetricValueDisplay.test.tsx` — loading, value, forbidden (mocked hooks)
- `card-layout-builder-state.test.ts` — `metric-kpi` layout round-trip

Manual: Settings → Metrics (ACTIVE) → entity View settings → KPI with static bindings → list page shows value after source CRUD (+ backfill if needed).

## Implementation reference

| Area | Location |
| --- | --- |
| Key + validation | `packages/metrics-engine` |
| Read routes | `apps/api/src/aggregation/register-metric-read-routes.ts` |
| Repository batch get | `packages/firestore-converters` / `packages/gcp-firebase` |
| Write path (ownerId) | `packages/aggregation-engine/src/delta.ts` |
