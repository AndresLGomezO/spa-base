import { describe, expect, it } from "vitest";

import { assembleUiBuilderContext } from "./assemble-ui-builder-context.js";
import { buildThemeContext } from "../builders/build-theme-context.js";
import {
  buildEntityCurrentFragment,
  buildEntityTenantFragment,
  extractCatalogSummaries,
} from "../builders/build-entity-context.js";
import {
  buildUiSchemaContext,
  isListPresentationSelectionMode,
  resolveAllowedComponentKinds,
  resolveSurfaceFragmentIds,
} from "../builders/build-ui-schema-context.js";
import type { SerializableEntityDefinition } from "@repo/entities";

const sampleEntity: SerializableEntityDefinition = {
  name: "account",
  collection: "accounts",
  permissions: ["account.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
    balance: { type: "number", required: false, optional: true },
    bankId: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "bank", type: "many-to-one" },
    },
  },
  ui: {
    nav: { label: "Accounts" },
    views: [],
    forms: { create: {}, edit: {} },
  },
};

describe("buildUiSchemaContext", () => {
  it("scopes list card surface to card fragment and listItem kinds", () => {
    const fragments = buildUiSchemaContext({
      surface: "list",
      listViewType: "card",
    });
    expect(fragments["ui.surface.list.card"]).toBeDefined();
    expect(fragments["ui.surface.list.table"]).toBeUndefined();
    expect(fragments["ui.surface.forms.plain"]).toBeUndefined();
    expect(fragments["ui.components.form-field"]).toBeUndefined();
    expect(fragments["ui.components.text"]).toBeDefined();
    expect(fragments["ui.conditional-styles"]).toBeDefined();
    expect(fragments["ui.responsive-visibility"]).toBeDefined();
    expect(fragments["ui.label-config"]).toBeDefined();
    expect(fragments["ui.style-layers"]).toBeDefined();
    expect(fragments["ui.motion"]).toBeDefined();
  });

  it("includes metric bindings for metrics row surface", () => {
    const fragments = buildUiSchemaContext({
      surface: "metricsRowDesigner",
    });
    expect(fragments["ui.metric-bindings"]).toBeDefined();
    expect(fragments["ui.components.metric-kpi"]).toBeDefined();
  });

  it("includes wizard form components for wizard presentation", () => {
    const kinds = resolveAllowedComponentKinds({
      surface: "forms",
      formPresentation: "wizard",
    });
    expect(kinds).toContain("wizard-progress");
    expect(kinds).toContain("form-field");
  });

  it("resolves surface fragment ids", () => {
    expect(
      resolveSurfaceFragmentIds({
        surface: "list",
        listViewType: "expandableTable",
      }),
    ).toEqual(["ui.surface.list.expandableTable"]);
  });

  it("includes all list surface fragments when listViewType is omitted", () => {
    const scope = { surface: "list" as const };
    expect(isListPresentationSelectionMode(scope)).toBe(true);
    expect(resolveSurfaceFragmentIds(scope)).toEqual([
      "ui.surface.list.card",
      "ui.surface.list.expandableTable",
    ]);

    const fragments = buildUiSchemaContext(scope);
    expect(fragments["ui.surface.list.card"]).toBeDefined();
    expect(fragments["ui.surface.list.expandableTable"]).toBeDefined();
  });
});

describe("buildThemeContext", () => {
  it("builds tenant theme snapshot with preset", () => {
    const result = buildThemeContext({ preset: "soft" });
    expect(result.fragments["theme.tenant.snapshot"]).toContain("soft");
    expect(result.sourceHash).toHaveLength(16);
  });
});

describe("assembleUiBuilderContext", () => {
  it("assembles blocks in stable order with user prompt last", () => {
    const theme = buildThemeContext({ preset: "default" });
    const assembled = assembleUiBuilderContext({
      request: {
        tenantId: "tenant_1",
        entityName: "account",
        surface: "list",
        listViewType: "card",
        userPrompt: "Add a badge for status",
      },
      themeFragments: theme.fragments,
      entityTenantFragment: buildEntityTenantFragment({
        tenantId: "tenant_1",
        tenantName: "Acme",
        tenantStatus: "active",
      }),
      entityCatalogFragment: `# Entity catalog\n- **Accounts** (\`account\`)`,
      entityCurrentFragment: buildEntityCurrentFragment({
        entity: sampleEntity,
        layoutFieldPaths: ["name", "bank.name"],
        formFieldPaths: ["name", "bankId"],
        entityFieldSelectorPaths: [],
      }),
    });

    expect(
      assembled.contextBlocks.some((b) => b.id === "ui.components.text"),
    ).toBe(true);
    expect(
      assembled.contextBlocks.some((b) => b.id === "ui.conditional-styles"),
    ).toBe(true);
    expect(
      assembled.contextBlocks.some((b) => b.id === "ui.responsive-visibility"),
    ).toBe(true);
    expect(
      assembled.contextBlocks.some((b) => b.id === "ui.label-config"),
    ).toBe(true);
    expect(assembled.contextBlocks.at(-1)?.id).toBe("user.prompt");
    expect(assembled.estimatedTokens).toBeGreaterThan(0);
  });

  it("includes list presentation selection guidance when listViewType is omitted", () => {
    const theme = buildThemeContext({ preset: "default" });
    const assembled = assembleUiBuilderContext({
      request: {
        tenantId: "tenant_1",
        entityName: "account",
        surface: "list",
        userPrompt: "Design a list",
      },
      themeFragments: theme.fragments,
      entityTenantFragment: buildEntityTenantFragment({
        tenantId: "tenant_1",
        tenantName: "Acme",
        tenantStatus: "active",
      }),
      entityCatalogFragment: `# Entity catalog\n- **Accounts** (\`account\`)`,
      entityCurrentFragment: buildEntityCurrentFragment({
        entity: sampleEntity,
        layoutFieldPaths: ["name", "bank.name"],
        formFieldPaths: ["name", "bankId"],
        entityFieldSelectorPaths: [],
      }),
    });

    expect(
      assembled.contextBlocks.some(
        (block) => block.id === "ui.list.presentation-selection",
      ),
    ).toBe(true);
    expect(
      assembled.contextBlocks.some(
        (block) => block.id === "ui.surface.list.card",
      ),
    ).toBe(true);
  });
});

describe("extractCatalogSummaries", () => {
  it("extracts relation edges", () => {
    const summaries = extractCatalogSummaries([sampleEntity], {});
    expect(summaries[0]?.relationEdges).toEqual([
      { field: "bankId", target: "bank", type: "many-to-one" },
    ]);
  });
});
