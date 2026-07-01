# Custom view definition JSON specification

This document is the **authoritative reference for Custom Views JSON** used by Settings → Custom Views. It covers whole-view portable definitions and per-surface design layout slices.

**Validation (source of truth in code):**

- Whole-view envelopes: [`packages/custom-views/src/custom-view-definition-json.ts`](../packages/custom-views/src/custom-view-definition-json.ts)
- View schemas: [`packages/custom-views/src/types.ts`](../packages/custom-views/src/types.ts)
- Design layout slices: [`packages/entities/src/ui/design-layout-slice-schema.ts`](../packages/entities/src/ui/design-layout-slice-schema.ts)

**Related docs (different concerns):**

| Document | Purpose |
|----------|---------|
| [entity-query-definition-json.md](./entity-query-definition-json.md) | Saved queries referenced by `entityQueryDefinitionName` |
| [entity-definition-json.md](./entity-definition-json.md) | Entity catalog — custom views inherit `sourceEntity` from queries |
| Tenant bundle (`customViews[]`) | Admin-only full records with Firestore ids — not the portable envelope format below |

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [Where to import in the UI](#2-where-to-import-in-the-ui)
3. [Whole view envelopes](#3-whole-view-envelopes)
4. [Portable field reference](#4-portable-field-reference)
5. [Catalog replace semantics](#5-catalog-replace-semantics)
6. [Independent design layout slices](#6-independent-design-layout-slices)
7. [API](#7-api)
8. [Checklist before import](#8-checklist-before-import)

---

## 1. Quick start

1. Ensure **entities** and **saved queries** exist in the tenant.
2. Author a **`custom-views-catalog`** JSON file with all custom views for the tenant.
3. In the app: **Settings → Custom Views → Import JSON** → paste or upload → confirm replace.
4. For layout-only changes, use **Design layout** slice import (see §6).

**Do not include in portable JSON** (server-managed):

- `id`, `tenantId`, `sourceEntity`, `createdAt`, `updatedAt`

Use **View JSON** on the settings page to export a valid template.

---

## 2. Where to import in the UI

| Surface | Context | Envelope `kind` | Apply behavior |
|---------|---------|-----------------|----------------|
| **Create / edit modal** | Settings → Custom Views | `custom-view-definition` | Create: fills form (+ optional `ui` on save); Edit: applies immediately |
| **List header** | Settings → Custom Views | `custom-views-catalog` | **Replaces** full tenant catalog (destructive) |
| **Design layout designers** | Main / List / Metrics for a custom view | `design-layout-slice` | Fills designer draft; **Save** in designer persists |

**Permissions:**

| Action | Permission |
|--------|------------|
| View JSON | `customView.read` |
| Import single view (create) | `customView.create` |
| Import single view (edit) | `customView.update` |
| Import catalog | `customView.create`, `customView.update`, and `customView.delete` |

---

## 3. Whole view envelopes

### Single view (`kind: "custom-view-definition"`)

```json
{
  "kind": "custom-view-definition",
  "version": 1,
  "data": {
    "name": "Upcoming payments",
    "viewId": "upcoming-payments",
    "entityQueryDefinitionName": "Upcoming payments",
    "nav": { "label": "Payments", "icon": "calendar" },
    "status": "ACTIVE",
    "ui": {
      "views": [{ "type": "table", "name": "default", "fields": ["type", "date"] }],
      "listViewType": "table"
    }
  }
}
```

**Edit mode:** `data.viewId` and `data.entityQueryDefinitionName` must match the view being edited.

### Catalog (`kind: "custom-views-catalog"`)

```json
{
  "kind": "custom-views-catalog",
  "version": 1,
  "exportedAt": "2026-07-01T12:00:00.000Z",
  "customViews": [ /* portable items */ ]
}
```

---

## 4. Portable field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Display name |
| `viewId` | string | yes | URL slug; catalog match key; immutable after create |
| `description` | string | no | |
| `entityQueryDefinitionName` | string | yes | Saved query **name** (resolved to Firestore id at import) |
| `nav` | object | yes | `{ label, icon? }` sidebar entry |
| `status` | `"ACTIVE"` \| `"PAUSED"` | no | Default `"ACTIVE"` |
| `hiddenFromNav` | boolean | no | |
| `navCategoryId` | string | no | Must exist in tenant categories |
| `navOrder` | integer | no | |
| `ui` | object | no | Full `CustomViewUIConfig`; default UI built server-side if omitted on create |

---

## 5. Catalog replace semantics

**Import catalog** performs a **full replace** of the tenant's custom views:

| Step | Match key | Behavior |
|------|-----------|----------|
| `customViews` | `viewId` | Existing → **update** (same doc `id` preserved), new → **create**, missing → **delete** |

**No auto-cleanup** of sidebar nav or design-layout links when views are removed.

**Import order:** entity catalog → query catalog → custom views catalog.

---

## 6. Independent design layout slices

Custom views reuse the same slice envelopes as entity design layout. Each surface has its own `design-layout-slice` JSON:

| Surface | `surface` value | Designer route |
|---------|-----------------|----------------|
| Main page | `mainPage` | Settings → Custom Views → Design layout → Main |
| List | `list` | … → List |
| Metrics row | `metricsRowDesigner` | … → Metrics |

Example (`kind: "design-layout-slice"`):

```json
{
  "kind": "design-layout-slice",
  "version": 1,
  "surface": "mainPage",
  "data": {
    "mainPage": { "type": "container", "children": [] }
  }
}
```

**UI:** Open the designer → header settings (gear) → **View JSON** / **Import JSON**.

Slice import updates the designer draft only; click **Save** in the designer to persist to `customView.ui`.

Schema helpers: `createDesignLayoutSliceEnvelope`, `parseDesignLayoutSliceJson`, `validateDesignLayoutSlice` in `@repo/entities`.

---

## 7. API

| Method | Path | Body |
|--------|------|------|
| `PUT` | `/api/custom-views/catalog` | Full `custom-views-catalog` envelope |

Response:

```json
{
  "data": {
    "counts": { "created": 0, "updated": 1, "deleted": 0 },
    "items": [ "...CustomViewRecord[]" ]
  }
}
```

---

## 8. Checklist before import

- [ ] Source entities exist (via saved queries)
- [ ] Referenced query definitions exist and are `ACTIVE`
- [ ] Unique `viewId` values in catalog file
- [ ] `navCategoryId` values exist when specified
- [ ] `viewId` and `entityQueryDefinitionName` are correct — they cannot change on single-view edit import
- [ ] Caller has create + update + delete permissions for catalog import

---

## 9. Rates tenant example catalog

For the **Rates dev tenant**, use [rates-data-model.md](./rates-data-model.md) for nav strategy (which entities are hidden and which queries become sidebar views). The catalog is at [`apps/api/src/admin/rates-tenant/catalogs/rates-custom-views.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-custom-views.json) (21 views).

**Import order for a new tenant:**

1. [`rates-entity-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-entity-definitions.json) — entities (includes `hiddenFromNav` on extension and query-driven entities)
2. [`rates-metric-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-metric-definitions.json) — metrics
3. [`rates-query-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-query-definitions.json) — saved queries
4. [`rates-custom-views.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-custom-views.json) — custom views

On local dev, run **`pnpm seed:database`** after the API and emulators are up to import all four catalogs into the `rates` tenant.

Primary entry points: `monthly-control` (commitments sheet), `upcoming-payments` (cashflow), `accounts-by-balance` (accounts). Omit `ui` in the catalog — the server builds default table layouts from the source entity.
