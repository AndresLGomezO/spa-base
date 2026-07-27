import { beforeEach, describe, expect, it } from "vitest";

import {
  clearEntityRegistry,
  defineEntity,
  registerEntity,
} from "@repo/entities";
import { createInMemoryEntityDefinitionRepository } from "@repo/firestore-converters";
import { buildInMemoryListSnapshotInvalidationPrefix } from "@repo/gcp-firebase";
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
    expect(knownPermissions).toContain("ai.uiBuilder.read");
    expect(knownPermissions).toContain("entityQueryDefinition.read");
    expect(knownPermissions).toContain("entityQueryDefinition.create");
    expect(knownPermissions).toContain("entityQueryDefinition.update");
    expect(knownPermissions).toContain("entityQueryDefinition.delete");
    expect(knownPermissions).toContain("chartDefinition.read");
    expect(knownPermissions).toContain("chartDefinition.create");
  });

  it("persists tenantWideRead on create and update", async () => {
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();

    const created = await entityDefinitionRepository.create("tenant_a", {
      name: "project",
      label: "Project",
      tenantWideRead: true,
      fields: [{ name: "title", type: "string", required: true }],
    });

    expect(created.tenantWideRead).toBe(true);

    const updated = await entityDefinitionRepository.update(
      "tenant_a",
      created.id,
      { tenantWideRead: false },
    );

    expect(updated.tenantWideRead).toBeUndefined();
  });

  it("persists hiddenFromNav on create and update", async () => {
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();

    const created = await entityDefinitionRepository.create("tenant_a", {
      name: "statusType",
      label: "Status Type",
      hiddenFromNav: true,
      fields: [{ name: "name", type: "string", required: true }],
    });

    expect(created.hiddenFromNav).toBe(true);

    const updated = await entityDefinitionRepository.update(
      "tenant_a",
      created.id,
      { hiddenFromNav: false },
    );

    expect(updated.hiddenFromNav).toBeUndefined();
  });

  it("persists emailMatchingEnabled on create and update", async () => {
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();

    const created = await entityDefinitionRepository.create("tenant_a", {
      name: "inboxItem",
      label: "Inbox Item",
      emailMatchingEnabled: true,
      fields: [{ name: "name", type: "string", required: true }],
    });

    expect(created.emailMatchingEnabled).toBe(true);

    const updated = await entityDefinitionRepository.update(
      "tenant_a",
      created.id,
      { emailMatchingEnabled: false },
    );

    expect(updated.emailMatchingEnabled).toBeUndefined();
  });

  it("invalidates cached repository after syncDefinition updates fields", async () => {
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

    const created = await entityDefinitionRepository.create("tenant_a", {
      name: "workItem",
      label: "Work Item",
      fields: [{ name: "title", type: "string", required: true }],
    });
    await entityRuntime.syncDefinition(created);

    const repositoryBeforePatch = entityRuntime.getRepository(
      "tenant_a",
      "workItem",
    );
    expect(repositoryBeforePatch).toBeDefined();

    const updated = await entityDefinitionRepository.update(
      "tenant_a",
      created.id,
      {
        fields: [
          { name: "title", type: "string", required: true },
          {
            name: "batchId",
            type: "relation",
            relation: { target: "batch", type: "many-to-one" },
          },
        ],
      },
    );
    await entityRuntime.syncDefinition(updated);

    const repositoryAfterPatch = entityRuntime.getRepository(
      "tenant_a",
      "workItem",
    );
    expect(repositoryAfterPatch).toBeDefined();
    expect(repositoryAfterPatch).not.toBe(repositoryBeforePatch);
  });

  it("skips index provisioning for excluded mock tenants", () => {
    const entityRuntime = createEntityRuntimeContext({
      firebaseAdminConfig: {
        projectId: "demo",
      },
      entityDefinitionRepository: createInMemoryEntityDefinitionRepository(),
      ensureFirestoreIndexes: true,
      indexProvisioningExcludedTenants: new Set(["tenant_excluded"]),
    });

    expect(() =>
      entityRuntime.ensureCatalogIndexes("tenant_excluded"),
    ).not.toThrow();
  });

  it("invalidateInMemoryListSnapshot is a no-op for missing or non-in-memory entities", async () => {
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

    const created = await entityDefinitionRepository.create("tenant_a", {
      name: "note",
      label: "Note",
      fields: [{ name: "title", type: "string", required: true }],
    });
    await entityRuntime.syncDefinition(created);

    expect(() =>
      entityRuntime.invalidateInMemoryListSnapshot("tenant_a", "missing"),
    ).not.toThrow();
    expect(() =>
      entityRuntime.invalidateInMemoryListSnapshot("tenant_a", "note"),
    ).not.toThrow();
  });

  it("invalidateInMemoryListSnapshot targets the entity collection prefix", async () => {
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

    const created = await entityDefinitionRepository.create("tenant_a", {
      name: "tag",
      label: "Tag",
      inMemoryListQueries: true,
      fields: [{ name: "label", type: "string", required: true }],
    });
    await entityRuntime.syncDefinition(created);

    const entity = entityRuntime.resolveEntity("tag", "tenant_a");
    expect(entity).toBeDefined();

    const prefix = buildInMemoryListSnapshotInvalidationPrefix(
      "tenant_a",
      entity!.metadata.collection,
    );
    expect(prefix).toBe("tenant_a:tags:");

    expect(() =>
      entityRuntime.invalidateInMemoryListSnapshot("tenant_a", "tag"),
    ).not.toThrow();
  });
});
