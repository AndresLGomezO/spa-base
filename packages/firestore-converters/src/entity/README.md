# Tenant-scoped entity repository port

Generic repository contract for CRUD operations on tenant-scoped business entities (`Customer`, `Order`, …).

## Contract

See [`tenant-scoped-repository-contract.ts`](./tenant-scoped-repository-contract.ts).

| Method                                   | Behavior                                                 |
| ---------------------------------------- | -------------------------------------------------------- |
| `create(tenantId, record)`               | Persist full domain record; `record.tenantId` must match |
| `findAll({ tenantId, limit?, cursor? })` | List records for one tenant only                         |
| `findById(id, tenantId)`                 | Return record or `null` (wrong tenant → `null`)          |
| `update(id, tenantId, data)`             | Partial merge; return `null` if missing / wrong tenant   |
| `delete(id, tenantId)`                   | Hard delete; return `false` if missing / wrong tenant    |

## Implementations

| Phase            | Location                                                         | Storage         |
| ---------------- | ---------------------------------------------------------------- | --------------- |
| WS2 (tests)      | `apps/api/src/repositories/in-memory-entity-repository.ts`       | In-memory `Map` |
| WS3 (production) | `packages/gcp-firebase/src/firestore-admin-entity-repository.ts` | Firestore       |

Firestore path: **`tenants/{tenantId}/{collection}/{documentId}`** where `{collection}` comes from `entity.metadata.collection` (e.g. `customers`, `orders`).

CRUD handlers in `apps/api` depend on this interface only — production wiring uses `createFirestoreAdminEntityRepository` in [`server.ts`](../../../apps/api/src/server.ts).

## WS3 checklist

- [x] Add `{entity}SchemaV1` persisted schema + converter per entity
- [x] Implement `createFirestoreAdminEntityRepository(config, collection, converter)`
- [x] All Firestore queries scoped to tenant subcollection path
- [x] Use `createVersionedConverter` pattern from User reference
- [x] Replace in-memory repos in `apps/api/src/server.ts` (tests override via `buildServer({ repositories })`)
