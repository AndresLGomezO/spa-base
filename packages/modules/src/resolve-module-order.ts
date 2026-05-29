import type { ModuleDefinition } from "./types.js";

export class ModuleDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleDependencyError";
  }
}

export function resolveModuleOrder(
  modules: readonly ModuleDefinition[],
): ModuleDefinition[] {
  const byName = new Map(modules.map((module) => [module.name, module]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: ModuleDefinition[] = [];

  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new ModuleDependencyError(
        `Circular module dependency detected involving "${name}".`,
      );
    }

    const module = byName.get(name);
    if (!module) {
      throw new ModuleDependencyError(`Missing module dependency "${name}".`);
    }

    visiting.add(name);
    for (const dependency of module.dependencies ?? []) {
      visit(dependency);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(module);
  }

  for (const module of modules) {
    visit(module.name);
  }

  return ordered;
}
