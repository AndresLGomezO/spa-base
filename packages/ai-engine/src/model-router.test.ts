import { describe, expect, it } from "vitest";

import { resolveModelForPurpose } from "./model-router.js";

describe("resolveModelForPurpose", () => {
  const defaults = {
    flashModelId: "gemini-2.5-flash",
    proModelId: "gemini-2.5-pro",
    embeddingModelId: "text-embedding-005",
  };

  it("routes planner to flash and synthesis/memory/documentExtract to pro", () => {
    expect(
      resolveModelForPurpose({
        purpose: "planner",
        tenantId: "t1",
        defaults,
      }).modelId,
    ).toBe("gemini-2.5-flash");
    expect(
      resolveModelForPurpose({
        purpose: "synthesis",
        tenantId: "t1",
        defaults,
      }).modelId,
    ).toBe("gemini-2.5-pro");
    expect(
      resolveModelForPurpose({
        purpose: "memoryRefresh",
        tenantId: "t1",
        defaults,
      }).modelId,
    ).toBe("gemini-2.5-pro");
    expect(
      resolveModelForPurpose({
        purpose: "documentExtract",
        tenantId: "t1",
        defaults,
      }).modelId,
    ).toBe("gemini-2.5-pro");
    expect(
      resolveModelForPurpose({
        purpose: "embedding",
        tenantId: "t1",
        defaults,
      }).modelId,
    ).toBe("text-embedding-005");
  });

  it("applies tenant overrides", () => {
    expect(
      resolveModelForPurpose({
        purpose: "planner",
        tenantId: "t1",
        defaults,
        tenantOverrides: { planner: "custom-flash" },
      }).modelId,
    ).toBe("custom-flash");
  });
});
