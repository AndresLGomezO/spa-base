# Data Hooks — Platform Gaps

Open platform and product work for the **generic** data hooks engine. Domain-specific automation (Rates tenant) is tracked separately in [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md).

**Spec:** [data-hook-definition-json.md](./data-hook-definition-json.md)

---

## Notifications

| Gap | Impact | Ask |
|-----|--------|-----|
| `sendNotification` logs only — no email, push, or in-app delivery | Due-date reminders and balance alerts cannot ship as data hooks | Wire notification action to product notification infra |

---

## Related documentation

- [data-hook-definition-json.md](./data-hook-definition-json.md)
- [data-hooks.md](./data-hooks.md)
- [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md) — example domain backlog
