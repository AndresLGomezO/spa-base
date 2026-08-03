<p align="center">
  <img src="apps/web/public/icons/icon-512.png" alt="ESP" width="72" height="72" />
</p>

<h1 align="center">Entity System (ESP)</h1>

<p align="center">
  <strong>The multi-tenant platform for building business apps without forking the core.</strong><br />
  Tenants define their own data models — and get APIs, UI, permissions, automation, and AI on top.
</p>

<!-- Compact status (native GitHub workflow badges + shields). Keep flat-square — for-the-badge is oversized. -->
<p align="center">
  <a href="https://github.com/AndresLGomezO/spa-base/actions/workflows/ci.yml"><img src="https://github.com/AndresLGomezO/spa-base/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" height="20" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/actions/workflows/deploy.yml"><img src="https://github.com/AndresLGomezO/spa-base/actions/workflows/deploy.yml/badge.svg" alt="Deploy" height="20" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/actions/workflows/verify.yml"><img src="https://github.com/AndresLGomezO/spa-base/actions/workflows/verify.yml/badge.svg" alt="Terraform verify" height="20" /></a>
  &nbsp;
  <a href="https://github.com/AndresLGomezO/spa-base/releases"><img src="https://img.shields.io/badge/releases-v%20tags-2ea44f?style=flat-square&logo=github&logoColor=white" alt="Releases" height="20" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/commits"><img src="https://img.shields.io/github/last-commit/AndresLGomezO/spa-base?style=flat-square&label=last%20commit&color=2088FF" alt="Last commit" height="20" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/pulse"><img src="https://img.shields.io/github/commit-activity/m/AndresLGomezO/spa-base?style=flat-square&label=commits%2Fmo&color=6f42c1" alt="Commit activity" height="20" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/issues"><img src="https://img.shields.io/github/issues/AndresLGomezO/spa-base?style=flat-square&label=issues&color=d73a4a" alt="Open issues" height="20" /></a>
</p>

<p align="center">
  <a href="https://entitysystem-development.web.app"><img src="https://img.shields.io/badge/dev-live-00a1e5?style=flat-square&logo=firebase&logoColor=white" alt="Development" height="20" /></a>
  <a href="https://entitysystem-staging.web.app"><img src="https://img.shields.io/badge/staging-live-f5a623?style=flat-square&logo=firebase&logoColor=white" alt="Staging" height="20" /></a>
  <a href="https://entitysystem-production.web.app"><img src="https://img.shields.io/badge/prod-live-2ea44f?style=flat-square&logo=firebase&logoColor=white" alt="Production" height="20" /></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/local-5173-6e7681?style=flat-square&logo=vite&logoColor=white" alt="Local" height="20" /></a>
</p>

<p align="center">
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" height="20" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" height="20" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" height="20" /></a>
  <a href="https://firebase.google.com/"><img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" height="20" /></a>
  <a href="https://cloud.google.com/run"><img src="https://img.shields.io/badge/GCP-4285F4?style=flat-square&logo=googlecloud&logoColor=white" alt="GCP" height="20" /></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" height="20" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turbo-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turbo" height="20" /></a>
</p>

<p align="center">
  <a href="#status--environments">Status</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#built-for-tenants">Tenants</a> ·
  <a href="#capabilities">Capabilities</a> ·
  <a href="#documentation">Docs</a> ·
  <a href="apps/web/README.md">Web</a> ·
  <a href="apps/api/README.md">API</a> ·
  <a href="docs/ai-platform/README.md">AI</a>
</p>

<p align="center">
  <img src="docs/assets/esp-hero.jpg" alt="ESP — multi-tenant schema-driven platform" width="100%" />
</p>

---

## Status & environments

Workflow badges above are live (pass/fail). Env chips link to Hosting; API URLs come from `terraform output` — [per-environment](docs/infrastructure/per-environment.md).

