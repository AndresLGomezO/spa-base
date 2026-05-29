import { clearEntityRegistry, registerEntity } from "@repo/entities";
import { registerComponent } from "@repo/ui-builder";

import { resolveModuleOrder } from "./resolve-module-order.js";
import {
  clearConverterRegistry,
  registerEntityConverter,
} from "./registry/converter-registry.js";
import { clearHookRegistry, registerHook } from "./registry/hook-registry.js";
import {
  clearRouteRegistry,
  registerRoute,
} from "./registry/route-registry.js";
import {
  clearUiExtensionRegistry,
  registerUiExtension,
} from "./registry/ui-extension-registry.js";
import type { AppDefinition } from "./types.js";
import { validateUniqueModuleNames } from "./validate-module.js";

let loadedAppSignature: string | null = null;

export function clearModuleRegistries(): void {
  clearEntityRegistry();
  clearConverterRegistry();
  clearHookRegistry();
  clearRouteRegistry();
  clearUiExtensionRegistry();
  loadedAppSignature = null;
}

function getAppSignature(app: AppDefinition): string {
  return JSON.stringify({
    modules: app.modules.map((module) => module.name),
    entities: app.entities?.map((entity) => entity.name) ?? [],
  });
}

export function loadApp(
  app: AppDefinition,
  options?: { force?: boolean },
): void {
  const signature = getAppSignature(app);
  if (!options?.force && loadedAppSignature === signature) {
    return;
  }

  clearModuleRegistries();
  validateUniqueModuleNames(app.modules);

  for (const entity of app.entities ?? []) {
    registerEntity(entity);
  }

  const orderedModules = resolveModuleOrder(app.modules);
  for (const module of orderedModules) {
    for (const entity of module.entities ?? []) {
      registerEntity(entity);
    }

    for (const [entityName, converter] of Object.entries(
      module.converters ?? {},
    )) {
      registerEntityConverter(entityName, converter);
    }

    for (const hook of module.hooks ?? []) {
      registerHook({
        moduleName: module.name,
        event: hook.event,
        handler: hook.handler,
        order: hook.order ?? 0,
      });
    }

    for (const route of module.routes ?? []) {
      registerRoute({
        ...route,
        moduleName: module.name,
      });
    }

    for (const [componentId, implementationId] of Object.entries(
      module.ui?.components ?? {},
    )) {
      registerComponent(componentId, implementationId);
    }

    for (const [entityName, extension] of Object.entries(
      module.ui?.extend ?? {},
    )) {
      registerUiExtension(entityName, extension);
    }
  }

  loadedAppSignature = signature;
}
