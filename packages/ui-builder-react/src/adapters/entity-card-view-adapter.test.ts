import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import {
  entityCardViewAdapter,
  filterFieldsForComponentKind,
} from "./entity-card-view-adapter.js";

const serviceProviderDefinition: SerializableEntityDefinition = {
  name: "serviceProvider",
  collection: "service_providers",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    logo: { type: "image", required: false, optional: true },
    contractStartDate: { type: "date", required: false, optional: true },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {
      logo: { component: "image", label: "Logo" },
    },
  },
};

const currencyDefinition: SerializableEntityDefinition = {
  name: "currency",
  collection: "currencies",
  permissions: [],
  fields: {
    code: { type: "string", required: true, optional: false },
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
  },
};

const subscriptionDefinition: SerializableEntityDefinition = {
  name: "subscription",
  collection: "subscriptions",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    serviceProviderId: {
      type: "string",
      required: true,
      optional: false,
      relation: { type: "many-to-one", target: "serviceProvider" },
    },
    currencyId: {
      type: "string",
      required: true,
      optional: false,
      relation: { type: "many-to-one", target: "currency" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
  },
};

const contractTermsDefinition: SerializableEntityDefinition = {
  name: "contractTerms",
  collection: "contract_terms",
  permissions: [],
  fields: {
    contractId: {
      type: "string",
      required: true,
      optional: false,
      relation: { type: "many-to-one", target: "contract" },
    },
    effectiveDate: { type: "date", required: true, optional: false },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
};

const contractDefinition: SerializableEntityDefinition = {
  name: "contract",
  collection: "contracts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    contractTerms: {
      type: "relation",
      required: false,
      optional: true,
      relation: { type: "one-to-many", target: "contractTerms" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
};

const contractDefinitionWithoutExplicitO2m: SerializableEntityDefinition = {
  name: "contract",
  collection: "contracts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
};

const contractDefinitionWithMisnamedO2m: SerializableEntityDefinition = {
  name: "contract",
  collection: "contracts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    contractTermses: {
      type: "relation",
      required: false,
      optional: true,
      relation: { type: "one-to-many", target: "contractTerms" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
};

const lookupDefinitions: Record<string, SerializableEntityDefinition> = {
  serviceProvider: serviceProviderDefinition,
  currency: currencyDefinition,
  contractTerms: contractTermsDefinition,
};

describe("entityCardViewAdapter", () => {
  it("includes direct image fields for the image component picker", () => {
    const { fieldDescriptors } = entityCardViewAdapter(
      serviceProviderDefinition,
    );
    const imageFields = filterFieldsForComponentKind(fieldDescriptors, "image");

    expect(imageFields.map((field) => field.path)).toContain("logo");
    expect(imageFields[0]?.label).toBe("Logo");
  });

  it("includes relation image paths with entity-prefixed labels", () => {
    const { fieldDescriptors } = entityCardViewAdapter(
      subscriptionDefinition,
      (entityName) => lookupDefinitions[entityName],
    );
    const imageFields = filterFieldsForComponentKind(fieldDescriptors, "image");

    expect(imageFields.map((field) => field.path)).toContain(
      "serviceProvider.logo",
    );
    expect(
      imageFields.find((field) => field.path === "serviceProvider.logo")?.label,
    ).toBe("Service Provider Logo");
  });

  it("includes relation date paths for the date component picker", () => {
    const { fieldDescriptors } = entityCardViewAdapter(
      subscriptionDefinition,
      (entityName) => lookupDefinitions[entityName],
    );
    const dateFields = filterFieldsForComponentKind(fieldDescriptors, "date");

    expect(dateFields.map((field) => field.path)).toContain(
      "serviceProvider.contractStartDate",
    );
  });

  it("does not list logo paths for relations whose target has no image field", () => {
    const { fieldDescriptors } = entityCardViewAdapter(
      subscriptionDefinition,
      (entityName) => lookupDefinitions[entityName],
    );
    const imageFields = filterFieldsForComponentKind(fieldDescriptors, "image");

    expect(imageFields.map((field) => field.path)).not.toContain(
      "currency.logo",
    );
  });

  it("includes one-to-many relation date paths for the date component picker", () => {
    const { fieldDescriptors } = entityCardViewAdapter(
      contractDefinition,
      (entityName) => lookupDefinitions[entityName],
      Object.values(lookupDefinitions),
    );
    const dateFields = filterFieldsForComponentKind(fieldDescriptors, "date");

    expect(dateFields.map((field) => field.path)).toContain(
      "contractTerms.effectiveDate",
    );
  });

  it("includes implicit reverse one-to-many paths when catalog is provided", () => {
    const { fieldDescriptors } = entityCardViewAdapter(
      contractDefinitionWithoutExplicitO2m,
      (entityName) => lookupDefinitions[entityName],
      Object.values(lookupDefinitions),
    );
    const dateFields = filterFieldsForComponentKind(fieldDescriptors, "date");

    expect(dateFields.map((field) => field.path)).toContain(
      "contractTerms.effectiveDate",
    );
    expect(dateFields.map((field) => field.path)).not.toContain(
      "contractTermses.effectiveDate",
    );
  });

  it("dedupes misnamed explicit one-to-many field paths to child entity name", () => {
    const { fieldDescriptors } = entityCardViewAdapter(
      contractDefinitionWithMisnamedO2m,
      (entityName) => lookupDefinitions[entityName],
      Object.values(lookupDefinitions),
    );
    const paths = fieldDescriptors.map((field) => field.path);

    expect(paths).toContain("contractTerms.effectiveDate");
    expect(paths).not.toContain("contractTermses.effectiveDate");
  });

  it("treats ui.component image as image when field type is missing on catalog payload", () => {
    const definition: SerializableEntityDefinition = {
      ...serviceProviderDefinition,
      fields: {
        logo: { type: "string", required: false, optional: true },
      },
    };

    const { fieldDescriptors } = entityCardViewAdapter(definition);
    const imageFields = filterFieldsForComponentKind(fieldDescriptors, "image");

    expect(imageFields.map((field) => field.path)).toContain("logo");
  });

  it("includes enum values on direct and relation enum field descriptors", () => {
    const accountDefinition: SerializableEntityDefinition = {
      name: "account",
      collection: "accounts",
      permissions: [],
      fields: {
        status: {
          type: "enum",
          required: true,
          optional: false,
          enumValues: ["active", "inactive", "pending"],
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {
          status: { label: "Status" },
        },
      },
    };

    const subscriptionWithStatus: SerializableEntityDefinition = {
      ...subscriptionDefinition,
      fields: {
        ...subscriptionDefinition.fields,
        status: {
          type: "enum",
          required: true,
          optional: false,
          enumValues: ["draft", "published"],
        },
        accountId: {
          type: "string",
          required: true,
          optional: false,
          relation: { type: "many-to-one", target: "account" },
        },
      },
    };

    const { fieldDescriptors } = entityCardViewAdapter(
      subscriptionWithStatus,
      (entityName) =>
        entityName === "account"
          ? accountDefinition
          : lookupDefinitions[entityName],
    );

    const directStatus = fieldDescriptors.find(
      (field) => field.path === "status",
    );
    expect(directStatus?.valueType).toBe("enum");
    expect(directStatus?.enumValues).toEqual(["draft", "published"]);

    const relationStatus = fieldDescriptors.find(
      (field) => field.path === "account.status",
    );
    expect(relationStatus?.valueType).toBe("enum");
    expect(relationStatus?.enumValues).toEqual([
      "active",
      "inactive",
      "pending",
    ]);

    const badgeFields = filterFieldsForComponentKind(fieldDescriptors, "badge");
    expect(badgeFields.map((field) => field.path)).toContain("account.status");
  });

  it("includes nested relation image paths for multi-hop display bindings", () => {
    const providerDefinition: SerializableEntityDefinition = {
      name: "provider",
      collection: "providers",
      permissions: [],
      fields: {
        name: { type: "string", required: true, optional: false },
        logo: { type: "image", required: false, optional: true },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    };

    const contractDefinitionWithProvider: SerializableEntityDefinition = {
      name: "contract",
      collection: "contracts",
      permissions: [],
      fields: {
        providerId: {
          type: "relation",
          required: false,
          optional: true,
          relation: { type: "many-to-one", target: "provider" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    };

    const transactionDefinition: SerializableEntityDefinition = {
      name: "transaction",
      collection: "transactions",
      permissions: [],
      fields: {
        contractId: {
          type: "relation",
          required: true,
          optional: false,
          relation: { type: "many-to-one", target: "contract" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    };

    const getDefinition = (entityName: string) => {
      if (entityName === "contract") {
        return contractDefinitionWithProvider;
      }
      if (entityName === "provider") {
        return providerDefinition;
      }
      return lookupDefinitions[entityName];
    };

    const { fieldDescriptors } = entityCardViewAdapter(
      transactionDefinition,
      getDefinition,
    );
    const imageFields = filterFieldsForComponentKind(fieldDescriptors, "image");

    expect(imageFields.map((field) => field.path)).toContain(
      "contract.provider.logo",
    );
  });
});
