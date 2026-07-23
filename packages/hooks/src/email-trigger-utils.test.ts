import { describe, expect, it } from "vitest";

import {
  dataHookEmailTriggerSchema,
  dataHookTriggerSchema,
  emailTriggerAppliesToBinding,
} from "./data-hook-definition.js";

describe("email trigger bindingIds", () => {
  it("parses email triggers without bindingIds", () => {
    expect(dataHookEmailTriggerSchema.parse({ kind: "email" })).toEqual({
      kind: "email",
    });
    expect(dataHookTriggerSchema.parse({ kind: "email" })).toEqual({
      kind: "email",
    });
  });

  it("parses email triggers with bindingIds", () => {
    expect(
      dataHookEmailTriggerSchema.parse({
        kind: "email",
        bindingIds: [" binding-a ", "binding-b"],
      }),
    ).toEqual({
      kind: "email",
      bindingIds: ["binding-a", "binding-b"],
    });
  });

  it("applies to any binding when bindingIds is omitted or empty", () => {
    expect(
      emailTriggerAppliesToBinding({ kind: "email" }, "binding-a"),
    ).toBe(true);
    expect(
      emailTriggerAppliesToBinding(
        { kind: "email", bindingIds: [] },
        "binding-a",
      ),
    ).toBe(true);
  });

  it("applies only to listed binding ids when non-empty", () => {
    const trigger = {
      kind: "email" as const,
      bindingIds: ["binding-a", "binding-b"],
    };
    expect(emailTriggerAppliesToBinding(trigger, "binding-a")).toBe(true);
    expect(emailTriggerAppliesToBinding(trigger, "binding-b")).toBe(true);
    expect(emailTriggerAppliesToBinding(trigger, "binding-c")).toBe(false);
  });
});
