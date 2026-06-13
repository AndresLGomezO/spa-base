import { describe, expect, it } from "vitest";

import {
  buildLayoutFieldPaths,
  buildTableFieldPaths,
  normalizeTableFieldOutput,
  normalizeTableFieldPaths,
  validateLayoutFieldPaths,
  validateTableFieldPaths,
} from "./list-field-paths.js";
import type { FieldPathValidationDefinition } from "@repo/ui-builder-core";

const contractDefinition: FieldPathValidationDefinition = {
  name: "contract",
  fields: {
    name: { type: "string" },
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
  },
};

describe("validateLayoutFieldPaths", () => {
  const allowedPaths = new Set(buildLayoutFieldPaths(contractDefinition));

  it("accepts relation display paths such as provider.name", () => {
    expect(
      validateLayoutFieldPaths(
        ["name", "provider.name", "category.name"],
        contractDefinition,
        "skeleton",
        allowedPaths,
      ),
    ).toEqual([]);
  });
});

describe("validateTableFieldPaths", () => {
  const allowedPaths = new Set(buildTableFieldPaths(contractDefinition));

  it("accepts direct entity field names", () => {
    expect(
      validateTableFieldPaths(
        ["name", "providerId", "categoryId"],
        contractDefinition,
        "table.fields",
        allowedPaths,
      ),
    ).toEqual([]);
  });

  it("accepts relation display paths after normalization", () => {
    expect(
      validateTableFieldPaths(
        ["provider.name"],
        contractDefinition,
        "table.fields",
        allowedPaths,
      ),
    ).toEqual([]);
  });

  it("rejects unknown field paths", () => {
    expect(
      validateTableFieldPaths(
        ["notAField"],
        contractDefinition,
        "table.fields",
        allowedPaths,
      ),
    ).toEqual(['table.fields: invalid field path "notAField"']);
  });
});

describe("normalizeTableFieldPaths", () => {
  it("maps relation display paths to FK field names", () => {
    expect(
      normalizeTableFieldPaths(contractDefinition, [
        "name",
        "provider.name",
        "category.name",
      ]),
    ).toEqual(["name", "providerId", "categoryId"]);
  });

  it("matches normalizeTableFieldOutput", () => {
    expect(
      normalizeTableFieldOutput(contractDefinition, ["provider.name"]),
    ).toEqual(["providerId"]);
  });
});

describe("buildTableFieldPaths", () => {
  it("includes FK fields and excludes relation display paths", () => {
    const paths = buildTableFieldPaths(contractDefinition);
    expect(paths).toContain("providerId");
    expect(paths).not.toContain("provider.name");
  });
});

describe("final table assembly", () => {
  it("sanitizes relation display paths before entity UI validation", async () => {
    const { sanitizeTableFields } = await import("./list-slice-companions.js");
    const { defineEntity } = await import("@repo/entities");
    const { createDefaultFormLayout } = await import("@repo/ui-builder-core");

    const Contract = defineEntity({
      name: "contract",
      fields: {
        name: { type: "string", required: true },
        providerId: {
          type: "relation",
          required: false,
          relation: { target: "provider", type: "many-to-one" },
        },
        status: { type: "string" },
      },
      ui: {
        nav: { label: "Contracts" },
        views: [{ type: "table", name: "default", fields: ["name"] }],
        forms: {
          create: {
            layout: createDefaultFormLayout(["name", "providerId", "status"]),
          },
          edit: {
            layout: createDefaultFormLayout(["name", "providerId", "status"]),
          },
        },
      },
    });

    expect(
      sanitizeTableFields(Contract as never, [
        "name",
        "provider.name",
        "status",
      ]),
    ).toEqual(["name", "providerId", "status"]);
  });
});
