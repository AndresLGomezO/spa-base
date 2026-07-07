# Entity query definition JSON specification

This document is the **authoritative reference for Query Builder JSON** used by Settings → Query Builder. It is intended for data teams and implementers who author saved entity query definitions outside the UI and import them via **View JSON** / **Import JSON**.

**Validation (source of truth in code):**

- Envelopes and import helpers: [`packages/entity-queries/src/entity-query-definition-json.ts`](../packages/entity-queries/src/entity-query-definition-json.ts)
- Query schemas: [`packages/entity-queries/src/types.ts`](../packages/entity-queries/src/types.ts)

**Related docs (different concerns):**

| Document | Purpose |
|----------|---------|
| [query-engine-guide.md](./query-engine-guide.md) | Runtime list `?query=` JSON, filter tree shape, RBAC |
| [entity-definition-json.md](./entity-definition-json.md) | Entity catalog JSON — queries reference `sourceEntity` names |
| [metric-definition-json.md](./metric-definition-json.md) | Metrics JSON — optional `sourceQueryDefinitionId` references queries from this catalog |
| Tenant bundle (`entityQueryDefinitions[]`) | Admin-only full records — not the portable envelope format below |

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [Where to import in the UI](#2-where-to-import-in-the-ui)
3. [Envelope format](#3-envelope-format)
4. [Single query (`kind: "entity-query-definition"`)](#4-single-query-kind-entity-query-definition)
5. [Queries catalog (`kind: "entity-query-definitions-catalog"`)](#5-queries-catalog-kind-entity-query-definitions-catalog)
6. [Portable field reference](#6-portable-field-reference)
7. [Filter tree shape](#7-filter-tree-shape)
8. [Validation rules](#8-validation-rules)
9. [Catalog replace semantics](#9-catalog-replace-semantics)
10. [API](#10-api)
11. [Checklist before import](#11-checklist-before-import)

---

## 1. Quick start

1. Ensure **source entities exist** in the tenant (import entity catalog first if needed).
2. Author a **`entity-query-definitions-catalog`** JSON file with all saved queries for the tenant.
3. In the app: **Settings → Query Builder → Import JSON** (list header) → paste or upload → confirm replace.
4. Wire `query-viewer` widgets in Design layout separately.

**Do not include in portable JSON** (server-managed):

- `id`, `tenantId`, `queryId`, `createdAt`, `updatedAt`

Use **View JSON** on the list panel to export a valid template.

---

## 2. Where to import in the UI

| Surface | Context | Envelope `kind` | Apply behavior |
|---------|---------|-----------------|----------------|
| **Query settings panel** | Selected query toolbar | `entity-query-definition` | Fills the draft only; **Save** to persist |
| **Queries list** | Query Builder list header | `entity-query-definitions-catalog` | **Replaces** full tenant catalog (destructive) |

**Permissions:**

| Action | Permission |
|--------|------------|
| View JSON | `entityQueryDefinition.read` |
| Import single query settings | `entityQueryDefinition.update` |
| Import catalog | `entityQueryDefinition.create`, `entityQueryDefinition.update`, and `entityQueryDefinition.delete` |

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
| `entity-query-definition` | `1` | One saved query (settings editor) |
| `entity-query-definitions-catalog` | `1` | Full tenant query set |

---

## 4. Single query (`kind: "entity-query-definition"`)

```json
{
  "kind": "entity-query-definition",
  "version": 1,
  "data": {
    "name": "Upcoming payments",
    "sourceEntity": "transaction",
    "filter": {
      "type": "group",
      "combinator": "and",
      "children": [
        {
          "type": "condition",
          "field": "type",
          "operator": "==",
          "value": { "type": "static", "value": "EXPENSE" }
        }
      ]
    },
    "sort": [{ "field": "date", "direction": "desc" }],
    "limitMode": "topN",
    "limit": 20,
    "status": "ACTIVE"
  }
}
```

**Edit mode:** `data.name` and `data.sourceEntity` must match the query being edited.

---

## 5. Queries catalog (`kind: "entity-query-definitions-catalog"`)

```json
{
  "kind": "entity-query-definitions-catalog",
  "version": 1,
  "exportedAt": "2026-07-01T12:00:00.000Z",
  "entityQueryDefinitions": [
    {
      "name": "Upcoming payments",
      "sourceEntity": "transaction",
      "filter": {
        "type": "group",
        "combinator": "and",
        "children": []
      },
      "sort": [],
      "limitMode": "topN",
      "limit": 20,
      "status": "ACTIVE"
    }
  ]
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `kind` | yes | `"entity-query-definitions-catalog"` |
| `version` | yes | `1` |
| `exportedAt` | yes | ISO datetime (informational) |
| `entityQueryDefinitions` | yes | At least one portable query (same shape as §4 `data`) |

Each item matches **`createEntityQueryDefinitionInput`** — the same shape as `POST /api/entity-query-definitions`.

---

## 6. Portable field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Match key for catalog replace |
| `description` | string | no | |
| `sourceEntity` | string | yes | Entity **name**; immutable after create |
| `queryMode` | `"records"` \| `"aggregated"` | no | Default `"records"`. Aggregated mode returns grouped rows instead of entity records. |
| `parameters` | array | no | Declared runtime parameters (default `[]`) |
| `filter` | filter tree root | yes | Nested `group` / `condition` nodes (not legacy flat `filters[]`) |
| `sort` | array | no | Record sort `{ field, direction: "asc" \| "desc" }[]`. Not allowed when `queryMode` is `"aggregated"`. |
| `select` | string[] | no | Omit or empty for all fields |
| `groupBy` | string[] | no | Group key fields when `queryMode` is `"aggregated"` |
| `aggregations` | array | no | `{ operation: "SUM" \| "COUNT" \| "AVG", field? }[]` when aggregated |
| `groupSort` | array | no | Sort aggregated groups by group key or aggregation alias (e.g. `sum_amount`) |
| `groupLimit` | integer | no | Max groups after aggregation (1–100) |
| `limitMode` | `"topN"` \| `"all"` | no | Default `"topN"`. Aggregated queries require `"all"`. |
| `limit` | integer | no | Required when `limitMode` is `"topN"` (1–100) |
| `status` | `"ACTIVE"` \| `"PAUSED"` | no | Default `"ACTIVE"` |

---

## 7. Filter tree shape

Conditions use typed values:

```json
{ "type": "static", "value": "EXPENSE" }
```

```json
{ "type": "temporal", "preset": "startOfMonth" }
```

Parameter references (require a matching entry in `parameters[]`):

```json
{ "type": "parameter", "name": "period", "bound": "start" }
```

Parameter declaration example:

```json
"parameters": [
  { "name": "period", "valueType": "dateBucket", "granularity": "month", "field": "date" }
]
```

At runtime, `query-viewer` and metric components bind parameter values via `parameterBindings` / `queryParameterBindings` using the same `MetricBindingSource` shapes as metric dimensions. During aggregation, query-backed metrics resolve parameters from each source record’s field values.

Supported temporal presets: `today`, `startOfDay`, `endOfDay`, `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear`. Week presets use ISO weeks (Monday start, UTC).

`dateBucket` parameter bounds: `start`, `end`, `endToDate`, `value`. Use `endToDate` for month-to-date windows (current month caps at today UTC; past months use the full bucket end).

Groups nest with `combinator`: `"and"` or `"or"`. Depth and OR-branch limits are enforced by `refineEntityQueryDefinitionBody` in the shared package.

---

## 7.1 Aggregated query mode

Set `"queryMode": "aggregated"` to return **group rows** instead of entity records. Filters still narrow the source population; aggregation runs in memory after fetch.

Requirements:

- `limitMode` must be `"all"`
- At least one `groupBy` field and one `aggregations` entry
- Use `groupSort` / `groupLimit` instead of record `sort` / `limit`
- Aggregated queries **cannot** be used as metric `sourceQueryDefinitionId`

Aggregation output keys follow metric naming: `sum_amount`, `count`, `avg_amount`, etc.

Example (parameterized top category by amount):

```json
{
  "name": "Top outflow category (period)",
  "sourceEntity": "transaction",
  "queryMode": "aggregated",
  "parameters": [
    { "name": "period", "valueType": "dateBucket", "granularity": "month", "field": "date" }
  ],
  "filter": {
    "type": "group",
    "combinator": "and",
    "children": [
      {
        "field": "date",
        "operator": ">=",
        "value": { "type": "parameter", "name": "period", "bound": "start" }
      },
      {
        "field": "date",
        "operator": "<=",
        "value": { "type": "parameter", "name": "period", "bound": "end" }
      }
    ]
  },
  "groupBy": ["categoryId"],
  "aggregations": [{ "operation": "SUM", "field": "amount" }],
  "groupSort": [{ "field": "sum_amount", "direction": "desc" }],
  "groupLimit": 1,
  "limitMode": "all",
  "status": "ACTIVE"
}
```

Bind `parameterBindings.period` to `dashboardDateFilter` (or other sources) in `query-viewer` widgets at layout time.

---

## 8. Validation rules

### Catalog-level (client + API)

| Rule | Error if violated |
|------|-------------------|
| Unique query `name` values | yes |
| Each item passes `createEntityQueryDefinitionInputSchema` | yes |
| `sourceEntity` exists in tenant entity catalog | yes (API) |

### Distinction from other JSON

| Format | Contains | Use |
|--------|----------|-----|
| **Query catalog** (this doc) | Portable create inputs | Settings → Query Builder handoff |
| **Tenant bundle** | Full `EntityQueryDefinitionRecord[]` with ids | Admin tenant export/import |
| **Runtime `?query=`** | Ephemeral `QueryConfig` | List API requests — not saved definitions |

---

## 9. Catalog replace semantics

**Import catalog** performs a **full replace** of the tenant's saved query definitions:

| Step | Match key | Behavior |
|------|-----------|----------|
| `entityQueryDefinitions` | `name` | Existing → **update** (same doc `id` preserved), new → **create**, missing → **delete** |

**No auto-backfill:** queries are configuration-only; replace is synchronous.

**Limitations:**

- UI layout bindings (`entityQueryDefinitionId` in `query-viewer` widgets) are **not** auto-cleaned when queries are removed.
- Metrics referencing a query via `sourceQueryDefinitionId` **block** single delete and catalog-replace deletion of that query until metrics are removed or repointed.

---

## 10. API

| Method | Path | Body |
|--------|------|------|
| `PUT` | `/api/entity-query-definitions/catalog` | Full `entity-query-definitions-catalog` envelope |

Response:

```json
{
  "data": {
    "counts": { "created": 0, "updated": 1, "deleted": 0 },
    "items": [ "...EntityQueryDefinitionRecord[]" ]
  }
}
```

---

## 11. Checklist before import

- [ ] Source entities exist (`sourceEntity` matches entity `name`)
- [ ] All queries in one `entity-query-definitions-catalog` file
- [ ] Unique query `name` values
- [ ] Filter tree uses `filter` (not legacy flat arrays)
- [ ] `sourceEntity` is correct — it cannot be changed after create
- [ ] Caller has create + update + delete permissions for catalog import

---

## 12. Rates tenant example catalog

For the **Rates dev tenant** (monthly payment control, cashflow, net worth), use [rates-data-model.md](./rates-data-model.md) as the domain blueprint. A ready-to-import catalog is available at [`apps/api/src/admin/rates-tenant/catalogs/rates-query-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-query-definitions.json) (35 saved queries across `paymentSchedule`, `financialItem`, `transaction`, `account`, and `balanceSnapshot`).

**Import order for a new tenant (or manual re-import):**

1. [`rates-entity-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-entity-definitions.json) — Settings → Model Builder → Import JSON
2. [`rates-metric-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-metric-definitions.json) — Settings → Metrics → Import JSON
3. [`rates-query-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-query-definitions.json) — Settings → Query Builder → Import JSON

On local dev, run **`pnpm seed:database`** after the API and emulators are up to import catalogs into the `rates` tenant (not automatic on API startup).

Query groups cover sheet replacement (upcoming/overdue payments, active commitments), nature splits (`flowKind`, `balanceSheetRole`, `itemType`), category and actor filters (`category.kind`, `actor.type`), transaction drill-downs for the current month, and enrichment lists (accounts by balance, balance snapshots).

Wire `query-viewer` widgets in Design layout separately after import.
