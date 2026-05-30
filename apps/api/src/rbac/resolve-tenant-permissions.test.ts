import { beforeEach, describe, expect, it } from "vitest";

import { buildRoleCatalog, type RoleCatalog } from "@repo/rbac";
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

import { createEntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { resolveTenantPermissions } from "./resolve-tenant-permissions.js";

const WidgetEntity = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
  },
});

describe("resolveTenantPermissions", () => {
  beforeEach(() => {
    resetPlatformBootstrapForTests();
    clearEntityRegistry();
    bootstrapPlatformApp(platformApp);
    registerEntity(WidgetEntity);
  });

  it("expands entity wildcard after tenant definitions are loaded", async () => {
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();
    const entityRuntime = createEntityRuntimeContext({
      firebaseAdminConfig: { projectId: "demo" },
      entityDefinitionRepository,
      repositories: {},
    });

    await entityDefinitionRepository.create("tenant_a", {
      name: "lead",
      label: "Lead",
      fields: [{ name: "title", type: "string", required: true }],
    });

    const roleCatalog: RoleCatalog = {
      ...buildRoleCatalog([]),
      leadReader: { grants: ["lead.*"] },
    };

    const permissions = await resolveTenantPermissions(
      {
        tenantId: "tenant_a",
        tenants: { tenant_a: ["leadReader"] },
      },
      {
        getRoleCatalog: async () => roleCatalog,
        prepareKnownPermissions: async (tenantId) => {
          await entityRuntime.loadTenantDefinitions(tenantId);
          return entityRuntime.getKnownPermissions(tenantId);
        },
      },
      { roleCatalog },
    );

    expect(permissions).toEqual(
      expect.arrayContaining([
        "lead.read",
        "lead.create",
        "lead.update",
        "lead.delete",
      ]),
    );
  });

  it("expands static entity wildcard with prepareKnownPermissions", async () => {
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();
    const entityRuntime = createEntityRuntimeContext({
      firebaseAdminConfig: { projectId: "demo" },
      entityDefinitionRepository,
      repositories: {},
    });

    const roleCatalog: RoleCatalog = {
      ...buildRoleCatalog([]),
      widgetReader: { grants: ["widget.*"] },
    };

    const permissions = await resolveTenantPermissions(
      {
        tenantId: "tenant_a",
        tenants: { tenant_a: ["widgetReader"] },
      },
      {
        getRoleCatalog: async () => roleCatalog,
        prepareKnownPermissions: async (tenantId) => {
          await entityRuntime.loadTenantDefinitions(tenantId);
          return entityRuntime.getKnownPermissions(tenantId);
        },
      },
      { roleCatalog },
    );

    expect(permissions).toEqual(
      expect.arrayContaining([
        "widget.read",
        "widget.create",
        "widget.update",
        "widget.delete",
      ]),
    );
  });
});
