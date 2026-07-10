# Component: user

## Purpose

**When to use:** Show the signed-in user (name, email, photo, photo with name, or interactive profile button).

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
| `display` | `name` \| `email` \| `photo` \| `photo-and-name` \| `profile-button` | Yes |  | What to show from session. |
| `nameFormat` | `full` \| `first` | No | When name is shown. | Name truncation. |
| `imageSize` | `number` | No | Pixels. | Avatar size. |
| `avatarShape` | `circle` \| `rounded` \| `square` | No | When avatar is shown. | Avatar geometry. |
| `profileButtonContent` | `photo` \| `full` | No | When `display` is `profile-button`. | Trigger shows avatar only or full details. |
| `label` | `LabelConfig` | No |  | Optional caption. |
| `styles` | `StyleRule[]` | No |  | Avatar framing. |

## Interactions

- `name`, `email`, `photo`, `photo-and-name`: read-only session display.
- `profile-button`: interactive profile menu with theme toggle, language switcher, and sign out (same as sidebar profile button). Ignores `label`.

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
  "display": "profile-button",
  "profileButtonContent": "photo",
  "imageSize": 48,
  "avatarShape": "circle"
}
```

## Common mistakes

- Placing on list or form surfaces — allowed only on dashboard-related surfaces.
- Using `primary` field binding — not supported.
- Omitting `imageSize` when `display` includes `photo`.
- Setting `label` on `profile-button` — it is ignored because the control is interactive.
