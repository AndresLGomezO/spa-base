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
pnpm emulators          # Terminal 1: Auth + Firestore emulators
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

3. Copy `apps/web/.env.dev.example` → `apps/web/.env.dev` if customizing Firebase config

### Verify automated tests pass

```bash
pnpm test
pnpm typecheck
```

Expected: all turbo test tasks green (api ~69 tests, web ~52 tests, packages additional).

---

## 2. Create test tenant

**As superadmin:**

1. Sign in at `http://localhost:5173/login` (Google auth against emulator)
2. Navigate to `/settings/admin`
3. Create tenant: name e.g. `Validation Tenant`, note the generated `id` (e.g. `tenant_abc`)

**Alternative (Firestore seed):** Dev tenants `tenant_dev_1` and `tenant_dev_2` are seeded on API startup.

---

## 3. Assign user roles

**As superadmin at `/settings/admin`:**

1. Open user management
2. Assign your test user tenants and roles, e.g.:

```json
{
  "tenants": {
    "tenant_dev_1": ["admin"]
  }
}
```

3. Sign out and sign in, or use tenant switcher after selecting tenant

**Verify auth:**

```bash
# After selecting tenant in UI, GET /auth/validate should return permissions array
```

---

## 4. Define a dynamic entity (Model Builder)

**As tenant admin with `entityDefinition.create`:**

1. Select tenant at `/select-tenant` if needed
2. Open **Control Plane → Data Models** (`/settings/data-models`)
3. Create entity e.g. `loan`:
   - Label: `Loan`
   - Fields: `amount` (number, required), `status` (string)
   - Optional: relation field to `organization`
4. Save and confirm it appears in the definition list

**Verify API:**

```http
GET /api/entity-definitions
Authorization: Bearer <token>
X-Firebase-AppCheck: <token>
```

**Verify catalog:**

```http
GET /api/entities
```

Response should include `loan` alongside static entities (`organization`, `project`, `inventoryItem`).

---

## 5. Configure tenant role with field rules (optional Phase 2 check)

**At `/settings/roles`:**

1. Create custom role e.g. `loan_viewer`
2. Grant `loan.read` only
3. Add field rule: `amount` → read-only or hidden for a test role
4. Assign role to a second test user (via superadmin user PATCH)

---

## 6. Create automation hook (optional Phase 2 check)

**At `/settings/hooks`:**

1. Create hook: entity `loan`, event `beforeCreate`
2. Action: `updateField` — set `status` to `"pending"`
3. Save

---

## 7. CRUD via UI

Navigate to `/app/loan` (or your entity name).

| Step | Action | Expected |
|------|--------|----------|
| List | Open entity list | Table renders; filters debounced (~300ms) |
| Create | `/app/loan/new` | Form from schema; submit creates record |
| Read | Click record or `/app/loan/:id` | Detail/edit form loads |
| Update | Change field, save | Record updated; `updatedAt` changes |
| Delete | Delete (if permitted) | Record removed |
| Hook | Create with hook configured | `status` auto-set to `pending` |

**Query filters (optional):**

Use table filter inputs or API directly:

```http
GET /api/loan?query={"filter":[{"field":"status","operator":"==","value":"pending"}],"pagination":{"limit":20}}
```

---

## 8. Validate permissions

Use three role scenarios (different users or reassign roles between runs):

### Viewer (`viewer` or custom read-only)

| Action | Expected |
|--------|----------|
| List `/app/organization` | 200, data visible |
| Create `/app/organization/new` | Forbidden UI or 403 on submit |
| Edit existing | Forbidden or read-only fields |
| Delete | No delete action |

### Editor (`editor`)

| Action | Expected |
|--------|----------|
| Create | Allowed |
| Update | Allowed |
| Delete | Forbidden (403) |

### Admin (`admin`)

| Action | Expected |
|--------|----------|
| Full CRUD | All operations allowed |
| Control Plane | Visible when admin permissions present |

### Tenant isolation

1. Create record in `tenant_dev_1`
2. Switch to `tenant_dev_2`
3. List same entity — record from tenant A must **not** appear
4. Direct GET by ID from tenant B — **404**

---

## 9. Optional extension checks

### Module route

```http
GET /api/modules/inventory/summary
```

Requires `inventoryItem.read` and returns module-specific payload.

### Static relation entity

1. Create `organization`
2. Create `project` referencing `organizationId`
3. Filter projects by organization via query JSON

### Performance smoke

- Repeat list requests — TanStack Query should cache (no duplicate network spam within staleTime)
- Scroll long entity list — virtualized rows (DOM node count << item count)

---

## 10. Pass / fail criteria

### Phase 1 (all required)

- [ ] New entity definable without code deploy (Model Builder)
- [ ] CRUD works for static and dynamic entities without new routes
- [ ] Permissions enforced on API (403/404) and UI (hidden actions)
- [ ] UI reflects field-level rules when configured
- [ ] Tenant data isolation verified
- [ ] Role change affects next request (allow up to 60s cache TTL for user profile)

### Phase 2 (recommended)

- [ ] Control Plane accessible to tenant admins
- [ ] Hooks fire on configured lifecycle event
- [ ] Query engine filters/sorts paginated lists
- [ ] Module entity (`inventoryItem`) in catalog and CRUD works
- [ ] Relation FK validated on create (invalid org → 400)

---

## 11. Troubleshooting

| Symptom | Check |
|---------|-------|
| 401 on API | Bearer token + App Check header |
| 403 TENANT_NOT_RESOLVED | Select tenant or set `tenantId` claim |
| 403 FORBIDDEN | User lacks role for tenant |
| 400 on list in tests | Add `?limit=10` when `STRICT_QUERY_PAGINATION=true` |
| Entity not in nav | User needs `{entity}.read`; refresh catalog |
| Emulator connection | `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` in API env |

See [apps/api/README.md](../apps/api/README.md) and [phase-2-platform-handoff.md](./phase-2-platform-handoff.md) §9.
