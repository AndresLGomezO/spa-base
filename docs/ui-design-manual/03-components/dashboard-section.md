# Component: dashboard-section

## Purpose

**When to use:** Embed a reusable tenant dashboard section by ID.

**When not to use:** Inline one-off content — build inside the section definition.

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
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `sectionId` | `string` | Yes | Tenant dashboard section key. | Which section to render. |
| `label` | `string` | No |  | Override section title. |
| `styles` | `StyleRule[]` | No |  | Outer framing. |

## Interactions

Read-only reference. Section content is managed separately.

## Binding

None on the component — section holds its own layout.

## Minimal example

```json
{
  "kind": "dashboard-section",
  "sectionId": "section_overview"
}
```

## Realistic example

```json
{
  "kind": "dashboard-section",
  "sectionId": "monthly_control",
  "label": "Monthly overview",
  "styles": [
    {
      "property": "marginBottom",
      "value": "24"
    }
  ]
}
```

## Common mistakes

- Using on surfaces other than `dashboardLayout`.
- Empty `sectionId`.
- Duplicating section content inline instead of referencing the section.
