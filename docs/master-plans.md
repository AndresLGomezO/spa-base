# Master Plans — Phase 1 and Phase 2

How the original platform plans relate to the **shipped codebase** after Phase 1 and Phase 2 validation.

**As-built docs:** [phase-2-platform-handoff.md](./phase-2-platform-handoff.md) · **Validation:** [e2e-validation-runbook.md](./e2e-validation-runbook.md) · **Next steps:** [next-phase-backlog.md](./next-phase-backlog.md)

---

## Master plan sources

| Document | Role | Status |
|----------|------|--------|
| [Ecosystem Plan/v2/General Definitions.md](../Ecosystem%20Plan/v2/General%20Definitions.md) | **Phase 1 + 2 vision** — principles, workstreams, capabilities 10.x, validation criteria | Vision spec; see guides for implementation |
| [Ecosystem Plan/v3/Master Plan.md](../Ecosystem%20Plan/v3/Master%20Plan.md) | **Phase 1 execution tracker** — step-by-step build log (Steps 0–7) | Phase 1 complete; Phase 2 appendix in file |
| [Ecosystem Plan/v2/Key Capabilitues/](../Ecosystem%20Plan/v2/Key%20Capabilitues/) | **Phase 2 capability specs** (10.0–10.8) | Full vision; v1 gaps in backlog |
| [Ecosystem Plan/v1/](../Ecosystem%20Plan/v1/) | Original Phase 1-only planning | **Historical** — superseded by v2/v3 |

---

## Phase 1 — The engine (complete)

Seven workstreams from [General Definitions §4–§7](../Ecosystem%20Plan/v2/General%20Definitions.md). All validation criteria met.

| Workstream | Delivered | Primary locations | Guide / README |
|------------|-----------|-------------------|----------------|
| Entity system | Complete | `packages/entities`, `packages/dynamic-entities` | [entity-system-guide.md](./entity-system-guide.md) |
| Firestore DAL | Complete | `packages/firestore-converters`, `packages/gcp-firebase` | [firestore-collections-guide.md](./firestore-collections-guide.md) |
| CRUD API generator | Complete | `apps/api/src/crud/` | [apps/api/src/crud/README.md](../apps/api/src/crud/README.md) |
| RBAC | Complete | `packages/rbac`, `apps/api/src/rbac/` | [advanced-rbac-guide.md](./advanced-rbac-guide.md) |
| Frontend entity UI | Complete | `apps/web/app/components/entity/` | [entity README](../apps/web/app/components/entity/README.md) |
| Routing | Complete | `apps/web/app/routing/` | [routing README](../apps/web/app/routing/README.md) |
| Basic admin | Complete | `apps/api/src/routes/admin.routes.ts` | [admin-dashboard-guide.md](./admin-dashboard-guide.md) |

**Default bootstrap today:** [`apps/platform/app.config.ts`](../apps/platform/app.config.ts) uses `modules: []`. Tenants define entities via **Model Builder** (`/settings/data-models`); compile-time modules are optional extensions.

---

## Phase 2 — Ecosystem capabilities (v1 / partial)

Eight capabilities from [General Definitions §11](../Ecosystem%20Plan/v2/General%20Definitions.md). Core paths shipped; deferred items in [next-phase-backlog.md](./next-phase-backlog.md).

| ID | Capability | Status | Guide |
|----|------------|--------|-------|
| 10.0 | Query Engine | Partial (v1) | [query-engine-guide.md](./query-engine-guide.md) |
| 10.1 | Relational Data | Partial (v1) | [relational-data-system-guide.md](./relational-data-system-guide.md) |
| 10.2 | Advanced UI Builder | Partial (v1) | [advanced-ui-builder-guide.md](./advanced-ui-builder-guide.md) |
| 10.3 | Module Extension | Partial (v1) | [module-extension-guide.md](./module-extension-guide.md) |
| 10.4 | Custom Business Logic (Hooks) | Partial (v1) | [hooks-system-guide.md](./hooks-system-guide.md) |
| 10.5 | Advanced RBAC | Partial (v1) | [advanced-rbac-guide.md](./advanced-rbac-guide.md) |
| 10.6 | Admin Dashboard | Partial (v1) | [admin-dashboard-guide.md](./admin-dashboard-guide.md) |
| 10.7 | Performance & Scaling | Partial (Phase A) | [performance-scaling-guide.md](./performance-scaling-guide.md) |
| 10.8 | Dynamic Entity Builder | Partial (v1) | [dynamic-entity-builder-guide.md](./dynamic-entity-builder-guide.md) |

Full capability matrix and API summary: [phase-2-platform-handoff.md §4](./phase-2-platform-handoff.md).

---

## Validation

| Phase | Criteria | How to verify |
|-------|----------|---------------|
| Phase 1 | General Definitions §7 — CRUD without new routes, RBAC on API + UI, tenant isolation | [e2e-validation-runbook.md](./e2e-validation-runbook.md) |
| Phase 2 | General Definitions §11 — configurable systems, SaaS patterns, extensions, composable UI | Runbook + capability guides |

Run automated checks: `pnpm test` and `pnpm typecheck` from repo root.

---

## Next steps

Prioritized deferred work (not a commitment to build order):

| Tier | Focus |
|------|--------|
| **P0** | Redis caching, async hooks, auth-aware rate limits, relation expansion on GET |
| **P1** | Row-level RBAC, ABAC, schema migrations, hook logs/webhooks |
| **P2** | Visual UI builder, dashboards, module marketplace, advanced query |

Details: [next-phase-backlog.md](./next-phase-backlog.md). Handoff decision guide: [phase-2-platform-handoff.md §13](./phase-2-platform-handoff.md).
