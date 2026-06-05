# Firestore Doc Manager

Two CLI tools for working with project data:

1. **`pnpm firestore:doc`** — raw Firestore reads/writes (ADC / gcloud user)
2. **`pnpm entity:api`** — authenticated HTTP calls to the API (same payloads as the browser)

---

## Raw Firestore (`pnpm firestore:doc`)

Lightweight CLI for reading and writing Firestore documents against any GCP project. Uses Application Default Credentials from your logged-in gcloud user — no service account JSON required.

## Auth

Authenticate once before using against real GCP:

```bash
gcloud auth application-default login
gcloud config set project entitysystem-development   # optional convenience
```

For the local emulator, set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (and other emulator env vars as needed). No credentials required.

## Usage

From the repo root:

```bash
pnpm firestore:doc <get|set|patch|delete|list> [flags]
```

### Shared flags

| Flag | Env fallback | Notes |
|------|--------------|-------|
| `--project` | `GCP_PROJECT_ID` | Required (one of) |
| `--tenant` | — | With `--collection` → `tenants/{tenant}/{collection}` |
| `--collection` | — | Top-level or tenant-scoped collection name |
| `--path` | — | Full Firestore path (alternative to tenant/collection) |
| `--id` | — | Document ID (required for single-doc ops in tenant/collection mode) |
| `--file` | — | JSON file input (`set`, `patch`) |
| `--out` | — | Write JSON output to file (`get`, `list`) |
| `--limit` | — | Max docs for `list` (default: 50) |
| `--dry-run` | — | Print action without writing (`set`, `patch`, `delete`) |
| `--confirm` | — | Required for `delete` |
| `--pretty` / `--no-pretty` | — | Pretty-print stdout JSON (default: pretty) |

Use either `--path` or `--tenant`/`--collection`, not both.

### Examples

**Get** a tenant-scoped document:

```bash
pnpm firestore:doc get --project entitysystem-development \
  --tenant rates_dev --collection entity_definitions --id contract
```

**Get** via arbitrary path and save to file:

```bash
pnpm firestore:doc get --project entitysystem-development \
  --path users/abc123 --out ./backup/user.json
```

**Set** (create or full replace) from JSON:

```bash
pnpm firestore:doc set --project entitysystem-development \
  --tenant rates_dev --collection entity_ui_overrides --id contract \
  --file ./data/contract-ui.json
```

**Patch** (merge fields) from JSON:

```bash
pnpm firestore:doc patch --project entitysystem-development \
  --path tenants/rates_dev/entity_definitions/contract \
  --file ./patch.json
```

**List** documents in a collection:

```bash
pnpm firestore:doc list --project entitysystem-development \
  --tenant rates_dev --collection hooks --limit 20
```

**Delete** a document (requires `--confirm`):

```bash
pnpm firestore:doc delete --project entitysystem-development \
  --tenant rates_dev --collection entity_definitions --id old_doc --confirm
```

**Dry-run** a write:

```bash
pnpm firestore:doc set --project entitysystem-development \
  --collection users --id test-user --file ./user.json --dry-run
```

## Path rules

- **Tenant mode:** `--tenant rates_dev --collection entity_definitions --id contract` → `tenants/rates_dev/entity_definitions/contract`
- **Top-level:** `--collection users --id abc123` → `users/abc123`
- **Arbitrary path:** `--path tenants/rates_dev/hooks/hook1` → used as-is

For `list`, provide a collection path (odd number of segments). For single-doc commands, provide a document path (even number of segments) or use `--id`.

## Notes

- Operates on raw JSON — no schema validation or repository converters.
- Firestore `Timestamp` and `GeoPoint` values are serialized to ISO strings / plain objects on read.
- `delete` is blocked without `--confirm` (or `--dry-run`).

---

## Entity API (`pnpm entity:api`)

Calls the running backend the same way the browser does — validation, hooks, converters, aggregation events, and RBAC all run server-side. Use this when you want entity form-equivalent payloads (business fields only), not raw Firestore documents.

