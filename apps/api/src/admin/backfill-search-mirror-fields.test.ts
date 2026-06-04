import { describe, expect, it } from "vitest";

import { defineEntity } from "@repo/entities";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { backfillSearchMirrorFieldsForEntity } from "./backfill-search-mirror-fields.js";

const ArticleEntity = defineEntity({
  name: "article",
  fields: {
    title: { type: "string", required: true },
  },
  displayField: "title",
});

describe("backfillSearchMirrorFieldsForEntity", () => {
  it("writes search token mirrors for records missing them", async () => {
    const repository = createInMemoryEntityRepository({
      initialData: [
        {
          id: "a1",
          tenantId: "tenant_a",
          title: "Needle Article",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        } as never,
      ],
    });

    const result = await backfillSearchMirrorFieldsForEntity(
      ArticleEntity,
      repository,
      "tenant_a",
    );

    expect(result).toEqual({ updated: 1, scanned: 1 });

    const record = await repository.findById("a1", "tenant_a");
    expect(record).toMatchObject({
      titleSearchTokens: ["needle", "article"],
    });
  });

  it("skips entities that use in-memory list search", async () => {
    const InMemoryEntity = defineEntity({
      name: "tag",
      fields: { label: { type: "string", required: true } },
      inMemoryListQueries: true,
    });

    const repository = createInMemoryEntityRepository({
      initialData: [
        {
          id: "t1",
          tenantId: "tenant_a",
          label: "Alpha",
        } as never,
      ],
    });

    const result = await backfillSearchMirrorFieldsForEntity(
      InMemoryEntity,
      repository,
      "tenant_a",
    );

    expect(result).toEqual({ updated: 0, scanned: 0 });
    const record = await repository.findById("t1", "tenant_a");
    expect(record).not.toHaveProperty("labelSearchTokens");
  });
});
