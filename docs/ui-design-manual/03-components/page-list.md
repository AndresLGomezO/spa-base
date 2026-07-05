# Component: page-list

## Purpose

**When to use:** Primary list or table region for the entity main page.

**When not to use:** Duplicate lists. Child entity lists — use `related-records` on detail.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | Yes |
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

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `styles` | `StyleRule[]` | No |  | List region flex and scroll. |

## Interactions

Platform renders list view (table, card, etc.) with sorting and pagination.

## Binding

None — list columns come from list view configuration.

## Minimal example

```json
{
  "kind": "page-list"
}
```

## Realistic example

```json
{
  "kind": "page-list",
  "styles": [
    {
      "property": "flexGrow",
      "value": "1"
    },
    {
      "property": "minHeight",
      "value": "400"
    }
  ]
}
```

## Common mistakes

- Using on detail or form surfaces.
- Multiple `page-list` components on one main page.
- Embedding `text`/`numeric` expecting list cell content.
