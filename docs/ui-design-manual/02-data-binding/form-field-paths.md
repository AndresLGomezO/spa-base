# Form field paths

Form layouts bind editable fields through `fieldPath` on `form-field` and `entity-field-selector` components. Unlike display DataSources, form paths are always **top-level entity field names** — no dot notation.

---

## form-field

Renders an input for a single entity field.

```json
{
  "kind": "form-field",
  "fieldPath": "name"
}
```

### Valid fieldPath values

| Rule | Detail |
|------|--------|
| Top-level only | `bankId` ✓ — `bank.name` ✗ |
| Entity fields | Any non-document field on the entity |
| System fields | `id`, `createdAt`, `updatedAt` allowed where applicable |
| No relation subpaths | Use the FK field (`providerId`), not `provider.name` |

### Optional properties

| Property | Purpose |
|----------|---------|
| `hideLabel` | Suppress auto-generated label |
| `hidden` | Render field hidden (still submitted) |
| `booleanDisplay` | `"checkbox"` or `"switch"` for boolean fields |
| `switchVariant` | `"ios"` or `"squared"` when using switch |
| `multiline` | Textarea for string fields |
| `multilineRows` | Textarea row count |
| `styles[]` | Component-level styles |

### Two-column form grid

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-grid",
      "component": {
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
                  "component": { "kind": "form-field", "fieldPath": "name" }
                },
                {
                  "type": "component",
                  "id": "row-email",
                  "component": { "kind": "form-field", "fieldPath": "email" }
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
                  "id": "row-status",
                  "component": { "kind": "form-field", "fieldPath": "status" }
                },
                {
                  "type": "component",
                  "id": "row-amount",
                  "component": {
                    "kind": "form-field",
                    "fieldPath": "amount"
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "row-actions",
      "component": { "kind": "form-actions" }
    }
  ]
}
```

### Form section with fields

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-section",
      "component": {
        "kind": "form-section",
        "title": "Account details"
      }
    },
    {
      "type": "component",
      "id": "row-name",
      "component": { "kind": "form-field", "fieldPath": "name" }
    },
    {
      "type": "component",
      "id": "row-bank",
      "component": { "kind": "form-field", "fieldPath": "bankId" }
    }
  ]
}
```

---

## entity-field-selector

Visual picker for **relation** or **enum** fields. Presents options as a list, list-with-logo, or mini-cards.

```json
{
  "kind": "entity-field-selector",
  "fieldPath": "bankId",
  "layout": "list-with-logo",
  "enableSearch": true,
  "imageFieldPath": "logo"
}
```

### Valid fieldPath values

| Field type | Allowed |
|------------|---------|
| `enum` | ✓ |
| `relation` (many-to-one, one-to-one, many-to-many) | ✓ |
| Scalar (string, number, date, …) | ✗ — use `form-field` |

### Layout options

| `layout` | Description |
|----------|-------------|
| `list` | Simple selectable list |
| `list-with-logo` | List with image from `imageFieldPath` on related entity |
| `mini-cards` | Card grid; use `cardsPerRow` (1–4) |

### Mini-cards example

```json
{
  "kind": "entity-field-selector",
  "fieldPath": "accountTypeId",
  "layout": "mini-cards",
  "cardsPerRow": 3,
  "enableSearch": false
}
```

---

## Display path vs form path (quick reference)

| Entity has | List / detail shows | Form edits |
|------------|---------------------|------------|
| `bankId` → Bank.name | `bank.name` | `bankId` |
| `status` enum | `status` | `status` |
| `amount` number | `amount` | `amount` |
| `logo` image on entity | `logo` | `logo` |

---

## Validation rules

Import validation checks `fieldPath` against the entity definition for the active form surface:

- Unknown field → error
- Dot path on form-field → error
- Document-type field → error
- Relation subpath on form-field → error

Common error messages:

```
Invalid formPlain form field path "bank.name" for entity "Account".
Invalid formPlain entity field selector path "name" for entity "Account".
```

Fix by using the FK field name for relations and enums in selectors.

---

## Hidden fields

```json
{
  "kind": "form-field",
  "fieldPath": "tenantId",
  "hidden": true
}
```

Hidden fields remain in the form payload but are not shown to the user.

---

## Related

- [Data sources](./data-sources.md) — display binding for read-only components
- [Validation errors](../appendix/validation-errors.md) — troubleshooting import failures
