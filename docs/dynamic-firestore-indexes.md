# Dynamic Firestore index provisioning

## Problem

Firestore requires composite indexes to exist **before** queries run. This platform allows:

- Dynamic entity definitions (Model Builder)
- Relations between entities
- Immediate list/query after creation

Every ownership-scoped list query includes `accessUserIds array-contains` (see [`ownership-query-injector.ts`](../apps/api/src/access/ownership-query-injector.ts)) and defaults to `orderBy id` (see [`parse-query-config.ts`](../packages/query-engine/src/parse-query-config.ts)). That combination requires a composite index per collection—not only entities with relations.

## Architecture

```mermaid
flowchart TB
  UI[apps/web]
  ModelAPI["POST/PATCH entity definition"]
  SyncDef["syncDefinition"]
  Spec["@repo/firestore-indexes indexesForEntity"]
  Prov["gcp-firebase provisioner"]
  Status["__index_status store"]
  FSAdmin[Firestore Admin API]
  ListAPI["GET entity list"]

  UI --> ModelAPI --> SyncDef --> Spec --> Prov --> Status --> FSAdmin
  UI --> ListAPI
  ListAPI --> Status
```

### Monorepo map

| Concern | Location |
| -------- | -------- |
| Index specs | [`packages/firestore-indexes`](../packages/firestore-indexes) |
| Entity metadata / FK detection | [`packages/entities`](../packages/entities), [`packages/dynamic-entities`](../packages/dynamic-entities) |
| Runtime `createIndex` | [`packages/gcp-firebase/src/firestore-index-provisioner.ts`](../packages/gcp-firebase/src/firestore-index-provisioner.ts) |
| Index status | [`packages/gcp-firebase/src/firestore-index-status.ts`](../packages/gcp-firebase/src/firestore-index-status.ts) |
| API wiring | [`apps/api/src/entities/entity-runtime-context.ts`](../apps/api/src/entities/entity-runtime-context.ts), [`apps/api/src/server.ts`](../apps/api/src/server.ts) |
| Index routes / guard | [`apps/api/src/indexes/`](../apps/api/src/indexes/) |
| Async worker (optional) | [`apps/worker-indexer`](../apps/worker-indexer) |
| IaC indexes | [`firestore.indexes.json`](../firestore.indexes.json), [`packages/infrastructure/terraform/firestore.tf`](../packages/infrastructure/terraform/firestore.tf) |
| Generator | [`scripts/generate-firestore-indexes.ts`](../scripts/generate-firestore-indexes.ts) |

The query engine is intentionally **not** modified for index provisioning; see [Advanced Query Engine workstream](../Ecosystem%20Plan/Phase%202/workstream/3.%20ADVANCED%20QUERY%20ENGINE.md).

## When indexes are provisioned

Runtime `createIndex` runs **only** when an entity model is created or updated:

- [`syncDefinition`](apps/api/src/entities/entity-runtime-context.ts) on POST/PATCH entity definitions
- [`reconcileIndexesForDefinitionChange`](packages/gcp-firebase/src/firestore-index-reconciler.ts) on PATCH (add new indexes, delete orphans tenant-safely)

It does **not** run on list filter/sort, record create, tenant definition cache reload, or API boot.

Missing-index errors on list still return `COMPOSITE_INDEX_REQUIRED` with a Firebase console link; the API logs the hint but does **not** call `createIndex` reactively. Use `POST /api/indexes/provision` for manual recovery.

## Index catalog (current)

[`indexesForEntity`](packages/firestore-indexes/src/build-indexes.ts) builds a predictive set from entity UI metadata:

For each non-`tenantWideRead` entity collection:

1. **Baseline list**: `accessUserIds` (CONTAINS) + `id` (ASC)
2. **FK list** (per foreign-key relation field): `accessUserIds` + `{fk}` + `id`
3. **findByField** (relation validation): `{fk}` + `id` (no ownership filter)
4. **Sort-only** (per sortable field × asc/desc): ownership + sort field + `id` tiebreaker
5. **Filter + sort** (full cartesian: each filterable × each sortable × asc/desc): ownership + equality filter + sort + `id` when needed

Sortable/filterable fields come from `ui.fields` (`filterable` / `sortable` default true in Model Builder), view `defaultSort`, and view `filters`. Non-queryable types (encrypted, image, document, non-FK relations) are skipped.

`tenantWideRead` entities get the same filter/sort combinations **without** `accessUserIds`.

## Configuration

| Variable | Default | Purpose |
| -------- | ------- | -------- |
| `ENSURE_FIRESTORE_INDEXES` | `true` in dev, `false` in production | Call Firestore Admin `createIndex` on model sync |
| `INDEX_PROVISIONING_PUBSUB` | `false` | Publish index jobs to Pub/Sub for worker |
| Terraform `enable_index_provisioning_pubsub` | `false` | Create Pub/Sub topic + backend pub/sub IAM ([`pubsub-index-provisioning.tf`](../packages/infrastructure/terraform/pubsub-index-provisioning.tf)) |

Backend SA needs `roles/datastore.indexAdmin` (in addition to `datastore.user`) when runtime provisioning is enabled.

### MVP deploy (CI/CD)

