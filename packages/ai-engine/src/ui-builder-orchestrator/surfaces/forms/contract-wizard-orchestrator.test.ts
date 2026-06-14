import { describe, expect, it } from "vitest";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

import { defineEntity, validateDesignLayoutSlice } from "@repo/entities";
import type { DefinedEntity, FieldDefinitions } from "@repo/entities";

import {
  runFormsUiBuilderOrchestrator,
  WIZARD_FIELD_THRESHOLD,
} from "./run-forms-orchestrator.js";
import { sanitizeFormComponentConfig } from "./sanitize-form-component-config.js";
import { shouldSkipPresentationSelection } from "./forms-plan.js";
import { FORMS_STEP_TYPES } from "./forms-steps.js";

import contractFixture from "./fixtures/contract-wizard-minimum.fixture.json" with { type: "json" };

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Contract = defineEntity({
  name: "contract",
  fields: {
    name: { type: "string", required: true },
    contractType: { type: "string" },
    categoryId: {
      type: "relation",
      relation: { type: "many-to-one", target: "category" },
    },
    providerId: {
      type: "relation",
      relation: { type: "many-to-one", target: "provider" },
    },
    currency: { type: "string" },
    status: { type: "string" },
    notes: { type: "string" },
  },
  ui: {
    nav: { label: "Contracts", icon: "file-text" },
    views: [{ type: "table", name: "default", fields: ["name", "status"] }],
    forms: {
      create: {
        layout: createDefaultFormLayout([
          "name",
          "contractType",
          "providerId",
          "categoryId",
          "currency",
          "status",
          "notes",
        ]),
      },
      edit: {
        layout: createDefaultFormLayout([
          "name",
          "contractType",
          "providerId",
          "categoryId",
          "currency",
          "status",
          "notes",
        ]),
      },
    },
  },
});

const entity = Contract as unknown as AnyDefinedEntity;

const entityCurrentFragment = `# Entity contract
Fields:
- name (\`name\`)
- contractType (\`contractType\`)
- providerId (\`providerId\`)
- categoryId (\`categoryId\`)
- currency (\`currency\`)
- status (\`status\`)
- notes (\`notes\`)
`;

describe("forms auto-wizard policy", () => {
  it("skips presentation selection at field threshold", () => {
    expect(WIZARD_FIELD_THRESHOLD).toBe(6);
    expect(shouldSkipPresentationSelection(7, "plain")).toBe(true);
    expect(shouldSkipPresentationSelection(3, "plain")).toBe(false);
    expect(shouldSkipPresentationSelection(3, "wizard")).toBe(true);
  });
});

describe("sanitizeFormComponentConfig", () => {
  it("preserves wizard-progress stepper variant and conditionalStyles", () => {
    const sanitized = sanitizeFormComponentConfig("wizard-progress", "", {
      kind: "wizard-progress",
      variant: "stepper",
      stepLabel: { show: true, position: "bottom", bold: true },
      conditionalStyles: [
        { matchValue: "active", background: "primary", textColor: "white" },
      ],
    });

    expect(sanitized.kind).toBe("wizard-progress");
    if (sanitized.kind === "wizard-progress") {
      expect(sanitized.variant).toBe("stepper");
      expect(sanitized.conditionalStyles?.length).toBe(1);
    }
  });

  it("preserves static text callouts", () => {
    const sanitized = sanitizeFormComponentConfig("text", "", {
      kind: "text",
      primary: {
        type: "static",
        value: "Tip: review totals before submitting.",
      },
      styles: [{ property: "color", value: "muted" }],
    });

    expect(sanitized.kind).toBe("text");
    if (sanitized.kind === "text") {
      expect(sanitized.primary).toEqual({
        type: "static",
        value: "Tip: review totals before submitting.",
      });
    }
  });
});

