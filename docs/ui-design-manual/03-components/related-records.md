# Component: related-records

## Purpose

**When to use:** Child entity list on a record detail view, filtered by foreign key.

**When not to use:** Main entity list — use `page-list`. Arbitrary query lists — use `query-viewer`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | Yes |
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

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `childEntity` | `string` | Yes | Child entity name. | Which entity to list. |
| `foreignKeyField` | `string` | Yes | FK on child pointing to parent. | Parent filter field. |
| `styles` | `StyleRule[]` | No |  | Section framing. |

## Interactions

Read-only or navigable child list (platform default).

## Binding

Implicit — filters `childEntity` where `foreignKeyField` equals parent record `id`.

## Minimal example

```json
{
  "kind": "related-records",
  "childEntity": "Transaction",
  "foreignKeyField": "accountId"
}
```

## Realistic example

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-detail-grid",
      "component": {
        "kind": "grid",
        "gridTemplateColumns": "1fr 1fr",
        "gap": "24px",
        "rows": [
          {
            "type": "component",
            "id": "track-summary",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-name",
                  "component": {
                    "kind": "text",
                    "primary": {
                      "type": "field",
                      "path": "name"
                    },
                    "label": {
                      "show": true
                    }
                  }
                },
                {
                  "type": "component",
                  "id": "row-balance",
                  "component": {
                    "kind": "numeric",
                    "primary": {
                      "type": "field",
                      "path": "balance"
                    },
                    "displayFormat": "currency"
                  }
                }
              ]
            }
          },
          {
            "type": "component",
            "id": "track-related",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-transactions",
                  "component": {
                    "kind": "related-records",
                    "childEntity": "Transaction",
                    "foreignKeyField": "accountId",
                    "styles": [
                      {
                        "property": "marginTop",
                        "value": "16"
                      }
                    ]
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

- Using on surfaces other than `recordDetail`.
- Wrong `foreignKeyField` — must exist on the child entity.
- Empty `childEntity` name.
