# Entity System - ESP

Multi-tenant ecosystem builder: schema-driven entities, auto-generated CRUD APIs, RBAC, dynamic UI, optional modules, and hooks.

**Phase 1 (engine):** complete — entity system, DAL, CRUD generator, RBAC, entity UI, routing, basic admin.  
**Phase 2 (ecosystem):** v1 delivered — query engine, relations, UI builder, modules framework, hooks, advanced RBAC, admin control plane, performance Phase A, dynamic entity builder.

---

## Documentation

**Start here for handoff to the next team:**

| Document                                                                                             | Description                                              |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [docs/phase-2-platform-handoff.md](docs/phase-2-platform-handoff.md)                                 | Master handoff — architecture, capabilities, API summary |
| [docs/master-plans.md](docs/master-plans.md)                                                         | Phase 1 + 2 master plans mapped to the codebase          |
| [docs/e2e-validation-runbook.md](docs/e2e-validation-runbook.md)                                     | Manual validation steps                                  |
| [docs/next-phase-backlog.md](docs/next-phase-backlog.md)                                             | **Next steps** — prioritized deferred work (P0–P2)       |
| [docs/codebase-map.md](docs/codebase-map.md)                                                         | Annotated file index                                     |
| [docs/README.md](docs/README.md)                                                                     | Full documentation index                                 |
| [docs/infrastructure/bootstrap-new-gcp-account.md](docs/infrastructure/bootstrap-new-gcp-account.md) | **GCP deploy** — new account, WIF, first release         |
| [docs/theme-and-tenant-branding-guide.md](docs/theme-and-tenant-branding-guide.md)                   | Theme tokens, tenant Appearance, `@repo/theme` usage     |

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
docs/         Guides and handoff documentation
```

**Entity strategy:** Bootstrap ships with **no compile-time modules** ([`apps/platform/app.config.ts`](apps/platform/app.config.ts)). Tenants create data models via **Settings → Data Model Builder** (`/settings/data-models`). Optional extension modules can be added under a top-level `modules/` folder — see [module-extension-guide.md](docs/module-extension-guide.md).

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

---

## Master plans (source specs)

| Plan                  | Document                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Phase 1 + 2 vision    | [Ecosystem Plan/v2/General Definitions.md](Ecosystem%20Plan/v2/General%20Definitions.md) |
| Phase 1 execution log | [Ecosystem Plan/v3/Master Plan.md](Ecosystem%20Plan/v3/Master%20Plan.md)                 |
| Mapped to codebase    | [docs/master-plans.md](docs/master-plans.md)                                             |

**Next implementation phase:** [docs/next-phase-backlog.md](docs/next-phase-backlog.md)
