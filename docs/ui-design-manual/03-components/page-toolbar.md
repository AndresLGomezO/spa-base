# Component: page-toolbar

## Purpose

**When to use:** Main page toolbar slot (create, actions, view switcher).

**When not to use:** Custom filter UI here — use `view-filter` in a sidebar or above the list.

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
| `styles` | `StyleRule[]` | No |  | Toolbar spacing. |

## Interactions

Platform injects entity actions and view controls.

## Binding

None.

## Minimal example

```json
{
  "kind": "page-toolbar"
}
```

## Realistic example

```json
{
  "kind": "page-toolbar",
  "styles": [
    {
      "property": "marginBottom",
      "value": "12"
    }
  ]
}
```

## Common mistakes

- Using on form or list item surfaces.
- Nesting `form-actions` expecting toolbar behavior.
