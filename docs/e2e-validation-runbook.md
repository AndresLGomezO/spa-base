# E2E Validation Runbook

Reproducible validation for Phase 1 criteria ([General Definitions §7](../Ecosystem%20Plan/v2/General%20Definitions.md)) and Phase 2 outcomes (§11). Use this after setup or before handing off to the next team.

**Related:** [phase-2-platform-handoff.md](./phase-2-platform-handoff.md)

---

## 1. Prerequisites

### Software

- Node.js + pnpm (see root `package.json` for version)
- Firebase CLI (for emulators)

### Start services

```bash
pnpm install
pnpm emulators          # Terminal 1: Auth + Firestore + Storage emulators
pnpm --filter api dev   # Terminal 2: API :3000
pnpm --filter web dev   # Terminal 3: Web :5173
```

Or: `pnpm dev:docker` for all three.

### Environment

1. Copy `apps/api/.env.dev.example` → `apps/api/.env.dev` if needed
2. Set superadmin bootstrap (recommended):

```
PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=your-email@example.com
```

3. Copy `apps/web/.env.development.example` → `apps/web/.env.development` for emulator Auth (optional)
4. For native dev (host-only), set in `apps/api/.env.dev`:
   - `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`
   - `GCP_STORAGE_BUCKET=demo-project-base.appspot.com`

See [gcs-storage-guide.md](./gcs-storage-guide.md) for Storage emulator and production setup.

### Verify automated tests pass

```bash
pnpm test
pnpm typecheck
```

---

## 2. Create test tenant

**As superadmin:**

1. Sign in at `http://localhost:5173/login` (Google auth against emulator)
2. Open the tenant switcher → **Create tenant**, or use **Create new tenant** on `/select-tenant` (legacy `/platform/create-tenant` also opens the modal)
3. Create tenant: name e.g. `Validation Tenant`, note the generated `id` (e.g. `tenant_abc`)

**Alternative (Firestore seed):** Dev tenant `rates` is seeded on API startup. Sign in as `testuser1@rates.com` / `RatesTest1!` (Auth emulator) for a pre-provisioned `normalRatesUser` with 12+ records per business model. Other users can get the same role via `"tenants": { "rates": ["normalRatesUser"] }` on `users/{uid}`.

---

## 3. Assign user roles

**As tenant admin at Settings → User Management (`/settings/users`):**

1. Add user by email with roles, e.g. `editor@example.com` → `editor`
2. Pending invites apply on first sign-in

**As superadmin:** switch tenant via the sidebar switcher, then manage users at `/settings/users` for that tenant.

**Verify auth:**

After selecting a tenant, `GET /auth/validate` should return `permissions`, `tenantRoleNames`, and `tenantId`.

---

## 3a. Superadmin tenant context

| Surface | Behavior |
| --- | --- |
| **JWT claim** | Primary tenant for RBAC, settings, and CRUD |
| **Settings pages** | Same UI as tenant admin — no cross-tenant scope picker |
| **Platform routes** | `/settings/tenant`, `/settings/appearance` — manage active tenant only |
| **Create tenant modal** | From tenant switcher or `/select-tenant`; legacy `/platform/create-tenant` redirects and opens modal |
| **`/select-tenant`** | Superadmin only — pick active tenant when JWT has no `tenantId` |
| **`/app/:entity`** | Requires tenant JWT claim (superadmin selects first; members auto-bind) |

Tenant members auto-bind their first available tenant on login and cannot switch tenants. Tenant name appears in the account profile popover.

---

## 4. Sidebar navigation

**Fresh tenant with no dynamic models:**

- **Home** (`/`) — welcome page
- **Data Models** group — empty until Model Builder creates an entity
- **Settings** — User Management, Roles & Permissions, Data Model Builder, Automation
- **Platform** (superadmin only) — Current Tenant, Appearance

There are no static demo entity links (customer, organization, project, inventory).

---

## 5. Define a dynamic entity (Model Builder)

**As tenant admin with `entityDefinition.create`:**

1. Select tenant at `/select-tenant` if needed
2. Open **Settings → Data Model Builder** (`/settings/data-models`)
3. Create entity e.g. `loan`:
   - Label: `Loan`
   - Fields: `amount` (number, required), `status` (string)
