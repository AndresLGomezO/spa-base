import { describe, expect, it } from "vitest";

import {
  extractGroundedChatRecordRefs,
  formatGroundedChatRecordLink,
  normalizeGroundedChatAnswerLinks,
  rewriteBareEntityIdsInAnswer,
  sanitizeGroundedChatRecordLinks,
} from "./grounded-chat-record-ref.js";

describe("grounded chat record refs", () => {
  it("formats and extracts record hit links", () => {
    const link = formatGroundedChatRecordLink({
      entityName: "financialItem",
      recordId: "035ddce8-6251-479c-945c-6a0d484d8b17",
      label: "Préstamo Mami",
    });
    expect(link).toBe(
      "[Préstamo Mami](record:financialItem/035ddce8-6251-479c-945c-6a0d484d8b17)",
    );
    expect(extractGroundedChatRecordRefs(`Hello ${link} world`)).toEqual([
      {
        entityName: "financialItem",
        recordId: "035ddce8-6251-479c-945c-6a0d484d8b17",
        label: "Préstamo Mami",
      },
    ]);
  });

  it("rewrites bare entity:uuid dumps into labeled record hits", () => {
    const rewritten = rewriteBareEntityIdsInAnswer(
      "Regarding loans, your biggest loan is financialItem:035ddce8-6251-479c-945c-6a0d484d8b17 with balance $575,700 COP.",
      [
        {
          entityName: "financialItem",
          recordId: "035ddce8-6251-479c-945c-6a0d484d8b17",
          label: "Préstamo Mami",
        },
      ],
    );
    expect(rewritten).toContain(
      "[Préstamo Mami](record:financialItem/035ddce8-6251-479c-945c-6a0d484d8b17)",
    );
    expect(rewritten).not.toMatch(
      /financialItem:035ddce8-6251-479c-945c-6a0d484d8b17/,
    );
  });

  it("sanitizes nested label-as-href record markdown using citations", () => {
    const citations = [
      {
        entityName: "financialItem",
        recordId: "aaa11111-1111-1111-1111-111111111111",
        label: "Mastercard Black",
      },
      {
        entityName: "financialItem",
        recordId: "bbb22222-2222-2222-2222-222222222222",
        label: "Visa Signature",
      },
      {
        entityName: "financialItem",
        recordId: "ccc33333-3333-3333-3333-333333333333",
        label: "Préstamo Darwin",
      },
    ];
    const ugly = `Here are your top 3 products with the biggest remaining balances:

[Mastercard Black](record:[Mastercard Black](record:Mastercard Black)) — $23,000,000 COP
[Visa Signature](record:[Visa Signature](record:Visa Signature)) — $15,850,000 COP
[Préstamo Darwin](record:[Préstamo Darwin](record:Préstamo Darwin)) — $7,955,680 COP`;

    const sanitized = sanitizeGroundedChatRecordLinks(ugly, citations);

    expect(sanitized).toContain(
      "[Mastercard Black](record:financialItem/aaa11111-1111-1111-1111-111111111111)",
    );
    expect(sanitized).toContain(
      "[Visa Signature](record:financialItem/bbb22222-2222-2222-2222-222222222222)",
    );
    expect(sanitized).toContain(
      "[Préstamo Darwin](record:financialItem/ccc33333-3333-3333-3333-333333333333)",
    );
    expect(sanitized).not.toMatch(/record:\[/);
    expect(sanitized).not.toMatch(/record:Mastercard Black/);
    expect(sanitized).not.toContain("record:Visa Signature");
  });

  it("falls back to plain labels when citations cannot resolve broken links", () => {
    const sanitized = sanitizeGroundedChatRecordLinks(
      "[Mystery Card](record:[Mystery Card](record:Mystery Card))",
      [],
    );
    expect(sanitized).toBe("Mystery Card");
    expect(sanitized).not.toContain("record:");
  });

  it("normalizeGroundedChatAnswerLinks runs bare-id rewrite then sanitize", () => {
    const normalized = normalizeGroundedChatAnswerLinks(
      "See financialItem:035ddce8-6251-479c-945c-6a0d484d8b17 and [X](record:X).",
      [
        {
          entityName: "financialItem",
          recordId: "035ddce8-6251-479c-945c-6a0d484d8b17",
          label: "Préstamo Mami",
        },
        {
          entityName: "financialItem",
          recordId: "ddd44444-4444-4444-4444-444444444444",
          label: "X",
        },
      ],
    );
    expect(normalized).toContain(
      "[Préstamo Mami](record:financialItem/035ddce8-6251-479c-945c-6a0d484d8b17)",
    );
    expect(normalized).toContain(
      "[X](record:financialItem/ddd44444-4444-4444-4444-444444444444)",
    );
  });
});