### Auth

The API requires both a Firebase ID token and an App Check token. Provide them via flags/env vars, or extract from a captured browser curl:

```bash
export API_ID_TOKEN="eyJ..."           # Bearer token from browser devtools
export API_APP_CHECK_TOKEN="eyJ..."    # X-Firebase-AppCheck header value

# Or use a captured curl file (see data/emulator/tenants/rates/CURL with error.js)
pnpm entity:api record get --entity contract --id abc --curl-file ./captured.curl
```

Tenant context comes from the JWT `tenantId` claim — select a tenant in the app before copying tokens.

### Usage

```bash
pnpm entity:api <record|definition|ui-override> <action> [flags]
```

### Shared flags

| Flag | Env fallback | Notes |
|------|--------------|-------|
| `--base-url` | `API_BASE_URL` | Default `http://127.0.0.1:3000` |
| `--token` | `API_ID_TOKEN` | Firebase ID token |
| `--app-check` | `API_APP_CHECK_TOKEN` | App Check token |
| `--curl-file` | — | Extract auth headers from captured curl |
| `--entity` | — | Entity name (`record`, `ui-override`) |
| `--id` | — | Record or definition ID |
| `--file` | — | JSON request body |
| `--relations-file` | — | Join-relation sync (`record` create/update) |
| `--out` | — | Write response JSON to file |
| `--limit` | — | Max items for `record list` |
| `--dry-run` | — | Print request, no HTTP call |
| `--confirm` | — | Required for `record delete` |
| `--pretty` / `--no-pretty` | — | Pretty-print stdout JSON |

### Resources

| Resource | Actions | API route |
|----------|---------|-----------|
| `record` | `create`, `update`, `get`, `delete`, `list` | `/api/{entity}` |
| `definition` | `list`, `get`, `create`, `patch` | `/api/entity-definitions` |
| `ui-override` | `get`, `put` | `/api/entities/{entity}/ui-override` |

### Record (entity form equivalent)

JSON file should contain **business fields only** (no `id`, `tenantId`, timestamps). Combined format is also supported:

```json
{
  "document": { "name": "Acme", "status": "ACTIVE" },
  "relations": { "tagIds": ["id1", "id2"] }
}
```

```bash
# Create (like submitting an entity form)
pnpm entity:api record create --entity contract \
  --file ./payloads/contract-create.json \
  --token "$API_ID_TOKEN" --app-check "$API_APP_CHECK_TOKEN"

# Update + sync join relations
pnpm entity:api record update --entity contract --id abc123 \
  --file ./payloads/contract-update.json \
  --relations-file ./payloads/contract-relations.json \
  --curl-file ./captured.curl

# Get / list / delete
pnpm entity:api record get --entity contract --id abc123 --curl-file ./captured.curl
pnpm entity:api record list --entity contract --limit 10 --curl-file ./captured.curl
pnpm entity:api record delete --entity contract --id old_doc --confirm --curl-file ./captured.curl
```

### Entity definitions

```bash
pnpm entity:api definition list --curl-file ./captured.curl
pnpm entity:api definition get --id contract --curl-file ./captured.curl
pnpm entity:api definition create --file ./definition-create.json --curl-file ./captured.curl
pnpm entity:api definition patch --id contract --file ./definition-patch.json --curl-file ./captured.curl
```

### UI overrides

```bash
pnpm entity:api ui-override get --entity contract --curl-file ./captured.curl
pnpm entity:api ui-override put --entity contract \
  --file ./payloads/contract-ui.json \
  --base-url https://es-backend-service-dev-....run.app \
  --curl-file "./data/emulator/tenants/rates/CURL with error.js"
```

### API vs raw Firestore

| | `entity:api` | `firestore:doc` |
|--|--------------|-----------------|
| Validation | Server-side Zod + RBAC | None |
| Payload shape | Business fields (form) | Full Firestore document |
| Side effects | Hooks, aggregation, relations | None |
| Auth | Firebase ID token + App Check | gcloud ADC |
