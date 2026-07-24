# Data Hooks — Platform Gaps

Open platform and product work for the **generic** data hooks engine. Domain-specific automation (Rates tenant) is tracked separately in [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md).

**Spec:** [data-hook-definition-json.md](./data-hook-definition-json.md)

---

## Notifications

| Gap | Impact | Ask |
|-----|--------|-----|
| No email delivery for `sendNotification` | Reminder/alert hooks cannot email users | Wire email channel (in-app + browser push already ship) |

In-app bell delivery and optional browser push (when the user enables push in Account → General) are shipped. Email remains the open gap.

---

## createRecords loop state

| Capability | Status | Notes |
|------------|--------|-------|
| `loopState` variable | **Shipped** | Exposed per iteration in `createRecords`; set from prior row via hook-authored `data.__loopState` (stripped before write) |
| `pow`, `ln`, `ceil`, `floor`, `min`, `max` | **Shipped** | Generic math for hook-authored formulas |

Domain formulas (e.g. tenant loan schedules) belong in **tenant formula catalogs**. The platform formula library is generic math only (`annuityPayment`, `simpleInterest`).

| Capability | Status | Notes |
|------------|--------|-------|
| Reusable formula definitions | **Shipped** | Platform math library + tenant domain formulas; `formula` and `input` AST nodes; Settings → Formulas UI + JSON import/export |

---

## Related documentation

- [data-hook-definition-json.md](./data-hook-definition-json.md)
- [data-hooks.md](./data-hooks.md)
- [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md) — example domain backlog
