import type { SchemaTransform } from "../../core/versioned-converter.js";

export const orderMigrations: Record<number, SchemaTransform> = {
  1: (input) => ({
    ...input,
    _schemaVersion: 2,
  }),
};
