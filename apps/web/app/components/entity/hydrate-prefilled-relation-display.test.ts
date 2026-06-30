import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import { getEntity } from "../../lib/api-client";
import {
  hasPendingPrefillRelationFetch,
  hydratePrefilledRelationDisplay,
} from "./hydrate-prefilled-relation-display";

vi.mock("../../lib/api-client", () => ({
  getEntity: vi.fn(),
}));

const paymentDefinition = {
  name: "payment",
  collection: "payments",
  permissions: [],
  fields: {
    contractId: {
      type: "reference",
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
} as SerializableEntityDefinition;

const contractDefinition = {
  name: "contract",
  collection: "contracts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    providerId: {
      type: "reference",
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
} as SerializableEntityDefinition;

describe("hydratePrefilledRelationDisplay", () => {
  beforeEach(() => {
    vi.mocked(getEntity).mockReset();
  });

  it("fetches related records into _populated", async () => {
    vi.mocked(getEntity).mockResolvedValueOnce({
      id: "contract-1",
      name: "Annual contract",
      providerId: "provider-1",
    });

    const hydrated = await hydratePrefilledRelationDisplay({
      definition: paymentDefinition,
      values: { contractId: "contract-1" },
      getDefinition: (entityName) =>
        entityName === "contract" ? contractDefinition : undefined,
    });

    expect(getEntity).toHaveBeenCalledWith("contract", "contract-1", {
      populate: "providerId",
    });
    expect(hydrated._populated).toEqual({
      contractId: {
        id: "contract-1",
        name: "Annual contract",
        providerId: "provider-1",
      },
    });
  });

  it("copies prefilled populated slices without fetching", async () => {
    const hydrated = await hydratePrefilledRelationDisplay({
      definition: paymentDefinition,
      values: { contractId: "contract-1" },
      prefilledPopulated: {
        contractId: { id: "contract-1", name: "Cached contract" },
      },
    });

    expect(getEntity).not.toHaveBeenCalled();
    expect(hydrated._populated).toEqual({
      contractId: { id: "contract-1", name: "Cached contract" },
    });
  });
});

describe("hasPendingPrefillRelationFetch", () => {
  it("returns true when a prefilled fk lacks populated data", () => {
    expect(
      hasPendingPrefillRelationFetch({
        definition: paymentDefinition,
        values: { contractId: "contract-1" },
      }),
    ).toBe(true);
  });

  it("returns false when populated data is already present", () => {
    expect(
      hasPendingPrefillRelationFetch({
        definition: paymentDefinition,
        values: {
          contractId: "contract-1",
          _populated: {
            contractId: { id: "contract-1", name: "Cached contract" },
          },
        },
      }),
    ).toBe(false);
  });
});
