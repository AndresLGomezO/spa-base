# project-base

Multi-tenant ecosystem builder: schema-driven entities, auto-generated CRUD APIs, RBAC, dynamic UI, modules, and hooks.

**Phase 1 (engine):** complete — entity system, DAL, CRUD generator, RBAC, entity UI, routing, basic admin.  
**Phase 2 (ecosystem):** v1 delivered — query engine, relations, UI builder, modules, hooks, advanced RBAC, admin control plane, performance Phase A, dynamic entity builder.

---

## Documentation

**Start here for handoff to the next team:**

| Document                                                             | Description                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| [docs/phase-2-platform-handoff.md](docs/phase-2-platform-handoff.md) | Master handoff — architecture, capabilities, API summary |
| [docs/e2e-validation-runbook.md](docs/e2e-validation-runbook.md)     | Manual validation steps                                  |
| [docs/next-phase-backlog.md](docs/next-phase-backlog.md)             | Prioritized deferred work                                |
| [docs/codebase-map.md](docs/codebase-map.md)                         | Annotated file index                                     |
| [docs/README.md](docs/README.md)                                     | Full documentation index                                 |

---

## Quick start

```bash
pnpm install
pnpm emulators          # Firebase Auth + Firestore emulators
pnpm --filter api dev     # API :3000
pnpm --filter web dev     # Web :5173
```

Or run everything in Docker: `pnpm dev:docker`

Set `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com` in `apps/api/.env.dev` to bootstrap superadmin on first login.

---

## Monorepo structure

```
apps/
  api/        Fastify HTTP API
  web/        React Router 7 SPA
  platform/   Shared module bootstrap config
modules/
  core/       organization, project entities
  inventory/  Sample extension module
packages/     Shared libraries (@repo/*)
docs/         Guides and handoff documentation
```

Seed entities: `organization`, `project` (core), `inventoryItem` (inventory). Tenants can add dynamic entities via the Model Builder UI.

---

## Commands

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Start all apps (turbo)               |
| `pnpm test`          | Run all test suites                  |
| `pnpm typecheck`     | TypeScript check all packages        |
| `pnpm lint`          | Lint all packages                    |
| `pnpm emulators`     | Firebase emulators (auth, firestore) |
| `pnpm storybook`     | UI component docs (`@repo/ui`)       |
| `pnpm i18n:validate` | Validate translation keys            |

---

## Apps

| App | README                                   |
| --- | ---------------------------------------- |
| API | [apps/api/README.md](apps/api/README.md) |
| Web | [apps/web/README.md](apps/web/README.md) |

---

## Ecosystem plan

Original specs: [Ecosystem Plan/v2/General Definitions.md](Ecosystem%20Plan/v2/General%20Definitions.md)