describe("contract wizard orchestrator mock flow", () => {
  it("auto-selects wizard, allocates fields, and keeps stepper progress", async () => {
    const definitionRecord = {
      id: "def_contract",
      tenantId: "tenant_test",
      name: "contract",
      label: "Contract",
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "contractType", type: "string" },
        {
          name: "categoryId",
          type: "relation",
          relation: { type: "many-to-one", target: "category" },
        },
        {
          name: "providerId",
          type: "relation",
          relation: { type: "many-to-one", target: "provider" },
        },
        { name: "currency", type: "string" },
        { name: "status", type: "string" },
        { name: "notes", type: "string" },
      ],
      ui: entity.metadata.ui,
    } as Parameters<
      typeof runFormsUiBuilderOrchestrator
    >[0]["entityDefinition"];

    const result = await runFormsUiBuilderOrchestrator({
      vertexConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "mock",
        mockEnabled: true,
      },
      entityName: "contract",
      userPrompt: "Design a wizard form for contracts",
      presentationHint: "plain",
      entityDefinition: definitionRecord,
      themeFragments: {},
      entityTenantFragment: "tenant",
      entityCatalogFragment: "catalog",
      entityCurrentFragment: entityCurrentFragment,
      entityFieldPaths: Object.keys(entity.metadata.fields),
      callbacks: {
        onProgress: async () => {},
        onDraftUpdate: async () => {},
      },
    });

    const draft = result.draft;

    expect(result.presentation).toBe("wizard");
    expect(result.output.stepCount).toBeGreaterThan(5);
    expect(draft.wizardSteps?.length ?? 0).toBeGreaterThanOrEqual(
      contractFixture.minimumStepCount,
    );

    const shellConfigs =
      draft.layoutTargets["wizard.shell"]?.componentConfigs ?? {};
    const progressConfig = Object.values(shellConfigs).find(
      (config): config is Extract<typeof config, { kind: "wizard-progress" }> =>
        typeof config === "object" &&
        config != null &&
        "kind" in config &&
        config.kind === "wizard-progress",
    );
    expect(progressConfig).toBeDefined();
    expect(progressConfig?.variant).toBe(
      contractFixture.minimumWizardProgressVariant,
    );

    const validated = validateDesignLayoutSlice(
      entity,
      "forms",
      result.sliceData,
    );
    expect(validated.ok).toBe(true);
  });

  it("uses creative blueprint flow and skips define/allocate steps", async () => {
    const definitionRecord = {
      id: "def_contract",
      tenantId: "tenant_test",
      name: "contract",
      label: "Contract",
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "contractType", type: "string" },
        {
          name: "categoryId",
          type: "relation",
          relation: { type: "many-to-one", target: "category" },
        },
        {
          name: "providerId",
          type: "relation",
          relation: { type: "many-to-one", target: "provider" },
        },
        { name: "currency", type: "string" },
        { name: "status", type: "string" },
        { name: "notes", type: "string" },
      ],
      ui: entity.metadata.ui,
    } as Parameters<
      typeof runFormsUiBuilderOrchestrator
    >[0]["entityDefinition"];

    const result = await runFormsUiBuilderOrchestrator({
      vertexConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "mock",
        mockEnabled: true,
      },
      entityName: "contract",
      userPrompt: "Design a creative wizard form for contracts",
      allowCreative: true,
      entityDefinition: definitionRecord,
      themeFragments: {},
      entityTenantFragment: "tenant",
      entityCatalogFragment: "catalog",
      entityCurrentFragment: entityCurrentFragment,
      entityFieldPaths: Object.keys(entity.metadata.fields),
      callbacks: {
        onProgress: async () => {},
        onDraftUpdate: async () => {},
      },
    });

    const draft = result.draft;

    expect(draft.creativeMode).toBe(true);
    expect(draft.formBlueprint?.conceptName).toBeTruthy();
    expect(draft.completedStepIds).toContain(
      FORMS_STEP_TYPES.GENERATE_BLUEPRINT,
    );
    expect(draft.completedStepIds).not.toContain(
      FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS,
    );
    expect(draft.completedStepIds).not.toContain(
      FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
    );
    expect(draft.wizardSteps?.length ?? 0).toBeGreaterThanOrEqual(
      contractFixture.minimumStepCount,
    );

    const shellConfigs =
      draft.layoutTargets["wizard.shell"]?.componentConfigs ?? {};
    const progressConfig = Object.values(shellConfigs).find(
      (config): config is Extract<typeof config, { kind: "wizard-progress" }> =>
        typeof config === "object" &&
        config != null &&
        "kind" in config &&
        config.kind === "wizard-progress",
    );
    expect(progressConfig).toBeDefined();
    expect(progressConfig?.variant).toBe(
      contractFixture.minimumWizardProgressVariant,
    );

    const validated = validateDesignLayoutSlice(
      entity,
      "forms",
      result.sliceData,
    );
    expect(validated.ok).toBe(true);
  });
});
