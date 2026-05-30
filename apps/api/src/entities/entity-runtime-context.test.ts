import { beforeEach, describe, expect, it } from "vitest";

import { Customer } from "@repo/shared-types";
import { createInMemoryEntityDefinitionRepository } from "@repo/firestore-converters";
import { platformApp } from "@app/platform/app.config.js";
import {
  bootstrapPlatformApp,
  resetPlatformBootstrapForTests,
} from "@app/platform/bootstrap.js";

import { createEntityRuntimeContext } from "./entity-runtime-context.js";

describe("EntityRuntimeContext", () => {
  beforeEach(() => {
    resetPlatformBootstrapForTests();
    bootstrapPlatformApp(platformApp);
  });

  it("merges static Customer with dynamic tenant definitions", async () => {
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

    expect(entityNames).toContain("customer");
    expect(entityNames).toContain("lead");

    const customer = entityRuntime.resolveEntity("customer", "tenant_a");
    expect(customer?.metadata.permissions).toEqual(
      Customer.metadata.permissions,
    );

    const knownPermissions = entityRuntime.getKnownPermissions("tenant_a");
    expect(knownPermissions).toContain("customer.read");
    expect(knownPermissions).toContain("customer.create");
    expect(knownPermissions).toContain("lead.read");
  });
});
