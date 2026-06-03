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

const lookupDefinitions: Record<string, SerializableEntityDefinition> = {
  serviceProvider: serviceProviderDefinition,
  currency: currencyDefinition,
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
});
