# Metric definition JSON specification

This document is the **authoritative reference for Metrics JSON** used by Settings → Metrics. It is intended for data teams and implementers who author metric definitions outside the UI and import them via **View JSON** / **Import JSON**.

**Validation (source of truth in code):**

- Envelopes and import helpers: [`packages/metrics-engine/src/metric-definition-json.ts`](../../packages/metrics-engine/src/metric-definition-json.ts)
- Metric schemas: [`packages/metrics-engine/src/types.ts`](../../packages/metrics-engine/src/types.ts)

**Related docs (different concerns):**

| Document | Purpose |
|----------|---------|
Local tenant catalogs (optional, outside the monorepo) live under `.local/tenant-import/catalogs/` when present — see that folder's README.

| [metrics-consumption.md](../guides/metrics-consumption.md) | Reading pre-aggregated metric rows at runtime |
| aggregations.md | Event pipeline, contributions, backfill internals |
| [entity-definition-json.md](./entity-definition.md) | Entity catalog JSON — metrics reference `sourceModel` entity names |
| [entity-query-definition-json.md](./entity-query-definition.md) | Query catalog JSON — optional `sourceQueryDefinitionId` on metrics |
| Tenant bundle (`metricDefinitions[]`) | Admin-only full records — not the portable envelope format below |

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [Where to import in the UI](#2-where-to-import-in-the-ui)
3. [Envelope format](#3-envelope-format)
4. [Single metric (`kind: "metric-definition"`)](#4-single-metric-kind-metric-definition)
5. [Metrics catalog (`kind: "metric-definitions-catalog"`)](#5-metrics-catalog-kind-metric-definitions-catalog)
6. [Portable field reference](#6-portable-field-reference)
7. [Validation rules](#7-validation-rules)
8. [Catalog replace and auto-backfill](#8-catalog-replace-and-auto-backfill)
9. [API](#9-api)
10. [Checklist before import](#10-checklist-before-import)

---

## 1. Quick start

1. Ensure **source entities exist** in the tenant (import entity catalog first if needed).
2. Author a **`metric-definitions-catalog`** JSON file with all metrics for the tenant.
3. In the app: **Settings → Metrics → Import JSON** → paste or upload → confirm replace.
4. Backfill runs automatically for created and materially updated metrics.
Local tenant catalogs (optional, outside the monorepo) live under `.local/tenant-import/catalogs/` when present — see that folder's README.

**Do not include in portable JSON** (server-managed):

- `id`, `tenantId`, `metricId`, `target`, `createdAt`, `updatedAt`

Use **View JSON** on the list page to export a valid template.

---

## 2. Where to import in the UI

| Surface | Context | Envelope `kind` | Apply behavior |
|---------|---------|-----------------|----------------|
| **Create / edit metric** | Metric modal | `metric-definition` | Fills the form only; **Save** to persist |
| **Metrics list** | Settings → Metrics header | `metric-definitions-catalog` | **Replaces** full tenant catalog (destructive) |

**Permissions:**

| Action | Permission |
|--------|------------|
| View JSON | `metricDefinition.read` |
| Import single metric form | `metricDefinition.create` or `metricDefinition.update` |
| Import catalog | `metricDefinition.create`, `metricDefinition.update`, and `metricDefinition.backfill` |

---

## 3. Envelope format

Every import file is a **versioned envelope** with a `kind` discriminator:

```json
{
  "kind": "<envelope-kind>",
  "version": 1,
  "...": "kind-specific payload"
}
```

| `kind` | `version` | Purpose |
|--------|-----------|---------|
| `metric-definition` | `1` | One metric (editor form) |
| `metric-definitions-catalog` | `1` | Full tenant metric set |

---

## 4. Single metric (`kind: "metric-definition"`)

```json
{
  "kind": "metric-definition",
  "version": 1,
  "data": {
    "name": "Total principal",
    "sourceModel": "loan",
    "aggregations": [{ "operation": "SUM", "field": "principal" }],
    "filters": [],
    "groupBy": [],
    "dimensions": [],
    "dateFieldGranularity": {},
    "valueDisplayFormat": "currency",
    "version": 1,
    "schemaVersionDependency": 0,
    "fieldsDependency": ["principal"],
    "status": "ACTIVE"
  }
}
```

**Edit mode:** `data.name` must match the metric being edited.

---

## 5. Metrics catalog (`kind: "metric-definitions-catalog"`)

```json
{
  "kind": "metric-definitions-catalog",
  "version": 1,
  "exportedAt": "2026-07-01T12:00:00.000Z",
  "metricDefinitions": [
    {
      "name": "Total principal",
      "sourceModel": "loan",
      "aggregations": [{ "operation": "SUM", "field": "principal" }],
      "fieldsDependency": ["principal"],
      "schemaVersionDependency": 0,
      "status": "ACTIVE"
    },
    {
      "name": "Loan count",
      "sourceModel": "loan",
      "aggregations": [{ "operation": "COUNT" }],
      "fieldsDependency": [],
      "schemaVersionDependency": 0,
      "status": "ACTIVE"
    }
  ]
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `kind` | yes | `"metric-definitions-catalog"` |
| `version` | yes | `1` |
| `exportedAt` | yes | ISO datetime (informational) |
| `metricDefinitions` | yes | At least one portable metric (same shape as §4 `data`) |

Each item matches **`createMetricDefinitionInput`** — the same shape as `POST /api/metric-definitions`.

---

## 6. Portable field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Match key for catalog replace |
| `description` | string | no | |
| `sourceModel` | string | yes | Entity **name** (e.g. `"loan"`) |
| `sourceQueryDefinitionId` | string | no | When set, metric population is scoped to this saved custom query (`limitMode: "all"`, `ACTIVE`). `sourceModel` must match the query's `sourceEntity`. |
| `filters` | array | no | Default `[]`. Omit or use `[]` for query-backed metrics (query filter defines population). |
| `groupBy` | string[] | no | Default `[]` |
| `dimensions` | string[] | no | Default `[]` |
| `dateFieldGranularity` | record | no | Keys must be in `groupBy` ∪ `dimensions` |
| `valueDisplayFormat` | `"number"` \| `"currency"` \| `"percent"` | no | Default `"number"`. Use `"percent"` for computed MoM metrics (server returns decimal ratio). |
| `computationMode` | `"aggregated"` \| `"computed"` | no | Default `"aggregated"`. Computed metrics are evaluated on read via `/evaluate`. |
| `parameters` | array | no | Required when `computationMode` is `"computed"`. Metric input parameters with optional `deriveFrom` shifts. |
| `computation` | object | no | Required when `computationMode` is `"computed"`. Formula spec (`percentChange`, `difference`, `ratio`, `expression`) with `metricRef` / `queryRef` inputs. |
| `aggregations` | array | yes | Min 1; `SUM`/`AVG` need `field`; `COUNT` may omit `field` |
| `version` | integer | no | Default `1` on create |
| `schemaVersionDependency` | integer | yes | Entity schema version tracked |
| `fieldsDependency` | string[] | no | Must satisfy aggregation rules (see types refine) |
| `status` | `"ACTIVE"` \| `"PAUSED"` | no | Default `"ACTIVE"` |

### Computed metrics (`computationMode: "computed"`)

Computed metrics do **not** maintain incremental Firestore rows. They declare input parameters and a server-side formula evaluated at read time.

```json
{
  "name": "Income MoM %",
  "computationMode": "computed",
  "sourceModel": "transaction",
  "valueDisplayFormat": "percent",
  "parameters": [
    { "name": "currentPeriod", "valueType": "dateBucket", "granularity": "month" },
    {
      "name": "comparisonPeriod",
      "valueType": "dateBucket",
      "granularity": "month",
      "deriveFrom": {
        "parameter": "currentPeriod",
        "shift": { "unit": "month", "offset": -1 }
      }
    }
  ],
  "computation": {
    "type": "percentChange",
    "current": {
      "type": "metricRef",
      "metricDefinitionId": "Income by Month",
      "parameterMap": { "date": "currentPeriod" }
    },
    "baseline": {
      "type": "metricRef",
      "metricDefinitionId": "Income by Month",
      "parameterMap": { "date": "comparisonPeriod" }
    }
  },
  "aggregations": [{ "operation": "COUNT" }],
  "filters": [],
  "groupBy": [],
  "dimensions": [],
  "dateFieldGranularity": {},
  "schemaVersionDependency": 0,
  "fieldsDependency": [],
  "status": "ACTIVE"
}
```

Input refs:

| Type | Purpose |
|------|---------|
| `metricRef` | Read a pre-aggregated metric row after mapping parameters to `group`/`dimensions`. |
| `queryRef` | Execute a parameterized entity query on read and aggregate a field (`SUM`/`COUNT`/`AVG`). |

Computation types: `percentChange`, `difference`, `ratio`, `expression`.

---

## 7. Validation rules

### Catalog-level (client + API)

| Rule | Error if violated |
|------|-------------------|
| Unique metric `name` values | yes |
| Each item passes `createMetricDefinitionInputSchema` | yes |
| `sourceModel` exists in tenant entity catalog | yes (API) |
| `sourceQueryDefinitionId` references an ACTIVE query with `limitMode: "all"` and matching `sourceEntity` | yes (API) |
| Custom queries referenced by metrics cannot be deleted (single delete or catalog replace) | yes (API) |
| Date fields in `groupBy`/`dimensions` have `dateFieldGranularity` | yes (API) |

### Distinction from other JSON

| Format | Contains | Use |
|--------|----------|-----|
| **Metric catalog** (this doc) | Portable create inputs | Settings → Metrics handoff |
| **Tenant bundle** | Full `MetricDefinitionRecord[]` with ids | Admin tenant export/import |
| **Design layout slice** | `metricWidgets`, `metricRowLayout` | KPI wiring only — not definitions |

---

## 8. Catalog replace and auto-backfill

**Import catalog** performs a **full replace** of the tenant's metric definitions:

| Step | Match key | Behavior |
|------|-----------|----------|
| `metricDefinitions` | `name` | Existing → **update** (same doc `id` preserved), new → **create**, missing → **delete** |

After replace:

- **Created metrics:** initial backfill from source documents (skipped for `computationMode: "computed"`)
- **Updated metrics:** backfill when aggregation-relevant fields change; version auto-bumps if import version ≤ current
- **Unchanged updates:** backfill skipped

**Limitations:**

- Pre-aggregated rows and UI layout bindings (`metricDefinitionId` in entity UI overrides) are **not** auto-cleaned when metrics are removed.
- Backfill requires `listSourceDocuments` to be configured and may take time on large tenants.

---

## 9. API

| Method | Path | Body |
|--------|------|------|
| `PUT` | `/api/metric-definitions/catalog` | Full `metric-definitions-catalog` envelope |
| `POST` | `/api/metrics/:metricDefinitionId/evaluate` | `{ "parameters": { "currentPeriod": "2026-06" } }` — computed metrics only |

Response:

```json
{
  "data": {
    "counts": { "created": 0, "updated": 1, "deleted": 0 },
    "backfillSummary": { "created": 0, "updated": 1, "skipped": 0, "failed": 0 },
    "items": [ "...MetricDefinitionRecord[]" ]
  }
}
```

---

## 10. Checklist before import

- [ ] Source entities exist (`sourceModel` matches entity `name`)
- [ ] All metrics in one `metric-definitions-catalog` file
- [ ] Unique metric `name` values
- [ ] `fieldsDependency` valid for chosen aggregations
- [ ] Date granularity set for date fields in `groupBy` / `dimensions`
- [ ] Caller has `metricDefinition.backfill` for catalog import

---

## 11. Rates tenant example catalog

Local tenant catalogs (optional, outside the monorepo) live under `.local/tenant-import/catalogs/` when present — see that folder's README.

