import { describe, expect, it } from "vitest";

import {
  gmailIngestDeliveryModeSchema,
  parseGmailIngestDeliveryMode,
} from "./delivery-mode.js";

describe("parseGmailIngestDeliveryMode", () => {
  it("defaults to poll", () => {
    expect(parseGmailIngestDeliveryMode(undefined)).toBe("poll");
    expect(parseGmailIngestDeliveryMode("")).toBe("poll");
    expect(parseGmailIngestDeliveryMode("bogus")).toBe("poll");
  });

  it("accepts push and poll case-insensitively via trim", () => {
    expect(parseGmailIngestDeliveryMode("push")).toBe("push");
    expect(parseGmailIngestDeliveryMode("POLL")).toBe("poll");
  });

  it("schema only allows poll|push", () => {
    expect(gmailIngestDeliveryModeSchema.safeParse("both").success).toBe(false);
  });
});
