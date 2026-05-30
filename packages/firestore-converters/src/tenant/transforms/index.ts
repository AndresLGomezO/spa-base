import type { SchemaTransform } from "../../core/versioned-converter.js";

export const tenantMigrations: Record<number, SchemaTransform> = {
  1: (input) => ({
    ...input,
    _schemaVersion: 2,
  }),
};
