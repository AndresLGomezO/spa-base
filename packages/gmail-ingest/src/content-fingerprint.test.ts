import { describe, expect, it } from "vitest";

import {
  buildEmailContentFingerprint,
  buildIngestBatchHash,
  formatGmailQueryDate,
  resolveWindowAfterDate,
  resolveWindowBeforeDate,
} from "./content-fingerprint.js";

describe("content-fingerprint + watermark helpers", () => {
  it("builds stable fingerprints for the same email content", () => {
    const email = {
      messageId: "gmail-1",
      rfcMessageId: "<abc@example.com>",
      from: "Bank <bank@example.com>",
      subject: "Payment receipt",
      date: "2026-01-15T12:00:00.000Z",
      bodyText: "Amount: 10.00",
      snippet: "Amount: 10.00",
    };
    expect(buildEmailContentFingerprint(email)).toBe(
      buildEmailContentFingerprint({ ...email, messageId: "gmail-2" }),
    );
  });

  it("falls back to gmail message id when Message-ID is missing", () => {
    const left = buildEmailContentFingerprint({
      messageId: "gmail-1",
      rfcMessageId: null,
      from: "a@example.com",
      subject: "Hi",
      date: null,
      bodyText: null,
      snippet: "",
    });
    const right = buildEmailContentFingerprint({
      messageId: "gmail-2",
      rfcMessageId: null,
      from: "a@example.com",
      subject: "Hi",
      date: null,
      bodyText: null,
      snippet: "",
    });
    expect(left).not.toBe(right);
  });

  it("hashes sorted message ids for batch identity", () => {
    expect(buildIngestBatchHash(["b", "a"])).toBe(
      buildIngestBatchHash(["a", "b"]),
    );
  });

  it("formats Gmail query dates in UTC YYYY/MM/DD", () => {
    expect(formatGmailQueryDate("2026-07-14T15:30:00.000Z")).toBe("2026/07/14");
  });

  it("resolves after date with overlap fence and before as next UTC day", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    expect(resolveWindowAfterDate(null, now)).toBeUndefined();
    expect(resolveWindowAfterDate("2026-07-14T12:00:00.000Z", now)).toBe(
      "2026/07/12",
    );
    expect(resolveWindowBeforeDate(now)).toBe("2026/07/15");
  });
});
