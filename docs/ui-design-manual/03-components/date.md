# Component: date

## Purpose

**When to use:** Format and display a date, datetime, or time field.

**When not to use:** Editable date input — use `form-field` on form surfaces.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | Yes |
| `formCreate` | Yes |
| `formEdit` | Yes |
| `formPlain` | Yes |
| `formWizardShell` | Yes |
| `formWizardStep` | Yes |
| `formModalFooter` | Yes |
| `metricStrip` | No |
| `metricRow` | Yes |
| `metricWidget` | Yes |
| `dashboardSection` | No |
| `dashboardLayout` | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `primary` | `DataSource` | Yes | Field or static ISO string. | Date value. |
| `fallbacks` | `DataSource[]` | No |  | Placeholder when missing. |
| `dateDisplayFormat` | `date` \| `datetime` \| `time` | No | Default entity-aware. | Output format. |
| `label` | `LabelConfig` | No |  | Caption. |
| `styles` | `StyleRule[]` | No |  | Typography. |
| `conditionalStyles` | `ConditionalStyleRule[]` | No |  | Value-based styling. |

## Interactions

Read-only display.

## Binding

DataSource (`primary` / `fallbacks`). Common path: `createdAt`, `dueDate`.

## Minimal example

```json
{
  "kind": "date",
  "primary": {
    "type": "field",
    "path": "createdAt"
  }
}
```

## Realistic example

```json
{
  "kind": "date",
  "primary": {
    "type": "field",
    "path": "invoiceDate"
  },
  "fallbacks": [
    {
      "type": "static",
      "value": "N/A"
    }
  ],
  "dateDisplayFormat": "datetime",
  "label": {
    "show": true,
    "text": "Invoiced",
    "position": "above"
  }
}
```

## Common mistakes

- Using on `listItem` / dashboard card surfaces — `date` is not in `DASHBOARD_CONTENT_KINDS`.
- Wrong `dateDisplayFormat` for a time-only field.
- Using form `fieldPath` syntax instead of DataSource.