4. Save and confirm it appears in the definition list and under **Data Models** in the sidebar (`/app/loan`)

**Verify API:**

```http
GET /api/entity-definitions
GET /api/entities
```

Response should include `loan` as a dynamic entity with fields and permissions.

### Batch / workItem relation workflow (recommended)

Use this to validate one-to-many and many-to-one together:

1. Create **`workItem`** model first (`title` string, required)
2. Create **`batch`** model (`name` string, required); optionally add `workItems` one-to-many → `workItem` (metadata only on batch records)
3. Edit **`workItem`**; add `batchId` many-to-one → `batch`
4. Create a **batch** record, then create or edit a **workItem** record and pick the batch in `batchId`
5. In Firestore, confirm `batchId` on the workItem document — **not** `workItems` on the batch document

| Concept | Where | Meaning |
| --- | --- | --- |
| Definition `version: 2` | `entity_definitions` doc | Schema was edited once in Data Models |
| Record `_schemaVersion: 1` | e.g. `batches/{id}`, `workItems/{id}` | Firestore converter format version (expected to stay `1` until platform migrations) |

After editing a model schema, open entity list/create forms (`/app/{entity}`) so the catalog refreshes and new fields appear in forms.

---

## 6. Configure tenant role with field rules

**At `/settings/roles`:**

1. Create custom role e.g. `loan_viewer`
2. Grant `loan.read` only
3. Add field rule: `amount` → read-only or hidden for a test role
4. Assign role via **Settings → User Management**

---

## 7. Create automation hook

**At `/settings/hooks`:**

1. Create hook: entity `loan`, event `beforeCreate`
2. Add action (e.g. update field stub)
3. Save and confirm hook appears in list

---

## 8. RBAC smoke checks

| Action | Expected |
| --- | --- |
| Viewer opens `/settings/data-models` | Forbidden or read-only UI |
| Admin opens `/settings/users` | Can invite and edit roles |
| Non-superadmin opens `/settings/tenant` | Forbidden |
| Profile menu | Shows assigned tenant roles (not generic "Member") |

---

## 9. Profile roles

Open the account menu in the sidebar. Confirm:

- Tenant admins see assigned role names (e.g. `admin`, `editor`)
- Superadmins see `Platform Superadmin` plus tenant roles when a tenant is active
- Empty access shows `No role`

---

## 10. Appearance and tenant branding (superadmin)

**At `/settings/appearance`:**

See [theme-and-tenant-branding-guide.md](./theme-and-tenant-branding-guide.md) for the full token model.

### Logo

1. Upload a logo image (PNG, WebP, SVG, or JPG)
2. Confirm success message and preview update
3. Sidebar shows the logo on reload
4. Firestore tenant doc has `appearance.logoUrl` (emulator: `http://127.0.0.1:9199/...`; production: `https://storage.googleapis.com/...`)

Requires Storage emulator in local dev (`FIREBASE_STORAGE_EMULATOR_HOST`). See [gcs-storage-guide.md](./gcs-storage-guide.md).

### Theme preset and palettes

1. Select a named preset (e.g. **Soft**, **Elegant**, **Frutiger Aero**) — primary/neutral editors populate; preview panel updates
2. Change primary anchor color — preview **Primary button** and preview card background shift (semantic chain, not sidebar-only)
3. Save appearance → reload app — branding persists on `:root` via `TenantBrandingProvider`
4. Firestore `appearance` includes `preset`, `palettes`, and/or `semantics` as saved

### Advanced semantics (optional)

1. Expand **Advanced semantics** — set e.g. `--color-card` to a custom hex
2. Confirm preview panel reflects override before save

### Dark mode

1. Toggle theme (sidebar) to dark — surfaces use `dark.css` semantic remaps; tenant scale overrides still apply

**Layout:** The appearance form is long — confirm only the main content area scrolls (sidebar stays fixed). See scroll-contained layout in [phase-2-platform-handoff.md §8](./phase-2-platform-handoff.md).

---

## 11. Automated Cypress (optional)

```bash
pnpm --filter web cypress:run
```

Specs cover auth redirects, navigation guards, and platform admin route protection.
