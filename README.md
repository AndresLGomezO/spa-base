<p align="center">
  <img src="apps/web/public/icons/icon-512.png" alt="ESP" width="72" height="72" />
</p>

<h1 align="center">Entity System (ESP)</h1>

<p align="center">
  <strong>The multi-tenant platform for building business apps without forking the core.</strong><br />
  Tenants define their own data models — and get APIs, UI, permissions, automation, and AI on top.
</p>

<!-- Status flags (live colors from GitHub / shields.io) -->
<p align="center">
  <a href="https://github.com/AndresLGomezO/spa-base/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/AndresLGomezO/spa-base/ci.yml?branch=main&style=for-the-badge&label=CI&logo=githubactions&logoColor=white" alt="CI status" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/AndresLGomezO/spa-base/deploy.yml&style=for-the-badge&label=Deploy&logo=googlecloud&logoColor=white" alt="Deploy status" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/actions/workflows/verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/AndresLGomezO/spa-base/verify.yml&style=for-the-badge&label=Terraform&logo=terraform&logoColor=white" alt="Terraform verify" /></a>
</p>
<p align="center">
  <a href="https://github.com/AndresLGomezO/spa-base/releases"><img src="https://img.shields.io/github/v/release/AndresLGomezO/spa-base?include_prereleases&sort=semver&display_name=tag&style=for-the-badge&label=Release&color=2ea44f&logo=github&logoColor=white" alt="Latest release" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/commits/main"><img src="https://img.shields.io/github/last-commit/AndresLGomezO/spa-base/main?style=for-the-badge&label=Last%20commit&color=2088FF&logo=git&logoColor=white" alt="Last commit" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/pulse"><img src="https://img.shields.io/github/commit-activity/m/AndresLGomezO/spa-base?style=for-the-badge&label=Commits%2Fmo&color=6f42c1&logo=github&logoColor=white" alt="Commit activity" /></a>
  <a href="https://github.com/AndresLGomezO/spa-base/issues"><img src="https://img.shields.io/github/issues/AndresLGomezO/spa-base?style=for-the-badge&label=Issues&color=d73a4a&logo=github&logoColor=white" alt="Open issues" /></a>
</p>

<!-- Environment flags -->
<p align="center">
  <a href="https://entitysystem-development.web.app"><img src="https://img.shields.io/badge/DEV-live-00a1e5?style=for-the-badge&logo=firebase&logoColor=white" alt="Development" /></a>
  <a href="https://entitysystem-staging.web.app"><img src="https://img.shields.io/badge/STAGING-live-f5a623?style=for-the-badge&logo=firebase&logoColor=white" alt="Staging" /></a>
  <a href="https://entitysystem-production.web.app"><img src="https://img.shields.io/badge/PROD-live-2ea44f?style=for-the-badge&logo=firebase&logoColor=white" alt="Production" /></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/LOCAL-localhost%3A5173-6e7681?style=for-the-badge&logo=vite&logoColor=white" alt="Local" /></a>
</p>

<!-- Stack -->
<p align="center">
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://firebase.google.com/"><img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" /></a>
  <a href="https://cloud.google.com/run"><img src="https://img.shields.io/badge/Cloud%20Run-4285F4?style=flat-square&logo=googlecloud&logoColor=white" alt="GCP" /></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turbo-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turbo" /></a>
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

Colored flags above turn **green / red / yellow** from live GitHub Actions and release metadata. Click any flag for the underlying run, release, or hosted app.

| Flag                                                                                                                                  | Opens                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| <img src="https://img.shields.io/badge/CI-workflow-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="CI" />           | [CI workflow runs](https://github.com/AndresLGomezO/spa-base/actions/workflows/ci.yml)                                                    |
| <img src="https://img.shields.io/badge/Deploy-GCP-4285F4?style=flat-square&logo=googlecloud&logoColor=white" alt="Deploy" />          | [Deploy workflow runs](https://github.com/AndresLGomezO/spa-base/actions/workflows/deploy.yml)                                            |
| <img src="https://img.shields.io/badge/Terraform-verify-7B42BC?style=flat-square&logo=terraform&logoColor=white" alt="Terraform" />   | [Verify workflow runs](https://github.com/AndresLGomezO/spa-base/actions/workflows/verify.yml)                                            |
| <img src="https://img.shields.io/badge/Release-tags-2ea44f?style=flat-square&logo=github&logoColor=white" alt="Release" />            | [Releases](https://github.com/AndresLGomezO/spa-base/releases) (`v*` → prod)                                                              |
| <img src="https://img.shields.io/badge/Deployments-history-6f42c1?style=flat-square&logo=github&logoColor=white" alt="Deployments" /> | [Environments & deploys](https://github.com/AndresLGomezO/spa-base/deployments)                                                           |
| <img src="https://img.shields.io/badge/Pulse-activity-d73a4a?style=flat-square&logo=github&logoColor=white" alt="Pulse" />            | [Repo pulse](https://github.com/AndresLGomezO/spa-base/pulse) · [Commits on main](https://github.com/AndresLGomezO/spa-base/commits/main) |

| Environment | Flag                                                                                      | Web                                                                          | Trigger                                 |
| ----------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Development | <img src="https://img.shields.io/badge/DEV-00a1e5?style=flat-square" alt="DEV" />         | [entitysystem-development.web.app](https://entitysystem-development.web.app) | `develop` / deploy workflow             |
| Staging     | <img src="https://img.shields.io/badge/STAGING-f5a623?style=flat-square" alt="STAGING" /> | [entitysystem-staging.web.app](https://entitysystem-staging.web.app)         | toward `main`                           |
| Production  | <img src="https://img.shields.io/badge/PROD-2ea44f?style=flat-square" alt="PROD" />       | [entitysystem-production.web.app](https://entitysystem-production.web.app)   | `v*` tags / prod deploy                 |
| Local       | <img src="https://img.shields.io/badge/LOCAL-6e7681?style=flat-square" alt="LOCAL" />     | `http://localhost:5173`                                                      | emulators + `pnpm --filter web/api dev` |

API Cloud Run URLs come from `terraform output` after deploy — see [per-environment](docs/infrastructure/per-environment.md).

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

## Stack

<p align="center">
  <img src="https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/React%20Router%207-CA4245?style=flat-square&logo=reactrouter&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/TanStack%20Query-FF4154?style=flat-square&logo=reactquery&logoColor=white" alt="TanStack Query" />
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Vertex%20AI-4285F4?style=flat-square&logo=googlecloud&logoColor=white" alt="Vertex AI" />
</p>

---

<p align="center">
  <sub>Built for teams shipping multi-tenant products on a single schema-driven core.</sub>
</p>
