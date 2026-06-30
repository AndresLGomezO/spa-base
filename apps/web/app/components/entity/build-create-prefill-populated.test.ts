import { describe, expect, it } from "vitest";

import { buildCreatePrefillPopulated } from "./build-create-prefill-populated";

describe("buildCreatePrefillPopulated", () => {
  it("copies populated slices from the source row when available", () => {
    expect(
      buildCreatePrefillPopulated(
        { contractId: "contract-1" },
        {
          id: "contract-1",
          name: "Annual contract",
          _populated: {
            providerId: { id: "provider-1", name: "Acme Provider" },
          },
        },
      ),
    ).toEqual({
      contractId: {
        id: "contract-1",
        name: "Annual contract",
        _populated: {
          providerId: { id: "provider-1", name: "Acme Provider" },
        },
      },
    });
  });

  it("uses the source row when the prefilled id matches", () => {
    expect(
      buildCreatePrefillPopulated(
        { accountId: "account-1" },
        { id: "account-1", name: "Primary account" },
      ),
    ).toEqual({
      accountId: { id: "account-1", name: "Primary account" },
    });
  });
});
