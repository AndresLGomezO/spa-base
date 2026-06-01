import { describe, expect, it } from "vitest";

import {
  defineEntity,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import { QueryErrorCode } from "./errors.js";
import { normalizeEntityQuery } from "./parse-query-config.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

describe("file field query restrictions", () => {
  const entity = defineEntity({
    name: "asset",
    fields: {
      logo: { type: "image", required: true },
      contract: { type: "document" },
    },
  }) as unknown as AnyDefinedEntity;

  it("rejects filter on image fields", () => {
    expect(() =>
      normalizeEntityQuery(entity, {
        filter: [{ field: "logo", operator: "==", value: "x" }],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: QueryErrorCode.QUERY_VALIDATION_ERROR,
      }),
    );
  });

  it("rejects sort on document fields", () => {
    expect(() =>
      normalizeEntityQuery(entity, {
        sort: [{ field: "contract", direction: "asc" }],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: QueryErrorCode.QUERY_VALIDATION_ERROR,
      }),
    );
  });
});
