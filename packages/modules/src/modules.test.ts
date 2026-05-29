import {
  defineEntity,
  getAllEntities,
  getDefaultEntityUI,
} from "@repo/entities";
import { describe, expect, it, vi } from "vitest";

import { defineApp } from "./define-app.js";
import { defineModule } from "./define-module.js";
import { loadApp, clearModuleRegistries } from "./load-app.js";
import { mergeUiExtensions } from "./merge-ui-extensions.js";
import { getEntityConverter } from "./registry/converter-registry.js";
import { getHooksForEvent } from "./registry/hook-registry.js";
import { getRegisteredRoutes } from "./registry/route-registry.js";
import { getUiExtensions } from "./registry/ui-extension-registry.js";
import { ModuleDependencyError } from "./resolve-module-order.js";
import { ModuleValidationError } from "./validate-module.js";

const SampleEntity = defineEntity({
  name: "sample",
  fields: {
    name: { type: "string", required: true },
  },
});

describe("defineModule", () => {
  it("rejects invalid module names", () => {
    expect(() =>
      defineModule({
        name: "Invalid Name",
        version: "1.0.0",
      }),
    ).toThrow(ModuleValidationError);
  });
});

describe("resolveModuleOrder", () => {
  it("orders dependencies before dependents", () => {
    const core = defineModule({ name: "core", version: "1.0.0" });
    const inventory = defineModule({
      name: "inventory",
      version: "1.0.0",
      dependencies: ["core"],
    });

    const app = defineApp({ modules: [inventory, core] });
    clearModuleRegistries();
    loadApp(app, { force: true });

    expect(getAllEntities()).toHaveLength(0);
  });

  it("throws on missing dependencies", () => {
    const inventory = defineModule({
      name: "inventory",
      version: "1.0.0",
      dependencies: ["missing"],
    });

    expect(() =>
      loadApp(defineApp({ modules: [inventory] }), { force: true }),
    ).toThrow(ModuleDependencyError);
  });

  it("throws on circular dependencies", () => {
    const a = defineModule({
      name: "a",
      version: "1.0.0",
      dependencies: ["b"],
    });
    const b = defineModule({
      name: "b",
      version: "1.0.0",
      dependencies: ["a"],
    });

    expect(() =>
      loadApp(defineApp({ modules: [a, b] }), { force: true }),
    ).toThrow(ModuleDependencyError);
  });
});

describe("loadApp", () => {
  it("registers entities, converters, routes, hooks, and ui extensions", () => {
    const hook = vi.fn();
    const module = defineModule({
      name: "demo",
      version: "1.0.0",
      entities: [SampleEntity],
      converters: {
        sample: {
          read: (raw) => raw as { id: string; tenantId: string },
          write: (domain) => domain,
        },
      },
      routes: [
        {
          method: "GET",
          path: "/api/modules/demo/health",
          handler: async () => ({ ok: true }),
        },
      ],
      hooks: [{ event: "sample.afterCreate", handler: hook }],
      ui: {
        components: { badge: "BadgeField" },
        extend: {
          sample: {
            views: [
              {
                type: "table",
                name: "extended",
                fields: ["name"],
              },
            ],
          },
        },
      },
    });

    clearModuleRegistries();
    loadApp(defineApp({ modules: [module] }), { force: true });

    expect(getAllEntities().map((entity) => entity.name)).toEqual(["sample"]);
    expect(getEntityConverter("sample")).toBeDefined();
    expect(getRegisteredRoutes()).toHaveLength(1);
    expect(getHooksForEvent("sample.afterCreate")).toHaveLength(1);
    expect(getUiExtensions("sample")).toHaveLength(1);
  });

  it("supports legacy entities on the app definition", () => {
    clearModuleRegistries();
    loadApp(defineApp({ modules: [], entities: [SampleEntity] }), {
      force: true,
    });
    expect(getAllEntities()).toHaveLength(1);
  });
});

describe("mergeUiExtensions", () => {
  it("appends views and merges field metadata", () => {
    const base = getDefaultEntityUI(SampleEntity);
    const merged = mergeUiExtensions(base, [
      {
        views: [{ type: "card", name: "cards", fields: ["name"] }],
        fields: { name: { label: "Sample Name" } },
        nav: { label: "Samples" },
      },
    ]);

    expect(merged.views).toHaveLength(2);
    expect(merged.fields?.name?.label).toBe("Sample Name");
    expect(merged.nav?.label).toBe("Samples");
  });
});
