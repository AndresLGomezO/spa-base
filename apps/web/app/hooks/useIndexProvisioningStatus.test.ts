import { describe, expect, it } from "vitest";

import { resolveEffectiveIndexPhase } from "./useIndexProvisioningStatus";

describe("resolveEffectiveIndexPhase", () => {
  it("treats COMPOSITE_INDEX_REQUIRED as building while indexes catch up", () => {
    expect(
      resolveEffectiveIndexPhase("ready", "COMPOSITE_INDEX_REQUIRED"),
    ).toBe("building");
    expect(resolveEffectiveIndexPhase("idle", "COMPOSITE_INDEX_REQUIRED")).toBe(
      "building",
    );
  });

  it("stays building when status is ready but list has INDEX_CREATING", () => {
    expect(resolveEffectiveIndexPhase("ready", "INDEX_CREATING")).toBe(
      "building",
    );
  });

  it("reports error when list has INDEX_PROVISIONING_FAILED even if status is ready", () => {
    expect(
      resolveEffectiveIndexPhase("ready", "INDEX_PROVISIONING_FAILED"),
    ).toBe("error");
  });

  it("reports ready when status is ready and list has no index error", () => {
    expect(resolveEffectiveIndexPhase("ready", null)).toBe("ready");
    expect(resolveEffectiveIndexPhase("ready", undefined)).toBe("ready");
  });

  it("reports building for idle status with INDEX_CREATING list error", () => {
    expect(resolveEffectiveIndexPhase("idle", "INDEX_CREATING")).toBe(
      "building",
    );
  });

  it("reports error when status phase is error without list error", () => {
    expect(resolveEffectiveIndexPhase("error", null)).toBe("error");
  });
});
