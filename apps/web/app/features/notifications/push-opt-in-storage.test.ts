import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PUSH_SOFT_ASK_MAX_COUNT,
  clearPushOptInState,
  readPushOptInState,
  shouldShowPushSoftAsk,
  snoozePushSoftAsk,
} from "./push-opt-in-storage";

const UID = "user-test-1";

describe("push-opt-in-storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows soft-ask when no prior state", () => {
    expect(shouldShowPushSoftAsk(UID)).toBe(true);
  });

  it("hides soft-ask while snoozed", () => {
    const now = 1_000_000;
    snoozePushSoftAsk(UID, 60_000, now);
    expect(shouldShowPushSoftAsk(UID, now + 1_000)).toBe(false);
    expect(shouldShowPushSoftAsk(UID, now + 60_001)).toBe(true);
  });

  it("stores never after max snoozes", () => {
    const now = 1_000_000;
    for (let i = 0; i < PUSH_SOFT_ASK_MAX_COUNT; i += 1) {
      snoozePushSoftAsk(UID, 1_000, now + i);
    }
    expect(readPushOptInState(UID)).toEqual({
      never: true,
      count: PUSH_SOFT_ASK_MAX_COUNT,
    });
    expect(shouldShowPushSoftAsk(UID, now + 10_000)).toBe(false);
  });

  it("clearPushOptInState restores soft-ask eligibility", () => {
    snoozePushSoftAsk(UID, 60_000, 1_000);
    clearPushOptInState(UID);
    expect(readPushOptInState(UID)).toBeNull();
    expect(shouldShowPushSoftAsk(UID)).toBe(true);
  });

  it("reads legacy string never", () => {
    window.localStorage.setItem("push-optin:user-test-1", "never");
    expect(shouldShowPushSoftAsk(UID)).toBe(false);
  });
});
