# Entity UI overrides

Entity UI layouts persist on the **`entity_ui_overrides`** collection — one document per entity per tenant. The API and designers work with domain keys; Firestore stores layout documents as JSON string fields.

---

## Document identity

| Field | Type | Description |
|-------|------|-------------|
| `entityName` | string | Entity identifier (document key) |
| `updatedAt` | ISO datetime | Last modification timestamp |

---

## Domain keys

These are the keys used in API payloads, designer state, and `design-layout-slice` import/export.

### List presentation

| Key | Type | Surface | Description |
|-----|------|---------|-------------|
| `views` | `ViewConfig[]` | — | View definitions (required, min 1) |
| `listViewType` | enum | List | `table` \| `card` \| `expandableTable` \| `compact` |
| `listItem` | `UiLayoutDocument` | `listItem` | Card item layout (`listViewType: "card"`) |

#### View config sub-keys

| View type | Key | Description |
|-----------|-----|-------------|
| `table` | `fields` | Column field path strings |
| `table` | `showActions` | Row actions column visibility |
| `card` | `layout` | Alias for `listItem` at view level |
| `expandableTable` | `columns[]` | Grouped columns with `id`, `label`, `cellLayout`, optional `displayFrom`/`displayTo` |
| `expandableTable` | `rowExpandLayout` | Expanded row panel layout |
| `expandableTable` | `showActions` | Row actions column visibility |

### Page layouts

| Key | Type | Surface | Description |
|-----|------|---------|-------------|
| `mainPage` | `UiLayoutDocument` | `mainPage` | Main entity page slot layout |
| `recordDetail` | `UiLayoutDocument` | `recordDetail` | Record detail panel layout |
| `detail` | `UiLayoutDocument` | — | **Deprecated.** Read-only alias for `recordDetail` |

### Forms

| Key | Type | Surface | Description |
|-----|------|---------|-------------|
| `forms.presentation` | enum | Forms | `plain` \| `wizard` |
| `forms.layout` | `UiLayoutDocument` | `formPlain` | Plain form body |
| `forms.wizard` | object | `formWizardShell` | `{ shellLayout, steps[] }` |
| `forms.wizard.shellLayout` | `UiLayoutDocument` | `formWizardShell` | Wizard chrome |
| `forms.wizard.steps[].layout` | `UiLayoutDocument` | `formWizardStep` | Per-step body |
| `forms.modalSize` | enum | — | `sm` \| `md` \| `lg` \| `xl` \| `2xl` |
| `forms.modalSizeByBreakpoint` | object | — | Per-breakpoint modal sizes |
| `forms.modalChrome` | object | — | `{ showHeader?, contentPadding? }` |
| `forms.modalFooterLayout` | `UiLayoutDocument` | `formModalFooter` | Modal footer region |

### Named form designs

| Key | Type | Description |
|-----|------|-------------|
| `formDesigns[]` | `FormDesignDefinition[]` | Named form variants (same shape as `forms` per entry) |
| `entityPageCreateFormDesignId` | string | Form design used by entity page create action |
| `entityPageEditFormDesignId` | string | Form design used by entity page edit action |

### Metrics

| Key | Type | Surface | Description |
|-----|------|---------|-------------|
| `metricWidgets` | `MetricWidgetDefinition[]` | `metricWidget` | Reusable widgets: `{ id, name, layout }` |
| `metricRowLayout` | `UiLayoutDocument` | `metricRow` | Metrics row grid above list |

---

## Firestore persistence mapping

Layout documents serialize to `*Json` string fields:

| Domain key | Firestore field |
|------------|-----------------|
| `views` | `viewsJson` |
| `listItem` | `listItemLayoutJson` |
| `mainPage` | `mainPageLayoutJson` |
| `recordDetail` | `recordDetailLayoutJson` |
| `metricWidgets` | `metricWidgetsJson` |
| `metricRowLayout` | `metricRowLayoutJson` |
| `forms` | `formsJson` |
| `formDesigns` | `formDesignsJson` |

Scalar fields (`listViewType`, `entityPageCreateFormDesignId`, `entityPageEditFormDesignId`, `updatedAt`) persist directly without JSON encoding.

---

## Envelope surface mapping

`design-layout-slice` envelopes use coarser surface names that map to multiple domain keys:

| Envelope `surface` | Domain keys written |
|--------------------|---------------------|
| `list` | `listViewType`, `views`, `listItem` |
| `forms` | `forms`, `formDesigns[]` (when `formDesignId` set) |
| `mainPage` | `mainPage` |
| `recordDetail` | `recordDetail` |
| `metricsRowDesigner` | `metricWidgets`, `metricRowLayout` |

---

## Minimal persisted document

```json
{
  "entityName": "Account",
  "updatedAt": "2026-07-04T12:00:00.000Z",
  "viewsJson": "[{\"name\":\"default\",\"type\":\"table\",\"fields\":[\"name\",\"status\"],\"showActions\":true}]",
  "listViewType": "table",
  "mainPageLayoutJson": "{ \"root\": { ... } }",
  "metricRowLayoutJson": "{ \"root\": { ... } }",
  "formsJson": "{ \"presentation\": \"plain\", \"layout\": { ... } }"
}
```

---

## What does not persist here

| Concept | Collection |
|---------|------------|
| Tenant dashboard | `tenant_dashboard_layouts` |
| Tenant layout presets | `ui_builder_presets` |

---

## Related

- [List views](../04-surfaces-and-pages/list-views.md) — list envelope shape
- [Forms](../04-surfaces-and-pages/forms.md) — forms envelope shape
- [Import scopes](./import-scopes.md) — partial layout import
- [Envelope examples](../appendix/envelope-examples.md) — full envelope reference
