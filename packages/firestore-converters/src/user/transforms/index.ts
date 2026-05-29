import type { SchemaTransform } from "../../core/versioned-converter.js";

export const migrateRegisteredUserV1ToV2: SchemaTransform = (legacy) => ({
  ...legacy,
  role: "member",
  lastClaimsSyncAt: null,
  _schemaVersion: 2,
});

export const registeredUserMigrations = {
  1: migrateRegisteredUserV1ToV2,
};
