export {
  type FindByFieldParams,
  type ListParams,
  type PaginatedResult,
  type TenantScopedEntityRepository,
} from "./entity/tenant-scoped-repository-contract.js";
export {
  type EntityQueryExecutor,
  type FilterOperator,
  type NormalizedEntityQuery,
  type NormalizedFilter,
  type NormalizedSort,
} from "./entity/entity-query-contract.js";
export {
  type FindJoinBySourceParams,
  type FindJoinByTargetParams,
  type JoinCollectionRepository,
  type JoinRecord,
  type LinkJoinParams,
} from "./entity/join-collection-repository-contract.js";
export {
  ConverterError,
  MissingSchemaTransformError,
  MissingSchemaVersionError,
  SchemaValidationError,
  UnsupportedSchemaVersionError,
} from "./core/errors.js";
export { normalizeFirestoreTimestamps } from "./core/timestamps.js";
export {
  createVersionedConverter,
  type SchemaTransform,
  type VersionedConverterConfig,
} from "./core/versioned-converter.js";

export {
  customerConverter,
  customerCurrentVersion,
} from "./customer/schema.latest.js";
export { orderConverter, orderCurrentVersion } from "./order/schema.latest.js";
export {
  registeredUserConverter,
  registeredUserCurrentVersion,
} from "./user/schema.latest.js";
export {
  type RegisteredUserListParams,
  type RegisteredUserListResult,
  type RegisteredUserRepository,
  type RegisteredUserUpsertResult,
  type UpdateRegisteredUserAccessInput,
} from "./user/repository-contract.js";
export {
  platformRoleConverter,
  platformRoleCurrentVersion,
} from "./role/schema.latest.js";
export { type PlatformRoleRepository } from "./role/repository-contract.js";
export {
  tenantConverter,
  tenantCurrentVersion,
} from "./tenant/schema.latest.js";
export {
  type CreateTenantInput,
  type TenantRepository,
  type UpdateTenantInput,
} from "./tenant/repository-contract.js";
export {
  createRegisteredUserFromAuthUser,
  mergeRegisteredUserFromAuthUser,
} from "./user/user-mapper.js";
