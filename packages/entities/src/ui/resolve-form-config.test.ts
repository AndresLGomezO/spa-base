import { describe, expect, it } from "vitest";
import {
  createDefaultFormLayout,
  createDefaultWizardShellLayout,
} from "@repo/ui-builder-core";

import {
  resolveFormModalChrome,
  resolveEffectiveFormModalContentPadding,
  resolveFormModalFooterLayout,
  resolveFormModalHasLayoutActions,
  resolveFormUsesModalBuilderFooter,
} from "./resolve-form-config.js";
import type { SerializableEntityDefinition } from "./types.js";

const baseDefinition: SerializableEntityDefinition = {
  name: "account",
  collection: "accounts",
  permissions: ["account.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name"] }],
    forms: {
      create: { sections: [{ fields: ["name"] }] },
      edit: { sections: [{ fields: ["name"] }] },
    },
  },
};

describe("resolveFormModalChrome", () => {
  it("defaults to visible header and padded content", () => {
    expect(resolveFormModalChrome(baseDefinition)).toEqual({
      showHeader: true,
      contentPadding: "default",
    });
  });

  it("reads override values from forms.modalChrome", () => {
    const definition: SerializableEntityDefinition = {
      ...baseDefinition,
      ui: {
        ...baseDefinition.ui,
        forms: {
          ...baseDefinition.ui.forms,
          modalChrome: {
            showHeader: false,
            contentPadding: "none",
          },
        },
      },
    };

    expect(resolveFormModalChrome(definition)).toEqual({
      showHeader: false,
      contentPadding: "none",
    });
  });
});

describe("resolveEffectiveFormModalContentPadding", () => {
  it("flushes content when padding is none or header is hidden", () => {
    expect(
      resolveEffectiveFormModalContentPadding({
        showHeader: true,
        contentPadding: "default",
      }),
    ).toBe("default");
    expect(
      resolveEffectiveFormModalContentPadding({
        showHeader: false,
        contentPadding: "default",
      }),
    ).toBe("none");
    expect(
      resolveEffectiveFormModalContentPadding({
        showHeader: true,
        contentPadding: "none",
      }),
    ).toBe("none");
  });
});

describe("resolveFormUsesModalBuilderFooter", () => {
  it("is false when no modal chrome or footer layout is configured", () => {
    expect(resolveFormUsesModalBuilderFooter(baseDefinition)).toBe(false);
  });

  it("is true when modal chrome or footer layout is configured", () => {
    expect(
      resolveFormUsesModalBuilderFooter({
        ...baseDefinition,
        ui: {
          ...baseDefinition.ui,
          forms: {
            ...baseDefinition.ui.forms,
            modalChrome: { showHeader: false },
          },
        },
      }),
    ).toBe(true);

    expect(
      resolveFormUsesModalBuilderFooter({
        ...baseDefinition,
        ui: {
          ...baseDefinition.ui,
          forms: {
            ...baseDefinition.ui.forms,
            modalFooterLayout: createDefaultFormLayout(["name"]),
          },
        },
      }),
    ).toBe(true);
  });
});

describe("resolveFormModalHasLayoutActions", () => {
  it("detects wizard-actions in the wizard shell layout", () => {
    const definition: SerializableEntityDefinition = {
      ...baseDefinition,
      ui: {
        ...baseDefinition.ui,
        forms: {
          ...baseDefinition.ui.forms,
          presentation: "wizard",
          wizard: {
            shellLayout: createDefaultWizardShellLayout(),
            steps: [
              {
                id: "step-1",
                label: "Details",
                layout: createDefaultFormLayout(["name"]),
              },
            ],
          },
        },
      },
    };

    expect(resolveFormModalHasLayoutActions(definition)).toBe(true);
    expect(resolveFormModalFooterLayout(definition)).toBeUndefined();
  });
});
