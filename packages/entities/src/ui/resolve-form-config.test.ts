import { describe, expect, it } from "vitest";
import {
  createDefaultFormLayout,
  createDefaultWizardShellLayout,
} from "@repo/ui-builder-core";

import {
  resolveFormModalChrome,
  resolveFormModalSize,
  resolveFormModalSizeEditBreakpoint,
  resolveFormModalSizeForPreviewBreakpoint,
  resolveFormModalSizeInheritanceSource,
  resolveFormModalSizes,
  resolveFormModalSizeAtBreakpoint,
  resolveEntityFormModalSizing,
  isFormModalSizeExplicitAtBreakpoint,
  serializeFormModalSizeByBreakpoint,
  resolveEffectiveFormModalContentPadding,
  resolveFormModalFooterLayout,
  resolveFormModalHasLayoutActions,
  resolveFormPresentation,
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

describe("resolveFormModalSizes", () => {
  it("uses modalSize as the xl anchor and cascades to smaller breakpoints", () => {
    expect(
      resolveFormModalSizes({
        modalSize: "xl",
      }),
    ).toEqual({
      base: "xl",
      sm: "xl",
      md: "xl",
      lg: "xl",
      xl: "xl",
    });
  });

  it("applies sparse base override while keeping larger breakpoints on the anchor", () => {
    expect(
      resolveFormModalSizes({
        modalSize: "xl",
        modalSizeByBreakpoint: { base: "2xl" },
      }),
    ).toEqual({
      base: "2xl",
      sm: "xl",
      md: "xl",
      lg: "xl",
      xl: "xl",
    });
  });

  it("defaults to lg when modalSize is missing", () => {
    expect(resolveFormModalSizes({})).toEqual({
      base: "lg",
      sm: "lg",
      md: "lg",
      lg: "lg",
      xl: "lg",
    });
  });

  it("maps full preview breakpoint to xl resolution", () => {
    expect(
      resolveFormModalSizeForPreviewBreakpoint(
        { modalSize: "xl", modalSizeByBreakpoint: { base: "2xl" } },
        "full",
      ),
    ).toBe("xl");
    expect(resolveFormModalSizeEditBreakpoint("full")).toBe("xl");
  });

  it("detects inheritance source for smaller breakpoints", () => {
    const forms = {
      modalSize: "xl" as const,
      modalSizeByBreakpoint: { base: "2xl" as const },
    };
    expect(isFormModalSizeExplicitAtBreakpoint(forms, "base")).toBe(true);
    expect(isFormModalSizeExplicitAtBreakpoint(forms, "lg")).toBe(false);
    expect(resolveFormModalSizeInheritanceSource(forms, "lg")).toBe("xl");
    expect(resolveFormModalSizeAtBreakpoint(forms, "lg")).toBe("xl");
  });

  it("serializes only overrides that change the resolved cascade", () => {
    expect(
      serializeFormModalSizeByBreakpoint("xl", { base: "2xl", lg: "xl" }),
    ).toEqual({ base: "2xl" });
  });

  it("keeps resolveFormModalSize as the xl resolved value", () => {
    const definition: SerializableEntityDefinition = {
      ...baseDefinition,
      ui: {
        ...baseDefinition.ui,
        forms: {
          ...baseDefinition.ui.forms,
          modalSize: "xl",
          modalSizeByBreakpoint: { base: "2xl" },
        },
      },
    };

    expect(resolveFormModalSize(definition)).toBe("xl");
  });
});

describe("resolveEntityFormModalSizing", () => {
  it("returns simulated size for preview breakpoints", () => {
    const forms = {
      modalSize: "xl" as const,
      modalSizeByBreakpoint: { base: "2xl" as const },
    };

    expect(
      resolveEntityFormModalSizing(forms, { simulatedBreakpoint: "lg" }),
    ).toEqual({
      mode: "simulated",
      size: "xl",
    });
    expect(
      resolveEntityFormModalSizing(forms, { simulatedBreakpoint: "base" }),
    ).toEqual({
      mode: "simulated",
      size: "2xl",
    });
  });

  it("returns responsive sizes for production rendering", () => {
    const forms = {
      modalSize: "xl" as const,
      modalSizeByBreakpoint: { base: "2xl" as const },
    };

    expect(resolveEntityFormModalSizing(forms)).toEqual({
      mode: "responsive",
      responsiveSizes: {
        base: "2xl",
        sm: "xl",
        md: "xl",
        lg: "xl",
        xl: "xl",
      },
    });
  });
});

describe("resolveFormPresentation", () => {
  it("infers wizard when wizard config exists without explicit presentation", () => {
    const definition: SerializableEntityDefinition = {
      ...baseDefinition,
      ui: {
        ...baseDefinition.ui,
        forms: {
          ...baseDefinition.ui.forms,
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

    expect(resolveFormPresentation(definition)).toBe("wizard");
  });

  it("honors explicit plain presentation even when wizard config is retained", () => {
    const definition: SerializableEntityDefinition = {
      ...baseDefinition,
      ui: {
        ...baseDefinition.ui,
        forms: {
          ...baseDefinition.ui.forms,
          presentation: "plain",
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

    expect(resolveFormPresentation(definition)).toBe("plain");
  });
});

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
