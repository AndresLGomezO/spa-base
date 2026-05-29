/**
 * Extension point for new field types (Open/Closed).
 *
 * Implement FieldSchemaBuilder and register in defaultFieldTypeRegistry.
 * Handlers produce separate create vs full Zod shapes — see buildFieldSchema.ts.
 */
import type { z } from "zod";

import type { FieldConfig } from "./types.js";

export interface FieldSchemaBuilder {
  buildCreateFieldSchema(config: FieldConfig): z.ZodTypeAny;
  buildFullFieldSchema(config: FieldConfig): z.ZodTypeAny;
}

export type FieldTypeRegistry = Readonly<
  Record<FieldConfig["type"], FieldSchemaBuilder>
>;
