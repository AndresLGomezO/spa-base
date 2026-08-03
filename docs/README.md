# Platform Documentation

Index of all platform documentation. Prefer package/app READMEs for local contracts; use the guides and reference specs below for cross-cutting behavior.

New markdown must live in this taxonomy (`guides/`, `reference/`, `ai-platform/`, `infrastructure/`, `ui-design-manual/`) or as a `README.md` under `apps/` / `packages/` / `scripts/`. Enforced by `pnpm check:docs-layout` (also in `validate:ci`).

---

## Guides

| Document | Description |
|----------|-------------|
| [guides/entity-system.md](./guides/entity-system.md) | `defineEntity()`, ownership/sharing, static vs dynamic entities |
| [guides/firestore-collections.md](./guides/firestore-collections.md) | Firestore paths, converters, adding collections |
| [guides/gcs-storage.md](./guides/gcs-storage.md) | GCS / Firebase Storage (logo uploads, emulator, production) |
| [guides/theme-and-tenant-branding.md](./guides/theme-and-tenant-branding.md) | Palette → semantic → component tokens, Appearance editor |
| [guides/query-engine.md](./guides/query-engine.md) | Filter, sort, pagination, `?query=` JSON, RBAC integration |
| [guides/relational-data-system.md](./guides/relational-data-system.md) | FK relations, populate, join collections, delete semantics |
| [guides/advanced-ui-builder.md](./guides/advanced-ui-builder.md) | Entity UI metadata + unified layout builder packages |
| [guides/module-extension.md](./guides/module-extension.md) | `defineModule`, compile-time extensions (optional) |
| [guides/hooks-system.md](./guides/hooks-system.md) | Lifecycle hooks, action interpreter, hook API |
| [guides/data-hooks.md](./guides/data-hooks.md) | Tenant automation overview (points at JSON spec) |
| [guides/advanced-rbac.md](./guides/advanced-rbac.md) | Tenant roles, field-level permissions |
| [guides/admin-dashboard.md](./guides/admin-dashboard.md) | Control Plane UI, tenant vs superadmin admin |
| [guides/performance-scaling.md](./guides/performance-scaling.md) | Caches, rate limits, TanStack Query, virtualization |
| [guides/dynamic-entity-builder.md](./guides/dynamic-entity-builder.md) | Runtime model CRUD, Model Builder, evolution rules |
| [guides/aggregations.md](./guides/aggregations.md) | Event-driven aggregation pipeline operations |
| [guides/metrics-consumption.md](./guides/metrics-consumption.md) | Deterministic metrics read API and key algorithm |
| [guides/dynamic-firestore-indexes.md](./guides/dynamic-firestore-indexes.md) | Dynamic index provisioning |
| [guides/browser-push-notifications.md](./guides/browser-push-notifications.md) | FCM / browser push |
| [guides/codebase-map.md](./guides/codebase-map.md) | Annotated monorepo map / “where to change X” |
| [guides/e2e-validation-runbook.md](./guides/e2e-validation-runbook.md) | Manual validation checklist |

---

## Reference (JSON contracts)

| Document | Description |
|----------|-------------|
| [reference/entity-definition.md](./reference/entity-definition.md) | Entity catalog envelopes for Model Builder import |
| [reference/metric-definition.md](./reference/metric-definition.md) | Metrics JSON for Settings → Metrics import |
| [reference/entity-query-definition.md](./reference/entity-query-definition.md) | Saved query catalog envelopes |
| [reference/data-hook-definition.md](./reference/data-hook-definition.md) | Data Hooks automation specification |
| [reference/custom-view-definition.md](./reference/custom-view-definition.md) | Custom views + design-layout slice envelopes |

---

## UI Design Manual

Self-contained JSON handoff for layouts, components, surfaces, and presets:

- [ui-design-manual/README.md](./ui-design-manual/README.md)

---

## AI platform

