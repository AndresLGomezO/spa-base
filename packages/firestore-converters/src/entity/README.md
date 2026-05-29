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

| Phase         | Location                                                         | Storage         |
| ------------- | ---------------------------------------------------------------- | --------------- |
| WS2 (current) | `apps/api/src/repositories/in-memory-entity-repository.ts`       | In-memory `Map` |
| WS3 (planned) | `packages/gcp-firebase/src/firestore-admin-entity-repository.ts` | Firestore       |

CRUD handlers in `apps/api` depend on this interface only — swap the implementation in `server.ts` when Firestore DAL lands.

## WS3 checklist

- [ ] Add `{entity}SchemaV1` persisted schema + converter per entity (or generic factory)
- [ ] Implement `createFirestoreAdminEntityRepository(entity, converter, config)`
- [ ] All Firestore queries filter by `tenantId`
- [ ] Use `createVersionedConverter` pattern from User reference
- [ ] Replace in-memory repos in `apps/api/src/server.ts`
