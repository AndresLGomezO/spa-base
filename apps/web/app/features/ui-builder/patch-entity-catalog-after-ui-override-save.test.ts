import {
  createDefaultFormLayout,
  type EntityUiOverrideRecord,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  entityCatalogQueryKey,
  entityCatalogQueryKeyForTenant,
} from "../../query/query-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

const baseDefinition: SerializableEntityDefinition = {
  name: "account",
  collection: "accounts",
  permissions: ["account.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name"] }],
    forms: {
      create: { layout: createDefaultFormLayout(["name"]) },
      edit: { layout: createDefaultFormLayout(["name"]) },
    },
    formDesigns: [],
  },
};

describe("patchEntityCatalogAfterUiOverrideSave", () => {
  it("updates tenant-scoped entity catalog cache entries", () => {
    const queryClient = new QueryClient();
    const tenantQueryKey = entityCatalogQueryKeyForTenant("tenant_a");

    queryClient.setQueryData(tenantQueryKey, {
      items: [baseDefinition],
    });

    const override: EntityUiOverrideRecord = {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      views: [{ type: "table", name: "default", fields: ["name"] }],
      formDesigns: [
        {
          id: "compact",
          label: "Compact",
          layout: createDefaultFormLayout(["name"]),
        },
      ],
    };

    patchEntityCatalogAfterUiOverrideSave(queryClient, "account", override);

    const cached = queryClient.getQueryData<{
      items: SerializableEntityDefinition[];
    }>(tenantQueryKey);

    expect(cached?.items[0]?.ui.formDesigns).toEqual(override.formDesigns);
    expect(queryClient.getQueryData(entityCatalogQueryKey)).toBeUndefined();
  });
});