| Document | Description |
|----------|-------------|
| [ai-platform/README.md](./ai-platform/README.md) | AI platform index — system map, invariants |
| [ai-platform/01-architecture.md](./ai-platform/01-architecture.md) | Packages, job lifecycle, storage, controller |
| [ai-platform/02-grounded-chat.md](./ai-platform/02-grounded-chat.md) | L0–L2 prefix, Vertex cache, planner/tools |
| [ai-platform/03-cost-guards.md](./ai-platform/03-cost-guards.md) | Tenant/role spend limits |
| [ai-platform/04-context-memory-rag.md](./ai-platform/04-context-memory-rag.md) | Sections, user memory, record summaries, vectors |
| [ai-platform/05-api-worker-ui.md](./ai-platform/05-api-worker-ui.md) | Routes, worker tasks, UI surfaces, env, Terraform |
| [ai-platform/06-integrating-new-features.md](./ai-platform/06-integrating-new-features.md) | Cookbook for new AI features |
| [ai-platform/07-document-extraction.md](./ai-platform/07-document-extraction.md) | Document extraction |

---

## Infrastructure and deployment (GCP)

| Document | Description |
|----------|-------------|
| [infrastructure/bootstrap-new-gcp-account.md](./infrastructure/bootstrap-new-gcp-account.md) | New GCP account → projects → WIF → first deploy |
| [infrastructure/github-secrets-checklist.md](./infrastructure/github-secrets-checklist.md) | Pre-flight checklist before first workflow run |
| [infrastructure/github-wif-setup.md](./infrastructure/github-wif-setup.md) | GitHub Workload Identity Federation |
| [infrastructure/deployment.md](./infrastructure/deployment.md) | CI/CD, branch → environment mapping |
| [infrastructure/environment-variables.md](./infrastructure/environment-variables.md) | All vars, secrets, and env keys |
| [infrastructure/per-environment.md](./infrastructure/per-environment.md) | Localhost vs dev / staging / prod |
| [infrastructure/terraform-state.md](./infrastructure/terraform-state.md) | Terraform state layout |
| [infrastructure/workload-inventory.md](./infrastructure/workload-inventory.md) | Workload Manager inventory |
| [infrastructure/workload-inventory-by-entity.md](./infrastructure/workload-inventory-by-entity.md) | Workloads by entity |
| [infrastructure/workload-system-catalog.md](./infrastructure/workload-system-catalog.md) | System workload catalog |

---

## App and package READMEs

| Path | Description |
|------|-------------|
| [../README.md](../README.md) | Monorepo overview and quick start |
| [../apps/api/README.md](../apps/api/README.md) | API routes, auth, env vars |
| [../apps/web/README.md](../apps/web/README.md) | Web app, routing, Control Plane |
| [../apps/api/src/crud/README.md](../apps/api/src/crud/README.md) | CRUD generator internals |
| [../apps/web/app/routing/README.md](../apps/web/app/routing/README.md) | Route guards and navigation |
| [../apps/web/app/components/entity/README.md](../apps/web/app/components/entity/README.md) | Entity table, form, relation pickers |
| [../packages/entities/README.md](../packages/entities/README.md) | `defineEntity()` core API |
| [../packages/dynamic-entities/README.md](../packages/dynamic-entities/README.md) | Runtime entity definitions |
| [../packages/entity-relations/README.md](../packages/entity-relations/README.md) | FK validation, join collections |
| [../packages/query-engine/README.md](../packages/query-engine/README.md) | List query parse/execute |
| [../packages/ui-builder/README.md](../packages/ui-builder/README.md) | View/form resolution from UI metadata |
| [../packages/modules/README.md](../packages/modules/README.md) | Compile-time module system |
| [../packages/hooks/README.md](../packages/hooks/README.md) | Lifecycle hook engine |
| [../packages/rbac/README.md](../packages/rbac/README.md) | Permission-based RBAC |
| [../packages/gcp-firebase/README.md](../packages/gcp-firebase/README.md) | Firebase Admin adapters |
| [../packages/theme/README.md](../packages/theme/README.md) | Design tokens and tenant branding |
| [../AGENTS.md](../AGENTS.md) | Agent rules (Workload Manager coverage) |
