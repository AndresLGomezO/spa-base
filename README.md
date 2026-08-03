# Entity System - ESP

Multi-tenant ecosystem builder: schema-driven entities, auto-generated CRUD APIs, RBAC, dynamic UI, optional modules, and hooks.

**Phase 1 (engine):** complete — entity system, DAL, CRUD generator, RBAC, entity UI, routing, basic admin.  
**Phase 2 (ecosystem):** v1 delivered — query engine, relations, UI builder, modules framework, hooks, advanced RBAC, admin control plane, performance Phase A, dynamic entity builder.

---

## Documentation

| Document | Description |
| -------- | ----------- |
| [docs/README.md](docs/README.md) | Full documentation index |
| [docs/guides/codebase-map.md](docs/guides/codebase-map.md) | Annotated monorepo map |
| [docs/guides/e2e-validation-runbook.md](docs/guides/e2e-validation-runbook.md) | Manual validation steps |
| [docs/infrastructure/bootstrap-new-gcp-account.md](docs/infrastructure/bootstrap-new-gcp-account.md) | **GCP deploy** — new account, WIF, first release |
| [docs/guides/theme-and-tenant-branding.md](docs/guides/theme-and-tenant-branding.md) | Theme tokens, tenant Appearance, `@repo/theme` |
| [docs/ai-platform/README.md](docs/ai-platform/README.md) | AI platform architecture |
| [docs/ui-design-manual/README.md](docs/ui-design-manual/README.md) | UI Design Manual (layout JSON handoff) |

---

## Quick start

```bash
pnpm install
pnpm emulators          # Firebase Auth + Firestore emulators
pnpm --filter api dev     # API :3000
pnpm --filter web dev     # Web :5173
```

Or run everything in Docker: `pnpm dev:docker`, then seed the database: `pnpm seed:database`

Set `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com` in `apps/api/.env.dev` to bootstrap superadmin on first login.

---

## Monorepo structure

```
apps/
  api/        Fastify HTTP API
  web/        React Router 7 SPA
  platform/   defineApp bootstrap (modules: [] by default)
packages/     Shared libraries (@repo/*)
docs/         Guides, reference specs, AI platform, infrastructure, UI Design Manual
```

**Entity strategy:** Bootstrap ships with **no compile-time modules** ([`apps/platform/app.config.ts`](apps/platform/app.config.ts)). Tenants create data models via **Settings → Data Model Builder** (`/settings/data-models`). Optional extension modules can be added under a top-level `modules/` folder — see [module-extension guide](docs/guides/module-extension.md).

---

## Commands

| Command              | Description                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`           | Start all apps (turbo)                                                                                              |
| `pnpm test`          | Run all test suites                                                                                                 |
| `pnpm typecheck`     | TypeScript check all packages                                                                                       |
| `pnpm lint`          | Lint all packages                                                                                                   |
| `pnpm emulators`     | Firebase emulators (auth, firestore)                                                                                |
| `pnpm seed:database` | Seed platform roles + `rates` tenant (manual; not on API startup). Partial: `-- --only <components> [--ids <id,…>]` |
| `pnpm storybook`     | UI component docs (`@repo/ui`)                                                                                      |
| `pnpm i18n:validate` | Validate translation keys                                                                                           |

---

## Apps

| App | README                                   |
| --- | ---------------------------------------- |
| API | [apps/api/README.md](apps/api/README.md) |
| Web | [apps/web/README.md](apps/web/README.md) |

### AI usage

All model calls (chat, UI Builder, data-hook `callAi` / embeddings, Gmail extract) go through a single `runAiRequest` controller in `@repo/ai-engine` and are persisted to `ai_jobs`. Each job records the model used, token/usage metadata, and a rough USD cost estimate. Inspect them at **`/debugger/ai-jobs`**. Platform Observability exposes the kill-switch (`aiEnabled` / `AI_ENABLED`) and prompt/output tracing (`aiTraceEnabled` / `AI_TRACE_ENABLED`).
