# Grid and screen-root

The layout system is **grid-only**. CSS Grid defines structure; `container` stacks content within a track. The deprecated `nested-layout` row type is not supported — always use `kind: "grid"`.

---

## Two root modes

| Root type | Scope | When to use |
|-----------|-------|-------------|
| `screen-root` | Page / screen | Main entity page, dashboards, custom full-page views |
| `root` (column root) | Component / block | List cards, forms, detail panels, metric strips, table cells |

### Column root (component / block scope)

Every block layout uses a column `root` with exactly **one column** containing exactly **one** `container` row. All designed content goes inside `container.rows`.

```json
{
  "root": {
    "type": "root",
    "id": "root-1",
    "columnCount": 1,
    "columns": [
      {
        "id": "col-1",
        "rows": [
          {
            "type": "component",
            "id": "row-container",
            "component": {
              "kind": "container",
              "rows": []
            }
          }
        ]
      }
    ]
  }
}
```

**Rules:**

- `columnCount` must equal `columns.length`.
- The root column must contain a single `container` component row — no other component kinds directly under the column.
- Legacy multi-column `root` layouts are accepted on import but normalized to `grid` at runtime.

### Screen-root (page scope)

Full-page layouts use `screen-root`, which applies CSS Grid at the top level without the column wrapper.

```json
{
  "root": {
    "type": "screen-root",
    "id": "screen-main",
    "gridTemplateColumns": "minmax(0, 1fr) minmax(280px, 320px)",
    "gap": "24px",
    "alignItems": "start",
    "rows": [
      {
        "type": "component",
        "id": "track-main",
        "component": {
          "kind": "container",
          "rows": []
        }
      },
      {
        "type": "component",
        "id": "track-sidebar",
        "component": {
          "kind": "container",
          "rows": []
        }
      }
    ]
  }
}
```

**Rules:**

- `gridTemplateColumns` is required — a valid CSS grid template string.
- Each entry in `rows[]` is one grid track (one column in LTR layouts).
- Tracks typically wrap content in a `container` for vertical stacking.
- Optional: `gap`, `alignItems` (`start` | `center` | `end` | `stretch`), `styles[]`.

### Single-column screen-root

When the page is one full-width column:

```json
{
  "root": {
    "type": "screen-root",
    "id": "screen-single",
    "gridTemplateColumns": "1fr",
    "rows": [
      {
        "type": "component",
        "id": "track-content",
        "component": {
          "kind": "container",
          "rows": [
            {
              "type": "component",
              "id": "row-header",
              "component": { "kind": "page-header" }
            },
            {
              "type": "component",
              "id": "row-list",
              "component": { "kind": "page-list" }
            }
          ]
        }
      }
    ]
  }
}
```

---

## Grid component (inside containers)

Multi-column sections inside a block use `kind: "grid"` nested in `container.rows`:

```json
{
  "kind": "grid",
  "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
  "gap": "12px",
  "alignItems": "start",
  "rows": [
    {
      "type": "component",
      "id": "track-left",
      "component": {
        "kind": "container",
        "rows": []
      }
    },
    {
      "type": "component",
      "id": "track-right",
      "component": {
        "kind": "container",
        "rows": []
      }
    }
  ]
}
```

**Rules:**

- `gridTemplateColumns` defines track widths — e.g. `"1fr 1fr"`, `"240px 1fr"`, `"repeat(3, 1fr)"`.
- `grid.rows.length` should match the number of explicit tracks (one row per track).
- Each track row is usually a `container` holding vertically stacked components.
- `gap` is optional (CSS length string, e.g. `"16px"`).

---

## Choosing screen-root vs column root

| Scenario | Root type |
|----------|-----------|
| Main entity page layout | `screen-root` (or column root with container — platform may promote to screen-root for main page) |
| List card (`listItem`) | Column `root` → `container` |
| Form body | Column `root` → `container` |
| Record detail panel | Column `root` → `container` |
| Expandable row expand panel | Column `root` → `container` |
| Dashboard section with responsive columns | `screen-root` |

When in doubt: **embedded content** → column root; **full page shell** → screen-root.

---

## Anti-patterns

| Do not | Do instead |
|--------|------------|
| Use `nested-layout` rows | Use `kind: "grid"` |
| Put multiple containers at root | Single container; nest grids inside |
| Use `justifyContent` on root for columns | `grid` with `gridTemplateColumns` |
| Skip the root container | Always wrap in one `container` at block scope |
| Use `columnCount > 1` at root for new designs | `container` → `grid` with explicit tracks |

---

## Node reference

| Node | `type` / `kind` | Key fields |
|------|-----------------|------------|
| Screen root | `screen-root` | `id`, `gridTemplateColumns`, `gap?`, `alignItems?`, `rows[]`, `styles?` |
| Column root | `root` | `id`, `columnCount`, `columns[]`, `styles?` |
| Component row | `component` | `id`, `component`, `styles?`, `motion?`, `displayFrom?`, `displayTo?` |
| Container | `container` | `rows[]`, `styles?` |
| Grid | `grid` | `gridTemplateColumns`, `gap?`, `alignItems?`, `rows[]`, `styles?` |

See [Container and tracks](./container-and-tracks.md) for track composition patterns.