|           |                                                                                                                                                                                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflows | [CI](https://github.com/AndresLGomezO/spa-base/actions/workflows/ci.yml) · [Deploy](https://github.com/AndresLGomezO/spa-base/actions/workflows/deploy.yml) · [Terraform](https://github.com/AndresLGomezO/spa-base/actions/workflows/verify.yml) · [All Actions](https://github.com/AndresLGomezO/spa-base/actions) |
| Ship      | [Deployments](https://github.com/AndresLGomezO/spa-base/deployments) · [Releases / `v*` tags](https://github.com/AndresLGomezO/spa-base/releases) · [Pulse](https://github.com/AndresLGomezO/spa-base/pulse)                                                                                                         |
| Web       | [dev](https://entitysystem-development.web.app) · [staging](https://entitysystem-staging.web.app) · [prod](https://entitysystem-production.web.app) · local `http://localhost:5173`                                                                                                                                  |

---

## Why ESP?

Most SaaS codebases bake one product’s schema into the stack. ESP flips that: **the schema is data**. Each tenant designs entities, fields, and views in the Control Plane — the platform generates the rest.

| Without ESP                                   | With ESP                                   |
| --------------------------------------------- | ------------------------------------------ |
| New feature → new migrations, routes, screens | New model → catalog, CRUD, and UI appear   |
| Permissions bolted on later                   | Roles and field access from day one        |
| One UI look for every customer                | Per-tenant branding and layouts            |
| AI sprinkled as one-offs                      | Shared AI jobs, spend limits, and surfaces |

---

## Built for tenants

ESP is tenant-first by design:

1. **Onboard a tenant** — Isolated data plane under `tenants/{tenantId}/…`
2. **Model the domain** — Settings → **Data Model Builder** (`/settings/data-models`)
3. **Ship the experience** — Lists, forms, relations, metrics, and automation follow the catalog
4. **Brand it** — Appearance tokens and layouts per tenant
5. **Extend when needed** — Optional compile-time modules for product-specific logic ([guide](docs/guides/module-extension.md))

Default bootstrap ships with **no compile-time business modules** — tenants own their schema.

---

## Capabilities

<table>
  <tr>
    <td width="50%">
      <h3>Data & APIs</h3>
      Schema-driven entities, auto-generated CRUD, relations, and a query engine with RBAC baked in.
    </td>
    <td width="50%">
      <h3>Security</h3>
      Tenant isolation, ownership & sharing, role permissions, and field-level access control.
    </td>
  </tr>
  <tr>
    <td>
      <h3>UI & branding</h3>
      Configurable lists, forms, and dashboards — plus Appearance for logos, colors, and theme.
    </td>
    <td>
      <h3>Insights</h3>
      Event-driven aggregations and deterministic metrics reads for KPIs and series widgets.
    </td>
  </tr>
  <tr>
    <td>
      <h3>Automation</h3>
      Lifecycle hooks and tenant-authored data hooks — conditions, actions, no fork required.
    </td>
    <td>
      <h3>AI</h3>
      Grounded chat, UI builder assist, and hook-time AI — one controller, spend guards, job history.
    </td>
  </tr>
</table>

---

## Quick start

**Prerequisites:** Node.js 22+, [pnpm](https://pnpm.io) 10+, Docker (optional).

```bash
pnpm install
pnpm emulators            # Firebase Auth + Firestore (+ storage, pubsub)
pnpm --filter api dev     # API  → http://localhost:3000
pnpm --filter web dev     # Web  → http://localhost:5173
```

**All-in-one Docker**

```bash
pnpm dev:docker
pnpm seed:database
```

Tip: set `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com` in `apps/api/.env.dev` so your first login is a platform superadmin.

---

## Repository layout

```text
apps/
  api/                   HTTP API (Fastify)
  web/                   Control Plane + tenant app (React Router)
  platform/              Shared bootstrap
  worker-service/        AI & async tasks
  worker-aggregation/    Metrics pipeline
  worker-indexer/        Firestore indexes
packages/                Shared libraries (@repo/*)
docs/                    Guides & references
```

---

## Documentation

| Start here                                                          |                                   |
| ------------------------------------------------------------------- | --------------------------------- |
| [Documentation index](docs/README.md)                               | Guides, contracts, infrastructure |
| [Codebase map](docs/guides/codebase-map.md)                         | Where to change what              |
| [GCP bootstrap](docs/infrastructure/bootstrap-new-gcp-account.md)   | New account → first deploy        |
| [AI platform](docs/ai-platform/README.md)                           | Chat, jobs, workers, spend        |
| [UI Design Manual](docs/ui-design-manual/README.md)                 | Layout JSON for designers         |
| [API README](apps/api/README.md) · [Web README](apps/web/README.md) | App-level contracts               |

---

## Common commands

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `pnpm dev`           | Start apps (Turbo)              |
| `pnpm test`          | Run test suites                 |
| `pnpm typecheck`     | TypeScript across the monorepo  |
| `pnpm lint`          | Lint                            |
| `pnpm emulators`     | Firebase emulators              |
| `pnpm seed:database` | Seed roles + sample tenant      |
| `pnpm storybook`     | Component workshop (`@repo/ui`) |

---

<p align="center">
  <sub>Built for teams shipping multi-tenant products on a single schema-driven core.</sub>
</p>