By default, **no Pub/Sub resources** are created in Terraform (`enable_index_provisioning_pubsub = false`). Indexes also ship via committed [`firestore.indexes.json`](../firestore.indexes.json) and [`firestore.tf`](../packages/infrastructure/terraform/firestore.tf). Cloud Run sets **`ENSURE_FIRESTORE_INDEXES=true`** per workspace in [`workspaces.tf`](../packages/infrastructure/terraform/workspaces.tf) / [`cloudrun.tf`](../packages/infrastructure/terraform/cloudrun.tf), so the API calls Firestore Admin `createIndex` on entity model sync. Backend SA needs `roles/datastore.indexAdmin` (see [`iam.tf`](../packages/infrastructure/terraform/iam.tf)).

### Enabling async index provisioning (Phase C)

1. Set `enable_index_provisioning_pubsub = true` in Terraform (workspace `terraform.tfvars` or CI variable).
2. Add `roles/pubsub.admin` to `DEPLOYER_ROLES` in [`scripts/setup-github-wif.sh`](../scripts/setup-github-wif.sh) and re-run `bash scripts/setup-github-wif.sh entitysystem` so GitHub Actions can create topics (see [github-wif-setup.md](infrastructure/github-wif-setup.md)).
3. Optionally add `pubsub.googleapis.com` to `BOOTSTRAP_APIS` in the same script so the API is enabled before the first gated apply.
4. Add a Pub/Sub subscription (Terraform or console), deploy [`apps/worker-indexer`](../apps/worker-indexer), and set `INDEX_PROVISIONING_PUBSUB=true` on the API service.

## Operational runbook (Development)

1. **Generate** `firestore.indexes.json`:
   ```bash
   export GCP_PROJECT_ID=entitysystem-development
   pnpm generate:firestore-indexes -- --dynamic-from-firestore --tenant-id tenant_dev_1
   # Or explicit collections:
   pnpm generate:firestore-indexes -- --collections accounts
   ```
2. **Deploy** indexes: `firebase deploy --only firestore:indexes --project entitysystem-development` or Terraform apply.
3. Wait until each index is **Enabled** in Firebase Console (often 5–15+ minutes).
4. Check API logs for `Ensured Firestore composite index` or `Failed to ensure`.
5. **Query status**: `GET /api/indexes/status?collection=accounts`

After changing a model in Model Builder, wait for indexes to reach **Enabled** before relying on new filter/sort columns.

If lists fail with `COMPOSITE_INDEX_REQUIRED`, PATCH the entity definition again (re-provisions the catalog) or call `POST /api/indexes/provision` with `{ "collection": "accounts" }`.

## API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/indexes/status` | Aggregate status for a collection (`phase`, counts, `records`) or single record when `signature` is set |
| `POST` | `/api/indexes/provision` | Trigger provisioning for a collection (admin) |

When indexes are `CREATING`, list queries return `503` with `INDEX_CREATING` and `Retry-After`. When provisioning fails, lists return `503` with `INDEX_PROVISIONING_FAILED` and per-index error details.

## Web UX (entity lists)

[`IndexProvisioningPanel`](../apps/web/app/components/entity/IndexProvisioningPanel.tsx) shows a spinner while `GET /api/indexes/status` reports `building` or `error` for the collection—typically after saving a model. [`useIndexProvisioningStatus`](../apps/web/app/hooks/useIndexProvisioningStatus.ts) polls every 5s (`building`) or 15s (`error`) and refetches the entity list when `phase` becomes `ready`. `INDEX_CREATING` on the list API also keeps the panel visible. `COMPOSITE_INDEX_REQUIRED` shows a normal list error (not the provisioning panel).

## Bidirectional index sync

On entity definition **PATCH**, [`reconcileIndexesForDefinitionChange`](../packages/gcp-firebase/src/firestore-index-reconciler.ts):

1. Ensures indexes required by the new definition (`createIndex`).
2. Deletes composite indexes removed from that definition **only if** no other tenant’s entity definitions still need the same index signature (project-wide collection group).

Status documents in `__index_status` are removed when an index is deleted. **POST** (create model) only creates indexes; it does not delete orphans.

## Implemented vs planned

### MVP (shipped)

- [x] `@repo/firestore-indexes` spec generator
- [x] In-process Firestore Admin provisioner
- [x] Hook on `syncDefinition` + reconcile on PATCH
- [x] Predictive indexes for filterable × sortable combinations
- [x] `COMPOSITE_INDEX_REQUIRED` + console link (no reactive `createIndex`)
- [x] Terraform `array_config` for composite indexes
- [x] `pnpm generate:firestore-indexes`
- [x] `__index_status` persistence + status API
- [x] Query guard (`INDEX_CREATING`, `INDEX_PROVISIONING_FAILED`)
- [x] Web index provisioning panel with live polling
- [x] Bidirectional reconcile on definition PATCH (tenant-safe deletes)

### Target architecture (future)

- [ ] Full observability (metrics, alerts on stuck `CREATING`)
- [ ] Inequality-filter index catalog
- [ ] Index cleanup / cost optimization
- [ ] Hybrid query engine

Async provisioning (Pub/Sub + dedicated worker) is partially implemented via [`apps/worker-indexer`](../apps/worker-indexer) and optional `INDEX_PROVISIONING_PUBSUB`. IaC for the topic is **gated off by default** so CI does not require `pubsub.topics.create` on the GitHub deployer.

## Definition of done

**Development usable**

- Composite indexes **Enabled** for all collections used in `tenant_dev_1`
- List APIs succeed for filter/sort combinations allowed by the model without `COMPOSITE_INDEX_REQUIRED`
- `firestore.indexes.json` committed and deployed

**Full vision**

- Above plus async worker at scale and metrics for stuck `CREATING`
