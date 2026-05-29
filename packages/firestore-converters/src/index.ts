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
export {
  type RegisteredUserRepository,
  type UpsertRegisteredUserOptions,
} from "./user/repository-contract.js";
export {
  createRegisteredUserFromAuthUser,
  mergeRegisteredUserFromAuthUser,
  withRegisteredUserRole,
  type CreateRegisteredUserOptions,
} from "./user/user-mapper.js";
