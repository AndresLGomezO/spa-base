# Data Hooks (Automation)

Data Hooks are the tenant-configurable automation engine. They let admins define
logic that runs automatically whenever an entity record is **created**,
**updated**, or **deleted** — without writing code. The feature is surfaced in
the sidebar under **Automation**, which expands to list every entity; selecting
an entity opens a Query-Builder-style page with a list of hooks on the left and a
definition editor on the right.

Data Hooks replace the previous static hooks system. They reuse the generic hook
dispatch layer (`runEntityHooks`, the registry, and the per-tenant runtime
context) and add an expression engine, a richer definition model, and a full
CRUD API + UI.

## Concepts

### Trigger

Each hook targets one entity and one operation:

- `operation`: `create` | `update` | `delete`
- `updateFields` (update only): the hook only runs when at least one of these
  fields changed. Empty means "any field change".

### Phase

- `before`: runs before the write. `setField` mutates the record in place, so
  the persisted record already includes the change.
- `after`: runs after the write. `setField` persists through the entity service.

### Condition (optional)

An activation guard evaluated against the trigger record. Conditions are stored
as a recursive boolean tree:

```
{ type: "group", combinator: "and" | "or", children: [...] }
```

Each child is either another group or a leaf condition:

```
{ type: "condition", field, operator, value? }
```

Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `in`, `notIn`, `isEmpty`,
`isNotEmpty`, `changed`. `value` is an expression (see below) and is omitted for
`isEmpty` / `isNotEmpty` / `changed`.

Groups combine children with AND (all must match) or OR (any may match). An empty
group is treated as always true. Legacy bare leaf objects `{ field, operator,
value? }` without a `type` field are still accepted and normalized to
`type: "condition"`.

The `updateMatching` action uses a separate single-field lookup shape (no
`type` discriminator) for its `where` clause.

### Actions

An ordered list. Every computed value is an **expression** (a JSON AST), not a
static literal:

- `setField` — set a field on the trigger record.
- `createRecord` — create one related record (`data` maps field → expression).
- `createRecords` — loop `count` times creating a record per iteration;
  `loopIndex` is available inside expressions.
- `updateMatching` — find related records (`where` field equals a computed
  value) and apply `set` to each. Matched records are exposed as `current` and
  the trigger record as `previous` in `set` expressions.
- `sendNotification` — log a computed message.

## Expression engine

Expressions are stored as a JSON AST and evaluated deterministically (no I/O).
Node kinds:

- `literal` — `string | number | boolean | null`
- `field` — `{ source: "current" | "previous", path }` (supports dotted paths)
- `var` — `now`, `loopIndex`, `userId`
- `unary` — `-`, `!`
- `binary` — arithmetic `+ - * / %`, comparison `== != > < >= <=`, logical
  `&& ||`
- `call` — functions

Functions: `now()`, `dateAdd(date, amount, unit)`, `dateDiff(a, b, unit)`,
`year/month/day(date)`, `abs/round/floor/ceil`, `min/max`, `coalesce`, `concat`,
`toNumber`, `toText`, `dateParse`, `isEmpty`.

Date units: `MILLISECOND`, `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`,
`YEAR`. Dates are ISO-8601 strings; date math uses native `Date` (no extra
dependency).

### Example: complete a transaction when funded

Trigger `create` on `transaction`, condition `amount >= commitmentAmount`,
action `setField status = "COMPLETE"`.

### Example: generate a payment plan

Trigger `create` on `loanDetails`, action `createRecords` with
`count = current.periods` and per-iteration
`dueDate = dateAdd(current.startDate, loopIndex * 30, "DAY")`.

## API

Base path `/api/data-hooks` (permissions `hook.read` / `hook.create` /
`hook.update` / `hook.delete`):

- `GET /api/data-hooks?entity=<name>` — list (optionally filtered by entity)
- `GET /api/data-hooks/:id`
- `POST /api/data-hooks`
- `PATCH /api/data-hooks/:id`
- `DELETE /api/data-hooks/:id`
- `PUT /api/data-hooks/catalog?entity=<name>` — replace hooks matched by
  `entity` + `name`. When `entity` is provided, only hooks for that entity are
  created/updated/deleted; hooks on other entities are untouched. Omit `entity`
  for a full tenant replace (used by seed scripts).

Definitions are stored per-tenant in the `__data_hooks` collection and loaded
lazily into the runtime registry.

## Portable JSON

Single-definition envelopes use `kind: "data-hook-definition"` with a portable
`data` object (no `id`, `tenantId`, or timestamps). Catalog envelopes use
`kind: "data-hooks-catalog"` with a `dataHooks` array:

```json
{
  "kind": "data-hooks-catalog",
  "version": 1,
  "exportedAt": "2026-07-01T13:00:00.000Z",
  "dataHooks": [
    {
      "name": "Set status",
      "entity": "loan",
      "phase": "before",
      "trigger": { "operation": "create" },
      "actions": [{ "type": "setField", "field": "status", "value": { "kind": "literal", "value": "Pending" } }],
      "enabled": true,
      "order": 0
    }
  ]
}
```

The Automation UI exports/imports an entity-scoped catalog for the current
entity. Seed data lives at
`apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json` and is applied
via `seedRatesCatalogs` (full tenant replace).

## Migration

`apps/api/src/admin/migrate-data-hooks.ts` converts legacy `hooks` documents to
the new model: `updateField → setField`, `createRecord → createRecord`,
`sendNotification → sendNotification`, static values become `literal`
expressions, and the legacy event string is mapped to `phase` + `trigger`.

## Phasing

- **Phase 1** — triggers, single-field condition, and `setField` (expression
  arithmetic + date functions).
- **Phase 2** — cross-entity search and multi-record generation (`createRecord`,
  `createRecords`, `updateMatching`), boolean condition trees (AND/OR groups),
  and JSON import-export.
- **Phase 3** — opt-in nested/chained hooks with a depth guard and additional
  functions.
