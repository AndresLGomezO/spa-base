import { describe, expect, it } from "vitest";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import {
  defineEntity,
  validateDesignLayoutSlice,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

import { assembleFormsSliceData } from "./forms-assembler.js";
import { sanitizeFormComponentConfig } from "./sanitize-form-component-config.js";
import type { FormsUiBuilderDraft } from "../../types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
  },
  ui: {
    nav: { label: "Widgets", icon: "box" },
    views: [{ type: "table", name: "default", fields: ["name", "email"] }],
    forms: {
      create: { layout: createDefaultFormLayout(["name", "email"]) },
      edit: { layout: createDefaultFormLayout(["name", "email"]) },
    },
  },
});

describe("sanitizeFormComponentConfig", () => {
  it("strips unsupported label config from form-field components", () => {
    const sanitized = sanitizeFormComponentConfig("form-field", "name", {
      kind: "form-field",
      fieldPath: "name",
      label: { show: true, text: "Legal name" },
      conditionalStyles: [
        { matchValue: "active", background: "primary", textColor: "white" },
      ],
    });

    expect(sanitized).toEqual({ kind: "form-field", fieldPath: "name" });
    expect(
      uiLayoutDocumentSchema.safeParse({
        root: {
          type: "root",
          id: "root-1",
          columnCount: 1,
          columns: [
            {
              id: "col-1",
              rows: [{ type: "component", id: "row-1", component: sanitized }],
            },
          ],
        },
        showActions: true,
        cardsPerRow: 1,
      }).success,
    ).toBe(true);
  });

  it("assembles wizard steps that pass final slice validation", () => {
    const draft: FormsUiBuilderDraft = {
      surface: "forms",
      entityName: "widget",
      userPrompt: "wizard",
      presentation: "wizard",
      wizardSteps: [
        { id: "step-1", label: "Details", fieldPaths: ["name", "email"] },
        { id: "review", label: "Review", fieldPaths: [] },
      ],
      layoutTargets: {
        "wizard.shell": {
          pathKey: "wizard.shell",
          label: "Shell",
          skeleton: [
            { kind: "wizard-progress" },
            { kind: "wizard-step-host" },
            { kind: "wizard-actions" },
          ],
          componentConfigs: {
            "root/0": sanitizeFormComponentConfig("wizard-progress", "", {
              kind: "wizard-progress",
              variant: "stepper",
            }),
          },
        },
        "wizard.steps[0]": {
          pathKey: "wizard.steps[0]",
          label: "Step 1",
          skeleton: [
            { kind: "form-section" },
            { kind: "text" },
            { kind: "form-field", fieldPath: "name" },
            { kind: "form-field", fieldPath: "email" },
          ],
          componentConfigs: {
            "root/0": sanitizeFormComponentConfig("form-section", "", {
              kind: "form-section",
              title: "Details",
            }),
            "root/1": sanitizeFormComponentConfig("text", "", {
              kind: "text",
              primary: { type: "static", value: "Tip" },
            }),
            "root/2": sanitizeFormComponentConfig("form-field", "name", {
              kind: "form-field",
              fieldPath: "name",
              label: { show: true, text: "Name" },
            }),
            "root/3": sanitizeFormComponentConfig("form-field", "email", {
              kind: "form-field",
              fieldPath: "email",
              label: { show: true, text: "Email" },
            }),
          },
        },
      },
      completedStepIds: [],
    };

    const entity = Widget as unknown as AnyDefinedEntity;
    const slice = assembleFormsSliceData(entity, draft);
    const validated = validateDesignLayoutSlice(entity, "forms", slice);
    expect(validated.ok).toBe(true);
  });
});
