export {
  type ListParams,
  type PaginatedResult,
  type TenantScopedEntityRepository,
} from "./entity/tenant-scoped-repository-contract.js";
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
  registeredUserConverter,
  registeredUserCurrentVersion,
} from "./user/schema.latest.js";
export { type RegisteredUserRepository } from "./user/repository-contract.js";
export {
  createRegisteredUserFromAuthUser,
  mergeRegisteredUserFromAuthUser,
} from "./user/user-mapper.js";
