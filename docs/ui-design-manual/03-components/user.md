# Component: user

## Purpose

**When to use:** Show the signed-in user (name, email, photo, or photo with name).

**When not to use:** Arbitrary entity user fields — use `text` or `image` with field binding.

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
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | Yes |
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `display` | `name` \| `email` \| `photo` \| `photo-and-name` | Yes |  | What to show from session. |
| `nameFormat` | `full` \| `first` | No | When name is shown. | Name truncation. |
| `imageSize` | `number` | No | Pixels. | Avatar size. |
| `label` | `LabelConfig` | No |  | Optional caption. |
| `styles` | `StyleRule[]` | No |  | Avatar framing. |

## Interactions

Read-only session display.

## Binding

None — reads authenticated session, not entity record fields.

## Minimal example

```json
{
  "kind": "user",
  "display": "name"
}
```

## Realistic example

```json
{
  "kind": "user",
  "display": "photo-and-name",
  "nameFormat": "first",
  "imageSize": 40,
  "label": {
    "show": true,
    "text": "Signed in as",
    "position": "above",
    "color": "muted"
  }
}
```

## Common mistakes

- Placing on list or form surfaces — allowed only on dashboard-related surfaces.
- Using `primary` field binding — not supported.
- Omitting `imageSize` when `display` includes `photo`.
