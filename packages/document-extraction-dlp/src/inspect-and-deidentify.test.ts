import { describe, expect, it } from "vitest";

import {
  buildPreview,
  createMockDlpClient,
  inspectAndDeidentify,
} from "./inspect-and-deidentify.js";

describe("createMockDlpClient", () => {
  const client = createMockDlpClient();

  it("redacts SSN and masks credit-card numbers", async () => {
    const input = {
      statementDate: "2026-01-15",
      ssn: "123-45-6789",
      pan: "4111 1111 1111 1111",
      closingBalance: 1234.56,
      productNumberEncrypted: "9999888877776666",
      accountNumberEncrypted: "123456789012",
      transactions: [
        {
          date: "2026-01-02",
          amount: -42.1,
          description: "Coffee",
        },
      ],
    };

    const result = await client.inspectAndDeidentify(input);

    expect(
      result.findings.some((f) => f.infoType === "US_SOCIAL_SECURITY_NUMBER"),
    ).toBe(true);
    expect(
      result.findings.some((f) => f.infoType === "CREDIT_CARD_NUMBER"),
    ).toBe(true);

    const redacted = result.redactedJson as Record<string, unknown>;
    expect(redacted.ssn).toBe("[REDACTED_SSN]");
    expect(String(redacted.pan)).toContain("1111");
    expect(redacted.statementDate).toBe("2026-01-15");
    expect(redacted.closingBalance).toBe(1234.56);

    expect(result.preview.statementDate).toBe("2026-01-15");
    expect(result.preview.closingBalance).toBe(1234.56);
    expect(result.preview.productNumberLast4).toBe("****6666");
    expect(result.preview.accountNumberLast4).toBe("****9012");
    expect(result.preview).not.toHaveProperty("productNumberEncrypted");
    expect(result.preview.transactions).toEqual([
      {
        date: "2026-01-02",
        amount: -42.1,
        description: "Coffee",
      },
    ]);
  });

  it("inspectAndDeidentify helper defaults to mock client", async () => {
    const result = await inspectAndDeidentify({ note: "safe text" });
    expect(result.preview.note).toBe("safe text");
    expect(result.findings).toEqual([]);
  });
});

describe("buildPreview", () => {
  it("returns empty object for non-objects", () => {
    expect(buildPreview(null)).toEqual({});
    expect(buildPreview("x")).toEqual({});
    expect(buildPreview([1])).toEqual({});
  });

  it("masks long digit sequences on non-encrypted keys", () => {
    const preview = buildPreview({
      reference: "ref-12345678901234",
      cardLast4: "1234",
    });
    expect(preview.cardLast4).toBe("1234");
    expect(String(preview.reference)).toContain("****");
  });
});
