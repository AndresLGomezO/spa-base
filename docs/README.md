# Platform Documentation

Index of all platform documentation. Start with the [Phase 2 handoff](./phase-2-platform-handoff.md) if you are new to the codebase.

---

## Handoff and planning

| Document | Description |
|----------|-------------|
| [phase-2-platform-handoff.md](./phase-2-platform-handoff.md) | Master handoff: architecture, capability status, security, API summary, stabilization notes |
| [e2e-validation-runbook.md](./e2e-validation-runbook.md) | Step-by-step manual validation (tenant, entity, roles, CRUD, permissions) |
| [next-phase-backlog.md](./next-phase-backlog.md) | Prioritized deferred work for the next implementation phase |
| [codebase-map.md](./codebase-map.md) | Annotated file index and “where to change X” lookup |

---

## Phase 1 — Foundation

| Document | Description |
|----------|-------------|
| [entity-system-guide.md](./entity-system-guide.md) | `defineEntity()`, static vs dynamic entities, package dependencies |
| [firestore-collections-guide.md](./firestore-collections-guide.md) | Firestore paths, converters, adding collections |

---

## Phase 2 — Capabilities

| ID | Document | Description |
|----|----------|-------------|
| 10.0 | [query-engine-guide.md](./query-engine-guide.md) | Filter, sort, pagination, `?query=` JSON, RBAC integration |
| 10.1 | [relational-data-system-guide.md](./relational-data-system-guide.md) | FK relations, join collections, delete semantics |
| 10.2 | [advanced-ui-builder-guide.md](./advanced-ui-builder-guide.md) | Config-driven table/form/card views, registries |
| 10.3 | [module-extension-guide.md](./module-extension-guide.md) | `defineModule`, compile-time extensions, inventory sample |
| 10.4 | [hooks-system-guide.md](./hooks-system-guide.md) | Lifecycle hooks, action interpreter, hook API |
| 10.5 | [advanced-rbac-guide.md](./advanced-rbac-guide.md) | Tenant roles, field-level permissions |
| 10.6 | [admin-dashboard-guide.md](./admin-dashboard-guide.md) | Control Plane UI, tenant vs superadmin admin |
| 10.7 | [performance-scaling-guide.md](./performance-scaling-guide.md) | Phase A caches, rate limits, TanStack Query, virtualization |
| 10.8 | [dynamic-entity-builder-guide.md](./dynamic-entity-builder-guide.md) | Runtime model CRUD, Model Builder, evolution rules |

---

## App and package READMEs

| Path | Description |
|------|-------------|
| [../README.md](../README.md) | Monorepo overview and quick start |
| [../apps/api/README.md](../apps/api/README.md) | API routes, auth, env vars |
| [../apps/web/README.md](../apps/web/README.md) | Web app, routing, Control Plane |
| [../packages/rbac/README.md](../packages/rbac/README.md) | RBAC concepts and usage |
| [../packages/entities/README.md](../packages/entities/README.md) | Entity definition API |
| Package READMEs | See `packages/*/README.md` for query-engine, modules, hooks, etc. |

---

## Ecosystem plan (source specs)

Original planning documents: `Ecosystem Plan/v2/General Definitions.md` and `Ecosystem Plan/v2/Key Capabilitues/*.md`.
