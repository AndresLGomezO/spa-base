# Component: page-metrics

## Purpose

**When to use:** Slot that renders the entity `metricRowLayout` above the list.

**When not to use:** Inline `metric-kpi` on main page — KPIs belong in the metrics row layout.

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
| `styles` | `StyleRule[]` | No |  | Section margin around metrics row. |

## Interactions

Read-only metrics strip from `metricRowLayout`.

## Binding

None on the slot — metric bindings live in `metricRowLayout` components.

## Minimal example

```json
{
  "kind": "page-metrics"
}
```

## Realistic example

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-toolbar",
      "component": {
        "kind": "page-toolbar"
      }
    },
    {
      "type": "component",
      "id": "row-metrics",
      "component": {
        "kind": "page-metrics",
        "styles": [
          {
            "property": "marginTop",
            "value": "16"
          },
          {
            "property": "marginBottom",
            "value": "16"
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "row-list",
      "component": {
        "kind": "page-list"
      }
    }
  ]
}
```

## Common mistakes

- Adding `metricDefinitionId` on the slot component.
- Omitting `metricRowLayout` configuration — slot renders empty.
- Multiple `page-metrics` slots.
