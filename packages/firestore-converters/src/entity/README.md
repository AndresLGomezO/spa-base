# Tenant-scoped entity repository port

Generic repository contract for CRUD on tenant-scoped business entities.

## Contract

See [`tenant-scoped-repository-contract.ts`](./tenant-scoped-repository-contract.ts).

| Method                                   | Behavior                                   |
| ---------------------------------------- | ------------------------------------------ |
| `create(tenantId, record)`               | Persist full record; `tenantId` must match |
| `findAll({ tenantId, limit?, cursor? })` | List for one tenant                        |
| `findById(id, tenantId)`                 | Return record or `null`                    |
| `update(id, tenantId, data)`             | Partial merge                              |
| `delete(id, tenantId)`                   | Hard delete                                |

## Implementations

| Context          | Location                                                         |
| ---------------- | ---------------------------------------------------------------- |
| Tests            | `apps/api/src/repositories/in-memory-entity-repository.ts`       |
| Production       | `packages/gcp-firebase/src/firestore-admin-entity-repository.ts` |
| Dynamic entities | `createEntityConverter()` at runtime in `EntityRuntimeContext`   |

Firestore path: `tenants/{tenantId}/{collection}/{documentId}`.

Converters use `createVersionedConverter` with `_schemaVersion` on records (see [entity-system-guide.md](../../../../docs/entity-system-guide.md)).

## Guide

[firestore-collections-guide.md](../../../../docs/firestore-collections-guide.md)
