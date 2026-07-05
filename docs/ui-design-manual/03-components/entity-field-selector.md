# Component: entity-field-selector

## Purpose

**When to use:** Visual picker for relation or enum fields.

**When not to use:** Scalar fields — use `form-field`. Read-only relation labels — use `text` with `bank.name`.

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
| `fieldPath` | `string` | Yes | Relation or enum field only. | Field to pick. |
| `layout` | `list` \| `list-with-logo` \| `mini-cards` | Yes |  | Presentation mode. |
| `hidden` | `boolean` | No |  | Hidden but submitted. |
| `enableSearch` | `boolean` | No | Default true. | Filter options. |
| `cardsPerRow` | `number` | No | 1–4 when `mini-cards`. | Grid density. |
| `imageFieldPath` | `string` | No | Related entity image field. | Logo in list-with-logo. |
| `styles` | `StyleRule[]` | No |  | Selector framing. |

## Interactions

User selects one option; updates FK or enum value.

## Binding

`fieldPath` — FK field (`bankId`) or enum (`status`).

## Minimal example

```json
{
  "kind": "entity-field-selector",
  "fieldPath": "bankId",
  "layout": "list"
}
```

## Realistic example

```json
{
  "kind": "entity-field-selector",
  "fieldPath": "bankId",
  "layout": "list-with-logo",
  "enableSearch": true,
  "imageFieldPath": "logo",
  "styles": [
    {
      "property": "marginBottom",
      "value": "16"
    }
  ]
}
```

## Common mistakes

- Using on scalar fields like `name` or `amount`.
- Dot paths on `fieldPath`.
- `list-with-logo` without `imageFieldPath`.
