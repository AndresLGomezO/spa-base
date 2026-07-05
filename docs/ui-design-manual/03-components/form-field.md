# Component: form-field

## Purpose

**When to use:** Editable input for a single top-level entity field.

**When not to use:** Relation/enum pickers — use `entity-field-selector`. Read-only display — use `text`/`numeric`/etc.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | Yes |
| `formEdit` | Yes |
| `formPlain` | Yes |
| `formWizardShell` | No |
| `formWizardStep` | Yes |
| `formModalFooter` | Yes |
| `metricStrip` | No |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | No |
| `dashboardLayout` | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `fieldPath` | `string` | Yes | Top-level entity field only. | Which field to edit. |
| `hideLabel` | `boolean` | No |  | Suppress auto label. |
| `hidden` | `boolean` | No |  | Hidden but submitted. |
| `booleanDisplay` | `checkbox` \| `switch` | No | For boolean fields. | Control style. |
| `switchVariant` | `ios` \| `squared` | No | When `booleanDisplay` is `switch`. | Switch appearance. |
| `switchWidth` | `number` | No |  | Switch width px. |
| `switchHeight` | `number` | No |  | Switch height px. |
| `multiline` | `boolean` | No |  | Textarea for strings. |
| `multilineRows` | `number` | No |  | Textarea rows. |
| `styles` | `StyleRule[]` | No |  | Field framing. |

## Interactions

User edits value; included in form submit payload.

## Binding

`fieldPath` — top-level entity field name (e.g. `bankId`, not `bank.name`).

## Minimal example

```json
{
  "kind": "form-field",
  "fieldPath": "name"
}
```

## Realistic example

```json
{
  "kind": "grid",
  "gridTemplateColumns": "1fr 1fr",
  "gap": "16px",
  "rows": [
    {
      "type": "component",
      "id": "track-left",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-name",
            "component": {
              "kind": "form-field",
              "fieldPath": "name"
            }
          },
          {
            "type": "component",
            "id": "row-email",
            "component": {
              "kind": "form-field",
              "fieldPath": "email",
              "multiline": false
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-right",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-active",
            "component": {
              "kind": "form-field",
              "fieldPath": "isActive",
              "booleanDisplay": "switch",
              "switchVariant": "ios"
            }
          },
          {
            "type": "component",
            "id": "row-notes",
            "component": {
              "kind": "form-field",
              "fieldPath": "notes",
              "multiline": true,
              "multilineRows": 4,
              "hideLabel": false
            }
          }
        ]
      }
    }
  ]
}
```

## Common mistakes

- Dot paths (`bank.name`) — use `bankId` for relations.
- Using on `mainPage` or list surfaces.
- Placing on `formWizardShell` — fields belong in `formWizardStep`.
