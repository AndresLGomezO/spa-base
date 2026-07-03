import { z } from "zod";

import { expressionNodeSchema, type ExpressionNode } from "@repo/hooks";

import { FORMULA_PERMISSIONS } from "./permissions.js";

export { FORMULA_PERMISSIONS };

export const FORMULA_DEFINITIONS_COLLECTION = "__formula_definitions" as const;

export const FORMULA_SOURCES = ["platform", "tenant"] as const;

export type FormulaSource = (typeof FORMULA_SOURCES)[number];

export const formulaInputSpecSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  required: z.boolean().default(true),
});

export type FormulaInputSpec = z.infer<typeof formulaInputSpecSchema>;

const formulaDefinitionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  inputs: z.array(formulaInputSpecSchema).default([]),
  body: expressionNodeSchema,
  enabled: z.boolean().default(true),
});

export const createFormulaDefinitionInputSchema = formulaDefinitionBodySchema;

export const patchFormulaDefinitionInputSchema =
  formulaDefinitionBodySchema.partial();

export type CreateFormulaDefinitionInput = z.infer<
  typeof createFormulaDefinitionInputSchema
>;

export type PatchFormulaDefinitionInput = z.infer<
  typeof patchFormulaDefinitionInputSchema
>;

export const formulaDefinitionSchema = formulaDefinitionBodySchema.extend({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  source: z.enum(FORMULA_SOURCES).default("tenant"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FormulaDefinition = z.infer<typeof formulaDefinitionSchema>;

export type PortableFormulaDefinition = z.infer<
  typeof formulaDefinitionBodySchema
> & {
  readonly source?: FormulaSource;
};

export interface FormulaDefinitionForEval {
  readonly name: string;
  readonly inputs: readonly {
    readonly name: string;
    readonly required?: boolean;
  }[];
  readonly body: ExpressionNode;
}
