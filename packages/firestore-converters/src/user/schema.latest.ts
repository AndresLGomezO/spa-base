import {
  persistedRegisteredUserSchemaV1,
  registeredUserSchemaV1,
  USER_SCHEMA_VERSION,
  type PersistedRegisteredUser,
  type RegisteredUser,
} from "@repo/shared-types";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { registeredUserMigrations } from "./transforms/index.js";

export const registeredUserCurrentVersion = USER_SCHEMA_VERSION;

export const registeredUserConverter = createVersionedConverter<
  RegisteredUser,
  PersistedRegisteredUser
>({
  currentVersion: registeredUserCurrentVersion,
  domainSchema: registeredUserSchemaV1,
  persistedSchema: persistedRegisteredUserSchemaV1,
  migrations: registeredUserMigrations,
  fromPersisted: (persisted) => {
    const domain = { ...persisted };
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain;
  },
  toPersisted: (domain) => domain,
});
