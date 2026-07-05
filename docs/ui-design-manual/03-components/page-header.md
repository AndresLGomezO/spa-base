# Component: page-header

## Purpose

**When to use:** Main entity page header slot (title, breadcrumbs, chrome).

**When not to use:** Custom titles via `text` — the slot is platform-driven. Form headers.

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
| `styles` | `StyleRule[]` | No |  | Padding, borders below header. |

## Interactions

Platform injects entity title and navigation.

## Binding

None — runtime fills content from entity metadata.

## Minimal example

```json
{
  "kind": "page-header"
}
```

## Realistic example

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-header",
      "component": {
        "kind": "page-header",
        "styles": [
          {
            "property": "paddingBottom",
            "value": "16"
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "row-toolbar",
      "component": {
        "kind": "page-toolbar"
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

- Using on non-`mainPage` surfaces.
- Duplicate `page-header` components.
- Expecting `primary` DataSource for the title.
