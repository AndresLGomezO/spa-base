import type { AppDefinition } from "./types.js";

export function defineApp(config: AppDefinition): AppDefinition {
  return Object.freeze({
    modules: [...config.modules],
    entities: config.entities ? [...config.entities] : undefined,
  });
}
