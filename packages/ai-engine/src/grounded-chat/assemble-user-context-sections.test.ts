import { describe, expect, it, vi } from "vitest";

import type { AiContextSectionRecord } from "@repo/ai-context";

import { resolveAndAssembleUserContextSections } from "./assemble-user-context-sections.js";

function section(
  partial: Partial<AiContextSectionRecord> &
    Pick<AiContextSectionRecord, "id" | "name" | "blocks">,
): AiContextSectionRecord {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    tenantId: "t1",
    order: 0,
    enabled: true,
    scope: "perUser",
    visibility: {},
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("resolveAndAssembleUserContextSections", () => {
  it("concatenates static markdown blocks in order", async () => {
    const result = await resolveAndAssembleUserContextSections({
      sections: [
        section({
          id: "s2",
          name: "Second",
          order: 2,
          blocks: [{ kind: "staticMarkdown", content: "B" }],
        }),
        section({
          id: "s1",
          name: "First",
          order: 1,
          blocks: [{ kind: "staticMarkdown", content: "A" }],
        }),
      ],
      userId: "u1",
      userPermissions: [],
      ports: {
        getEntityField: vi.fn(),
        listEntityRecords: vi.fn(),
      },
    });

    expect(result.text).toContain("## First");
    expect(result.text).toContain("A");
    expect(result.text).toContain("## Second");
    expect(result.text).toContain("B");
    expect(result.text.indexOf("First")).toBeLessThan(
      result.text.indexOf("Second"),
    );
    expect(result.resolvedBlocks.every((block) => block.ok)).toBe(true);
  });

  it("skips sections when required permissions are missing", async () => {
    const result = await resolveAndAssembleUserContextSections({
      sections: [
        section({
          id: "s1",
          name: "Secret",
          visibility: { requiredPermissions: ["secret.read"] },
          blocks: [{ kind: "staticMarkdown", content: "hidden" }],
        }),
      ],
      userId: "u1",
      userPermissions: ["other.read"],
      ports: {
        getEntityField: vi.fn(),
        listEntityRecords: vi.fn(),
      },
    });

    expect(result.text).toBe("");
    expect(result.resolvedBlocks).toHaveLength(0);
  });

  it("skips perUser blocks that target another user", async () => {
    const getEntityField = vi.fn().mockResolvedValue("secret");
    const result = await resolveAndAssembleUserContextSections({
      sections: [
        section({
          id: "s1",
          name: "Mine",
          scope: "perUser",
          blocks: [
            {
              kind: "entityField",
              entityName: "deal",
              source: "firstMatch",
              field: "name",
              where: [
                { field: "ownerId", operator: "eq", value: "other-user" },
              ],
            },
          ],
        }),
      ],
      userId: "u1",
      userPermissions: [],
      ports: {
        getEntityField,
        listEntityRecords: vi.fn(),
      },
    });

    expect(getEntityField).not.toHaveBeenCalled();
    expect(result.resolvedBlocks).toEqual([
      expect.objectContaining({
        ok: false,
        error: "perUser scope: block targets another user",
      }),
    ]);
    expect(result.text).toBe("");
  });

  it("resolves entityField and entityRecordsSummary via ports", async () => {
    const getEntityField = vi.fn().mockResolvedValue("Summary text");
    const listEntityRecords = vi.fn().mockResolvedValue([
      { id: "1", aiSummaryText: "Row one" },
      { id: "2", aiSummaryText: "Row two" },
    ]);

    const result = await resolveAndAssembleUserContextSections({
      sections: [
        section({
          id: "s1",
          name: "Entity data",
          blocks: [
            {
              kind: "entityField",
              entityName: "portfolioSettings",
              source: "singleton",
              field: "aiSummaryText",
              prefix: "Overview: ",
            },
            {
              kind: "entityRecordsSummary",
              entityName: "deal",
              fields: ["aiSummaryText"],
              limit: 10,
              joinAs: "list",
            },
          ],
        }),
      ],
      userId: "u1",
      userPermissions: [],
      ports: { getEntityField, listEntityRecords },
    });

    expect(getEntityField).toHaveBeenCalled();
    expect(listEntityRecords).toHaveBeenCalled();
    expect(result.text).toContain("Overview: Summary text");
    expect(result.text).toContain("Row one");
    expect(result.text).toContain("Row two");
  });

  it("reports failures for unavailable metric/query resolvers", async () => {
    const result = await resolveAndAssembleUserContextSections({
      sections: [
        section({
          id: "s1",
          name: "Metrics",
          blocks: [
            {
              kind: "metricValue",
              metricDefinitionId: "m1",
              format: "raw",
            },
            {
              kind: "savedQueryTop",
              queryDefinitionId: "q1",
              limit: 5,
              fields: ["name"],
            },
          ],
        }),
      ],
      userId: "u1",
      userPermissions: [],
      ports: {
        getEntityField: vi.fn(),
        listEntityRecords: vi.fn(),
      },
    });

    expect(result.resolvedBlocks).toHaveLength(2);
    expect(result.resolvedBlocks.every((block) => !block.ok)).toBe(true);
  });
});
