# Metrics Consumption Layer

Implemented read API for pre-aggregated metric rows. Design intent: [query-aggregations.md](./query-aggregations.md). Write pipeline: [aggregations.md](./aggregations.md).

**Hands-on guide (Rates tenant):** [rates-metrics-guide.md](./rates-metrics-guide.md) — definitions for `transaction` and related models, group by vs dimensions, and KPI/Series view configuration.

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
| `metricValue.read` | Fetch metric rows (explicit grant) |
| `{sourceModel}.read` | Also allows row/batch read and GET definition by id when the metric’s `sourceModel` matches (e.g. `transaction.read` for transaction metrics) |
| `metricDefinition.read` | List/create/update definitions in Settings → Metrics; required to pick definitions in view-settings builder |
| `entityUiOverride.update` | Save metrics strip layout and card `metric-kpi` slots on entity views |

**Runtime widgets** on entity lists use source-entity read access, not `metricValue.read` alone. **Layout configuration** stays behind `entityUiOverride.update` (and `metricDefinition.read` to list definitions in the builder).

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
| 403 | `FORBIDDEN` | Missing `metricValue.read` and missing `{sourceModel}.read` |
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

Time bucketing for **date fields** uses `dateFieldGranularity` on the metric definition. When a date field appears in `groupBy` or `dimensions`, choose **day** (`YYYY-MM-DD`), **month** (`YYYY-MM`), or **year** (`YYYY`). The aggregation engine normalizes ISO datetimes to that bucket in UTC before building row keys.

**Value display:** set `valueDisplayFormat` to `number` or `currency` on the definition. KPI and series widgets format the primary aggregation using that setting.

## Operations

### After deploying the `userId` key change

Existing rows keyed without `userId` will not match new reads. For each metric with data:

1. `POST /api/metric-definitions/:id/backfill` (initial or version-bump backfill per [aggregations-ops.md](./aggregations-ops.md)).
2. This rebuilds rows under the new `docId` scheme.

No composite Firestore indexes are required for the read API.

## Explicit non-goals

- Partial dimension filters, date ranges, or dynamic `WHERE` clauses
- Cross-user or tenant-wide metric reads (owner-only via `userId` in the key)
- Firestore security rules for metric rows (optional future hardening)

## Web client (implemented)

### API client (`apps/web/app/lib/api-client.ts`)

| Export | Purpose |
| --- | --- |
| `getMetricDefinition(id)` | `GET /api/metric-definitions/:id` |
| `fetchMetricRow(id, query)` | `POST /api/metrics/:id/row` |
| `fetchMetricRowOrNull(id, query)` | Uses batch endpoint; returns `null` when the row is missing (HTTP 200) |
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

Runtime, **user-scoped** metric slots on entity list views. No hardcoded metrics: every `metric-kpi` slot references a `metricDefinitionId` and bindings from definitions created in **Settings → Metrics**.

### Principles

| Principle | Detail |
| --- | --- |
| No hardcoded metrics | Slot config stores `metricDefinitionId` + `MetricBindingSource` bindings only |
| User scope | API injects JWT `uid`; UI never sends `userId` |
| Runtime data | `useMetricDefinition` → `buildMetricRowQueryFromBindings` → `useMetricRow` |
| Definition-driven labels | Titles/labels are layout `text` / `badge` slots; values via `formatPrimaryMetricValue` |

### Components and hooks

| Location | Role |
| --- | --- |
| `MetricValueDisplay` | Fetches and formats a metric row; `presentation: "inline"` in layout slots (value only) |
| `EntityViewMetricsStrip` | Renders `metricRowLayout` above the list via `RecursiveLayoutRenderer` and `metric-widget` resolution |
| `useMetricDefinition` / `useMetricRow` | React Query; `enabled` when `metricValue.read` or `{sourceModel}.read` and bindings resolve |
| `metric-binding-resolution.ts` | Resolves `MetricBindingSource` → `MetricRowQuery` |

**Typical KPI flow:**

```text
usePermission("metricValue.read")
  → useMetricDefinition(metricDefinitionId)
  → buildMetricRowQueryFromBindings(definition, bindings, context)
  → useMetricRow → fetchMetricRow
  → formatPrimaryMetricValue(definition, row.values)
```

### Schema (`@repo/entities`)

- `EntityUIConfig.metricWidgets` — reusable metric widget definitions (inner `metricStrip` layouts with `metric-kpi` slots)
- `EntityUIConfig.metricRowLayout` — row layout with `metric-widget` components referencing widgets
- `metricStripHasContent(layout)` — true when any column has at least one row (gates metrics row visibility)
- Widget inner layouts use slot `kind: "metric-kpi"` — bindings on layout JSON (no `fieldPath`)

`MetricBindingSource` kinds:

- `static` — fixed value in config
- `entityField` — field on the current card row (`record`)
- `listFilter` — active list filter values (`listFilters`)
- `routeParam` — React Router search param

### Builder entry points

1. **Settings → Design layout → Metrics row** — `MetricsRowDesigner` with Widgets + Row layout tabs; persists `metricWidgets` and `metricRowLayout` on entity UI config.
2. **Widgets tab** — inner widget layouts (`designSurface: "metricStrip"`) with `metric-kpi` slots via `MetricKpiComponentEditor`.

Runtime fetch: `metricValue.read` or `{sourceModel}.read`. Builder: `entityUiOverride.update` + `metricDefinition.read` (save layout via `ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS`).

### Runtime wiring

- `EntityPage` renders `EntityViewMetricsStrip` when `metricStripHasContent(metricRowLayout)`; passes `listFilters` and `routeParams` as binding context.
- `metric-widget` slots resolve widget inner layouts; `metric-kpi` components use `createEntityLayoutRenderContext`.

### Permission gating

`useCanReadMetricValues(sourceModel)` on runtime slots; builder uses `entityUiOverride.update`. Forbidden copy in `metrics.widget.forbidden`.

### Testing

- `metric-binding-resolution.test.ts` — binding source resolution
- `MetricValueDisplay.test.tsx` — loading, value, forbidden (mocked hooks)
- `packages/ui-builder-core` layout mutations / schema — `metric-kpi` component round-trip in layout JSON

Manual: Settings → Metrics (ACTIVE) → Design layout → Metrics row → add `metric-kpi` slot with static bindings → list page shows value after source CRUD (+ backfill if needed).

## Implementation reference

| Area | Location |
| --- | --- |
| Key + validation | `packages/metrics-engine` |
| Read routes | `apps/api/src/aggregation/register-metric-read-routes.ts` |
| Repository batch get | `packages/firestore-converters` / `packages/gcp-firebase` |
| Write path (ownerId) | `packages/aggregation-engine/src/delta.ts` |
