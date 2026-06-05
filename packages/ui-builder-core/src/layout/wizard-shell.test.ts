import { describe, expect, it } from "vitest";

import { createDefaultWizardShellLayout } from "./default-wizard-form-layout.js";
import {
  assertWizardShellLayout,
  collectLayoutComponentKinds,
  ensureWizardShellLayout,
} from "./wizard-shell.js";

describe("wizard shell layout", () => {
  it("default shell includes required wizard slot kinds", () => {
    const layout = createDefaultWizardShellLayout();
    const kinds = collectLayoutComponentKinds(layout);
    expect(kinds.has("wizard-progress")).toBe(true);
    expect(kinds.has("wizard-step-host")).toBe(true);
    expect(kinds.has("wizard-actions")).toBe(true);
    expect(() => assertWizardShellLayout(layout, "test")).not.toThrow();
  });

  it("repairs a shell missing wizard-step-host", () => {
    const broken = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 2,
        columns: [
          {
            id: "c1",
            rows: [
              {
                type: "component" as const,
                id: "r1",
                component: { kind: "wizard-progress" as const },
              },
            ],
          },
          {
            id: "c2",
            rows: [
              {
                type: "component" as const,
                id: "r2",
                component: { kind: "wizard-actions" as const },
              },
            ],
          },
        ],
      },
    };

    const repaired = ensureWizardShellLayout(broken as never);
    const kinds = collectLayoutComponentKinds(repaired);
    expect(kinds.has("wizard-step-host")).toBe(true);
    expect(() => assertWizardShellLayout(repaired, "test")).not.toThrow();
  });

  it("throws when a required slot is missing", () => {
    expect(() =>
      assertWizardShellLayout(
        {
          root: {
            type: "root" as const,
            id: "root",
            columnCount: 1,
            columns: [{ id: "c1", rows: [] }],
          },
        },
        "test",
      ),
    ).toThrow(/wizard-progress/);
  });

  it("does not require wizard-actions when actions live in the modal footer", () => {
    const shellWithoutActions = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 2,
        columns: [
          {
            id: "c1",
            rows: [
              {
                type: "component" as const,
                id: "r1",
                component: { kind: "wizard-progress" as const },
              },
            ],
          },
          {
            id: "c2",
            rows: [
              {
                type: "component" as const,
                id: "r2",
                component: { kind: "wizard-step-host" as const },
              },
            ],
          },
        ],
      },
    };

    expect(() =>
      assertWizardShellLayout(shellWithoutActions as never, "test", {
        actionsInModalFooter: true,
      }),
    ).not.toThrow();
  });
});
