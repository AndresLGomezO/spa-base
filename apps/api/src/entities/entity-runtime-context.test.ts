import { beforeEach, describe, expect, it } from "vitest";

import {
  clearEntityRegistry,
  defineEntity,
  registerEntity,
} from "@repo/entities";
import { createInMemoryEntityDefinitionRepository } from "@repo/firestore-converters";
import { platformApp } from "@app/platform/app.config.js";
import {
  bootstrapPlatformApp,
  resetPlatformBootstrapForTests,
} from "@app/platform/bootstrap.js";

import { createEntityRuntimeContext } from "./entity-runtime-context.js";

const WidgetEntity = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
  },
});

describe("EntityRuntimeContext", () => {
  beforeEach(() => {
    resetPlatformBootstrapForTests();
    clearEntityRegistry();
    bootstrapPlatformApp(platformApp);
    registerEntity(WidgetEntity);
  });

  it("merges static widget with dynamic tenant definitions", async () => {
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();
    const entityRuntime = createEntityRuntimeContext({
      firebaseAdminConfig: {
        projectId: "demo",
      },
      entityDefinitionRepository,
      definitionCacheTtlMs: 60_000,
      repositories: {},
    });

    await entityDefinitionRepository.create("tenant_a", {
      name: "lead",
      label: "Lead",
      fields: [{ name: "title", type: "string", required: true }],
    });

    await entityRuntime.loadTenantDefinitions("tenant_a");

    const entities = entityRuntime.getEntitiesForTenant("tenant_a");
    const entityNames = entities.map((entity) => entity.name);

    expect(entityNames).toContain("widget");
    expect(entityNames).toContain("lead");

    const widget = entityRuntime.resolveEntity("widget", "tenant_a");
    expect(widget?.metadata.permissions).toEqual(
      WidgetEntity.metadata.permissions,
    );

    const knownPermissions = entityRuntime.getKnownPermissions("tenant_a");
    expect(knownPermissions).toContain("widget.read");
    expect(knownPermissions).toContain("widget.create");
    expect(knownPermissions).toContain("lead.read");
  });
});
