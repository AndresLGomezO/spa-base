# Component: metric-widget

## Purpose

**When to use:** Embed a reusable metric widget defined on the entity UI config.

**When not to use:** One-off KPIs — use `metric-kpi` directly. Non-metric content.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | No |
| `formEdit` | No |
| `formPlain` | No |
| `formWizardShell` | No |
| `formWizardStep` | No |
| `formModalFooter` | No |
| `metricStrip` | Yes |
| `metricRow` | Yes |
| `metricWidget` | No |
| `dashboardSection` | Yes |
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `entityName` | `string` | Yes | Entity that owns the widget. | Widget namespace. |
| `widgetId` | `string` | Yes | Key in `metricWidgets`. | Which widget to render. |
| `label` | `string` | No |  | Override widget label. |
| `styles` | `StyleRule[]` | No |  | Outer framing. |

## Interactions

Read-only. Widget may contain nested layout.

## Binding

None on the component — bindings live in the widget definition.

## Minimal example

```json
{
  "kind": "metric-widget",
  "entityName": "Account",
  "widgetId": "total-balance-widget"
}
```

## Realistic example

```json
{
  "kind": "metric-widget",
  "entityName": "Account",
  "widgetId": "revenue-summary",
  "label": "Revenue",
  "styles": [
    {
      "property": "marginTop",
      "value": "8"
    }
  ]
}
```

## Common mistakes

- Empty `entityName` or `widgetId`.
- Adding `groupBindings` on the component — configure inside the widget.
- Referencing a widget that does not exist on the entity.
