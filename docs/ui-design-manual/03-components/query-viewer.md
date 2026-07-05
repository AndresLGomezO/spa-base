# Component: query-viewer

## Purpose

**When to use:** Repeat an inner row template for each record from an entity query definition.

**When not to use:** Static content — use `container`/`grid`. Standard list views — use `page-list`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | No |
| `formEdit` | No |
| `formPlain` | No |
| `formWizardShell` | No |
| `formWizardStep` | No |
| `formModalFooter` | No |
| `metricStrip` | No |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | No |
| `dashboardLayout` | No |

> **Note:** Not listed in `componentKindsForSurface` today. Used in metric widget layouts via the designer catalog on `metricWidget` surface. Child template rows bind to the query source entity fields.

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `entityQueryDefinitionId` | `string` | Yes | Must exist in entity query catalog. | Which query to run. |
| `rows` | `RowNode[]` | Yes | Item template rows. | Per-result layout. |
| `stackDirection` | `column` \| `row` | No | Default `column`. | Stack direction for items. |
| `styles` | `StyleRule[]` | No |  | List container styling. |

## Interactions

Read-only list of query results. Template rows render per item.

## Binding

Template children use DataSource with fields from the **query source entity**, not the parent page entity.

## Minimal example

```json
{
  "kind": "query-viewer",
  "entityQueryDefinitionId": "query_active_contracts",
  "rows": []
}
```

## Realistic example

```json
{
  "kind": "query-viewer",
  "entityQueryDefinitionId": "query_recent_transactions",
  "stackDirection": "column",
  "rows": [
    {
      "type": "component",
      "id": "row-item-grid",
      "component": {
        "kind": "grid",
        "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
        "gap": "8px",
        "rows": [
          {
            "type": "component",
            "id": "track-desc",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-desc",
                  "component": {
                    "kind": "text",
                    "primary": {
                      "type": "field",
                      "path": "description"
                    }
                  }
                }
              ]
            }
          },
          {
            "type": "component",
            "id": "track-amount",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-amount",
                  "component": {
                    "kind": "numeric",
                    "primary": {
                      "type": "field",
                      "path": "amount"
                    },
                    "displayFormat": "currency"
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

## Common mistakes

- Empty `entityQueryDefinitionId`.
- Binding template fields to the parent entity instead of the query entity.
- Empty `rows` — nothing renders per result.
- Deleting a query that metrics still reference — API blocks delete when any metric uses `sourceQueryDefinitionId` (layout `query-viewer` refs are not guarded).
