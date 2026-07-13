# Responsive visibility

Control which viewport breakpoints render layout nodes using `displayFrom` and `displayTo` on rows and columns. Hidden nodes use `display: none` and do not occupy layout space.

---

## Breakpoints

| Value | Viewport |
|-------|----------|
| `base` | Mobile default (< 640px) |
| `sm` | 640px and wider |
| `md` | 768px and wider (tablet) |
| `lg` | 1024px and wider (desktop) |
| `xl` | 1280px and wider |

Order: `base` → `sm` → `md` → `lg` → `xl`.

---

## Fields

| Field | Type | Default when omitted |
|-------|------|---------------------|
| `displayFrom` | breakpoint | `base` |
| `displayTo` | breakpoint | `xl` |

A node is **visible** when:

```
index(displayFrom) ≤ currentBreakpoint ≤ index(displayTo)
```

Omit both fields → visible on **all** breakpoints.

---

## Where to attach

| Node | Applies to |
|------|------------|
| **Component row** (`type: "component"`) | That row and its component |
| **Column** (`ColumnNode`) | Entire column and all nested rows |
| **Expandable-table column** | Per-column `cellLayout` visibility in grouped tables |

Visibility is set on the **row or column wrapper**, not on individual component configs (`primary`, `fieldPath`, etc.).

---

## Visibility rules (`visibleWhen`)

Rows and columns can gate rendering with the **same condition model** as conditional styles (`conditionKind` + `matchValue` + optional field compare). Unlike `displayFrom` / `displayTo`, a failing rule **does not mount** the node or its children (metric and query slots inside do not fetch).

| Field | Type | Meaning |
|-------|------|---------|
| `visibleWhen` | `LayoutCondition[]` (optional) | When set, the node only renders if **every** condition matches (AND) |

### Condition kinds

| `conditionKind` | `matchValue` | Notes |
|-----------------|--------------|-------|
| `field` (default) | Exact string, or days-remaining threshold (`<=7`) | Uses `compareFieldPath` (or the bound field on components) |
| `activePath` | Route path prefix | Current pathname (no query/hash) |
| `dashboardDateFilter` | `currentPeriod` or an exact bucket (`2026-07`) | Dashboard period filter; missing filter context → visible |

### Current period only

```json
{
  "type": "component",
  "id": "row-due-today-shell",
  "visibleWhen": [
    {
      "conditionKind": "dashboardDateFilter",
      "matchValue": "currentPeriod"
    }
  ],
  "component": {
    "kind": "container",
    "rows": []
  }
}
```

- Omitted or empty `visibleWhen` → always visible.
- Combine with responsive range: the user sees the block only when **both** `displayFrom` / `displayTo` and `visibleWhen` allow it.
- The structure tree in the designer always shows the full hierarchy (same as `displayFrom`).

---

## Design guidelines

1. **Mobile-first** — design for `base` first; add wider-only content with `displayFrom: "md"` or higher.
2. **Never hide critical form fields** on mobile without a mobile alternative in the same layout.
3. **Prefer responsive grid** (`gridTemplateColumns` with `minmax`, or separate mobile/desktop grids) for column reflow; use visibility when content should appear or disappear entirely.
4. **Test both ends** — verify `displayTo: "base"` (mobile-only) and `displayFrom: "lg"` (desktop-only) at actual breakpoints.

---

## Examples

### Tablet and desktop only

Hide a secondary field on phones:

```json
{
  "type": "component",
  "id": "row_category",
  "displayFrom": "md",
  "displayTo": "xl",
  "component": {
    "kind": "form-field",
    "fieldPath": "categoryId"
  }
}
```

### Mobile-only hint

```json
{
  "type": "component",
  "id": "row_hint",
  "displayFrom": "base",
  "displayTo": "base",
  "component": {
    "kind": "text",
    "primary": { "type": "static", "value": "Swipe row for details" },
    "label": { "show": false }
  }
}
```

### Desktop sidebar track

Hide an entire grid track on mobile by setting visibility on the track row:

```json
{
  "kind": "grid",
  "gridTemplateColumns": "minmax(0, 1fr) 280px",
  "gap": "16px",
  "rows": [
    {
      "type": "component",
      "id": "track-main",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-list",
            "component": { "kind": "page-list" }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-sidebar",
      "displayFrom": "md",
      "displayTo": "xl",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-filter",
            "component": {
              "kind": "view-filter",
              "enableSearch": true,
              "enableFilters": true,
              "filters": [
                { "entityName": "Invoice", "fieldName": "status" }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

### Screen-root: mobile toolbar vs desktop header

```json
{
  "root": {
    "type": "screen-root",
    "id": "screen-entity",
    "gridTemplateColumns": "1fr",
    "rows": [
      {
        "type": "component",
        "id": "row-header-desktop",
        "displayFrom": "md",
        "displayTo": "xl",
        "component": { "kind": "page-header" }
      },
      {
        "type": "component",
        "id": "row-toolbar-mobile",
        "displayFrom": "base",
        "displayTo": "base",
        "component": { "kind": "page-toolbar" }
      },
      {
        "type": "component",
        "id": "row-metrics",
        "component": { "kind": "page-metrics" }
      },
      {
        "type": "component",
        "id": "row-list",
        "component": { "kind": "page-list" }
      }
    ]
  }
}
```

### Expandable table column visibility

Grouped table columns support per-column breakpoints:

```json
{
  "id": "col-amount",
  "label": "Amount",
  "displayFrom": "sm",
  "displayTo": "xl",
  "cellLayout": {
    "root": {
      "type": "root",
      "id": "cell-root",
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
                "rows": [
                  {
                    "type": "component",
                    "id": "row-amount",
                    "component": {
                      "kind": "numeric",
                      "primary": { "type": "field", "path": "amount" },
                      "displayFormat": "currency"
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  }
}
```

---

## Visibility vs grid reflow

| Goal | Approach |
|------|----------|
| Same content, fewer columns on mobile | Single `grid` with responsive `gridTemplateColumns` or stack tracks vertically on narrow viewports |
| Different content per breakpoint | `displayFrom` / `displayTo` on separate rows |
| Hide non-essential metadata on phones | `displayFrom: "sm"` on secondary rows |
| Show only for the current dashboard period | `visibleWhen: [{ conditionKind: "dashboardDateFilter", matchValue: "currentPeriod" }]` on the shell row |

---

## Related

- [Grid and screen-root](./grid-and-screen-root.md) — structural layout
- [Style rules and motion](./style-rules-and-motion.md) — visual styling (separate from visibility)
