import { z } from "zod";

import type { ModuleDefinition } from "./types.js";

const moduleNameSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z][a-z0-9-]*$/);

const versionSchema = z.string().trim().min(1);

const routeSchema = z
  .object({
    method: z.enum([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]),
    path: z.string().trim().min(1),
    permission: z.string().trim().min(1).optional(),
    handler: z.function(),
  })
  .strict();

const hookSchema = z
  .object({
    event: z.string().trim().min(1),
    handler: z.function(),
    order: z.number().int().optional(),
  })
  .strict();

const uiExtensionSchema = z
  .object({
    views: z.array(z.object({}).passthrough()).optional(),
    fields: z.record(z.string(), z.object({}).passthrough()).optional(),
    nav: z.object({}).passthrough().optional(),
  })
  .strict();

const moduleSchema = z
  .object({
    name: moduleNameSchema,
    version: versionSchema,
    dependencies: z.array(moduleNameSchema).optional(),
    entities: z.array(z.custom()).optional(),
    converters: z.record(z.string(), z.custom()).optional(),
    routes: z.array(routeSchema).optional(),
    hooks: z.array(hookSchema).optional(),
    ui: z
      .object({
        components: z.record(z.string(), z.string()).optional(),
        extend: z.record(z.string(), uiExtensionSchema).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export class ModuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleValidationError";
  }
}

export function validateModuleDefinition(module: ModuleDefinition): void {
  const parsed = moduleSchema.safeParse(module);
  if (!parsed.success) {
    throw new ModuleValidationError(parsed.error.message);
  }

  if (module.entities) {
    const entityNames = new Set<string>();
    for (const entity of module.entities) {
      if (entityNames.has(entity.name)) {
        throw new ModuleValidationError(
          `Duplicate entity "${entity.name}" in module "${module.name}".`,
        );
      }
      entityNames.add(entity.name);
    }
  }

  if (module.converters) {
    for (const entityName of Object.keys(module.converters)) {
      const hasEntity = module.entities?.some(
        (entity) => entity.name === entityName,
      );
      if (!hasEntity) {
        throw new ModuleValidationError(
          `Converter for "${entityName}" in module "${module.name}" has no matching entity.`,
        );
      }
    }
  }
}

export function validateUniqueModuleNames(
  modules: readonly ModuleDefinition[],
): void {
  const names = new Set<string>();
  for (const module of modules) {
    if (names.has(module.name)) {
      throw new ModuleValidationError(
        `Duplicate module name "${module.name}".`,
      );
    }
    names.add(module.name);
  }
}
