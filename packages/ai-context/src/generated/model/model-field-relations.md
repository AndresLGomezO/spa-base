# Relation fields

## Relation config shape

```json
{
  "target": "bank",
  "type": "many-to-one",
  "onDelete": "restrict"
}
```

| Property | Values | Description |
|----------|--------|-------------|
| target | entity name | Target entity `name` (camelCase). |
| type | see below | Cardinality and storage strategy. |
| onDelete | restrict, cascade, nullify | Optional. Default: `restrict`. |

## Relation types

| type | Storage | Field naming | Example |
|------|---------|--------------|---------|
| many-to-one | FK on **this** entity (`targetId`) | `{target}Id` e.g. `bankId` | Invoice → Bank |
| one-to-one | FK on **this** entity | `{target}Id` | User → Profile |
| one-to-many | FK on **target** entity (no storage here) | plural target e.g. `transactions` | Account → Transactions |
| many-to-many | Join collection `{source}_{target}` | plural target e.g. `tags` | Article ↔ Tags |

## Rules

- Relation fields store **record id(s)**, not embedded objects.
- `many-to-one` / `one-to-one`: value is a single id string.
- `many-to-many`: value is an array of id strings.
- `one-to-many`: defined on the **parent** side; child holds the FK.
- Cannot mark relation fields as `sensitive` or `isArray` (many-to-many uses array values implicitly via join).
