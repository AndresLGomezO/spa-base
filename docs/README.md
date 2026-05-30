# Platform Documentation

Index of all platform documentation. Start with the [Phase 2 handoff](./phase-2-platform-handoff.md) if you are new to the codebase.

---

## Handoff and planning

| Document | Description |
|----------|-------------|
| [phase-2-platform-handoff.md](./phase-2-platform-handoff.md) | Master handoff: architecture, capability status, security, API summary |
| [master-plans.md](./master-plans.md) | Phase 1 + 2 master plans mapped to guides and code |
| [e2e-validation-runbook.md](./e2e-validation-runbook.md) | Step-by-step manual validation |
| [next-phase-backlog.md](./next-phase-backlog.md) | **Next steps** — prioritized deferred work (P0–P2) |
| [codebase-map.md](./codebase-map.md) | Annotated file index and “where to change X” lookup |

---

## Master plans (source specs)

| Document | Description |
|----------|-------------|
| [master-plans.md](./master-plans.md) | Bridge: Phase 1 workstreams + Phase 2 capabilities → implementation status |
| [../Ecosystem Plan/v2/General Definitions.md](../Ecosystem%20Plan/v2/General%20Definitions.md) | Phase 1 + 2 vision (principles, validation, outcomes) |
| [../Ecosystem Plan/v3/Master Plan.md](../Ecosystem%20Plan/v3/Master%20Plan.md) | Phase 1 execution tracker |
| [../Ecosystem Plan/v2/Key Capabilitues/](../Ecosystem%20Plan/v2/Key%20Capabilitues/) | Phase 2 capability specs (10.0–10.8) |
| [../Ecosystem Plan/v1/](../Ecosystem%20Plan/v1/) | **Historical** — original Phase 1 planning only |

---

## Next steps

After validation ([e2e-validation-runbook.md](./e2e-validation-runbook.md)), plan from [next-phase-backlog.md](./next-phase-backlog.md). Handoff §13 in [phase-2-platform-handoff.md](./phase-2-platform-handoff.md) outlines Phase 3 direction options (production readiness, product depth, platform scale).

---

## Phase 1 — Foundation

| Document | Description |
|----------|-------------|
| [entity-system-guide.md](./entity-system-guide.md) | `defineEntity()`, static vs dynamic entities, package dependencies |
| [firestore-collections-guide.md](./firestore-collections-guide.md) | Firestore paths, converters, adding collections |
| [gcs-storage-guide.md](./gcs-storage-guide.md) | GCS / Firebase Storage (logo uploads, emulator, production) |

---

## Phase 2 — Capabilities

| ID | Document | Description |
|----|----------|-------------|
| 10.0 | [query-engine-guide.md](./query-engine-guide.md) | Filter, sort, pagination, `?query=` JSON, RBAC integration |
| 10.1 | [relational-data-system-guide.md](./relational-data-system-guide.md) | FK relations, join collections, M2M sync API, delete semantics |
| 10.2 | [advanced-ui-builder-guide.md](./advanced-ui-builder-guide.md) | Config-driven table/form/card views, scroll-contained layout |
| 10.3 | [module-extension-guide.md](./module-extension-guide.md) | `defineModule`, compile-time extensions (optional path) |
| 10.4 | [hooks-system-guide.md](./hooks-system-guide.md) | Lifecycle hooks, action interpreter, hook API |
| 10.5 | [advanced-rbac-guide.md](./advanced-rbac-guide.md) | Tenant roles, field-level permissions |
| 10.6 | [admin-dashboard-guide.md](./admin-dashboard-guide.md) | Control Plane UI, tenant vs superadmin admin |
| 10.7 | [performance-scaling-guide.md](./performance-scaling-guide.md) | Phase A caches, rate limits, TanStack Query, virtualization |
| 10.8 | [dynamic-entity-builder-guide.md](./dynamic-entity-builder-guide.md) | Runtime model CRUD, Model Builder, evolution rules |

---

## App READMEs

| Path | Description |
|------|-------------|
| [../README.md](../README.md) | Monorepo overview and quick start |
| [../apps/api/README.md](../apps/api/README.md) | API routes, auth, env vars |
| [../apps/web/README.md](../apps/web/README.md) | Web app, routing, Control Plane |
| [../apps/api/src/crud/README.md](../apps/api/src/crud/README.md) | CRUD generator internals |
| [../apps/web/app/routing/README.md](../apps/web/app/routing/README.md) | Route guards and navigation |
| [../apps/web/app/components/entity/README.md](../apps/web/app/components/entity/README.md) | Entity table, form, relation pickers |
| [../apps/web/app/components/admin/README.md](../apps/web/app/components/admin/README.md) | Legacy admin pointer |

---

## Package READMEs

| Path | Description |
|------|-------------|
| [../packages/entities/README.md](../packages/entities/README.md) | `defineEntity()` core API |
| [../packages/dynamic-entities/README.md](../packages/dynamic-entities/README.md) | Runtime entity definitions |
| [../packages/entity-relations/README.md](../packages/entity-relations/README.md) | FK validation, join collections |
| [../packages/query-engine/README.md](../packages/query-engine/README.md) | List query parse/execute |
| [../packages/ui-builder/README.md](../packages/ui-builder/README.md) | View/form resolution from UI metadata |
| [../packages/modules/README.md](../packages/modules/README.md) | Compile-time module system |
| [../packages/hooks/README.md](../packages/hooks/README.md) | Lifecycle hook engine |
| [../packages/rbac/README.md](../packages/rbac/README.md) | Permission-based RBAC |
| [../packages/gcp-firebase/README.md](../packages/gcp-firebase/README.md) | Firebase Admin adapters |
| [../packages/firestore-converters/src/entity/README.md](../packages/firestore-converters/src/entity/README.md) | Repository port contract |
| [../packages/shared-types/src/entities/README.md](../packages/shared-types/src/entities/README.md) | Adding static entities |
