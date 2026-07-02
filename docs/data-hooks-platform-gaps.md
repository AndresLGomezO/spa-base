# Data Hooks — Platform Gaps

Open platform and product work for the **generic** data hooks engine. Domain-specific automation (Rates tenant) is tracked separately in [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md).

**Spec:** [data-hook-definition-json.md](./data-hook-definition-json.md)

---

## Notifications

| Gap | Impact | Ask |
|-----|--------|-----|
| `sendNotification` logs only — no email, push, or in-app delivery | Due-date reminders and balance alerts cannot ship as data hooks | Wire notification action to product notification infra |

---

## createRecords loop state

| Capability | Status | Notes |
|------------|--------|-------|
| `loopState` variable | **Shipped** | Exposed per iteration in `createRecords`; set from prior row via hook-authored `data.__loopState` (stripped before write) |
| `pow`, `ln`, `ceil`, `floor`, `min`, `max` | **Shipped** | Generic math for hook-authored formulas |

Domain formulas (e.g. tenant loan schedules) belong in catalog hook JSON, not platform TypeScript.

---

## Related documentation

- [data-hook-definition-json.md](./data-hook-definition-json.md)
- [data-hooks.md](./data-hooks.md)
- [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md) — example domain backlog
