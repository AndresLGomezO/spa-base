import { describe, expect, it } from "vitest";

import {
  extractGroundedChatRecordRefs,
  formatGroundedChatRecordLink,
  normalizeGroundedChatAnswerLinks,
  rewriteBareEntityIdsInAnswer,
  sanitizeGroundedChatRecordLinks,
} from "./record-ref.js";

describe("grounded chat record refs (ai-engine re-export)", () => {
  it("re-exports format and sanitize helpers", () => {
    const link = formatGroundedChatRecordLink({
      entityName: "financialItem",
      recordId: "035ddce8-6251-479c-945c-6a0d484d8b17",
      label: "Préstamo Mami",
    });
    expect(extractGroundedChatRecordRefs(`Hello ${link}`)).toHaveLength(1);
    expect(
      rewriteBareEntityIdsInAnswer(
        "financialItem:035ddce8-6251-479c-945c-6a0d484d8b17",
        [
          {
            entityName: "financialItem",
            recordId: "035ddce8-6251-479c-945c-6a0d484d8b17",
            label: "Préstamo Mami",
          },
        ],
      ),
    ).toContain(link);
    expect(
      sanitizeGroundedChatRecordLinks("[X](record:[X](record:X))", [
        {
          entityName: "financialItem",
          recordId: "ddd44444-4444-4444-4444-444444444444",
          label: "X",
        },
      ]),
    ).toContain("record:financialItem/ddd44444-4444-4444-4444-444444444444");
    expect(normalizeGroundedChatAnswerLinks("[Y](record:Y)", [])).toBe("Y");
  });
});
