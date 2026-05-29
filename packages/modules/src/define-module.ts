import { validateModuleDefinition } from "./validate-module.js";
import type { ModuleDefinition } from "./types.js";

export function defineModule(config: ModuleDefinition): ModuleDefinition {
  validateModuleDefinition(config);
  return Object.freeze({
    ...config,
    dependencies: config.dependencies ? [...config.dependencies] : undefined,
    entities: config.entities ? [...config.entities] : undefined,
    routes: config.routes ? [...config.routes] : undefined,
    hooks: config.hooks ? [...config.hooks] : undefined,
  });
}
