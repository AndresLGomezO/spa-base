import { describe, expect, it } from "vitest";

import { emptyExtractorRow } from "../email-matching-draft.js";
import { buildEmailMatchingPreviewModel } from "./build-email-matching-preview-model.js";
import type {
  EmailMatchingPreviewBuildContext,
  EmailMatchingPreviewInput,
} from "./email-matching-preview-types.js";

function mockContext(
  overrides: Partial<EmailMatchingPreviewBuildContext> = {},
): EmailMatchingPreviewBuildContext {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (options) {
      return `${key}:${JSON.stringify(options)}`;
    }
    return key;
  };
  return {
    entityLabel: (name) => `Label:${name}`,
    t,
    ...overrides,
  };
}

function sampleInput(
  overrides: Partial<EmailMatchingPreviewInput> = {},
): EmailMatchingPreviewInput {
  return {
    name: "Visa purchases",
    description: "Approved purchases",
    entityName: "financialItem",
    recordId: "record-1234567890",
    recordName: "Visa ****7185",
    draft: {
      name: "Visa purchases",
      description: "Approved purchases",
      enabled: true,
      order: 10,
      ingestMode: "create",
      catchupNeeded: true,
      fromAddresses: "alerts@bank.com\n@other.com",
      subjectPatterns: "Purchase approved\n/INV-\\d+/i",
      bodyPatterns: "Amount:",
      gmailQueryExtra: "label:inbox",
      useAi: false,
      aiInstructions: "",
      bodyFieldExtractors: [
        {
          ...emptyExtractorRow(),
          field: "amount",
          label: "Amount",
          transform: "amount",
        },
        {
          ...emptyExtractorRow(),
          field: "date",
          sourceMode: "pattern",
          pattern: "/(\\d{2}\\/\\d{2}\\/\\d{4})/",
          transform: "slashDate",
          captureGroup: "1",
        },
      ],
      attachmentImport: null,
    },
    ...overrides,
  };
}

describe("buildEmailMatchingPreviewModel", () => {
  it("builds the full humanized step pipeline", () => {
    const model = buildEmailMatchingPreviewModel(sampleInput(), mockContext());

    expect(model.steps.map((step) => step.kind)).toEqual([
      "target",
      "senders",
      "subject",
      "body",
      "extractors",
      "ingest",
    ]);
    expect(model.metaChips).toContain(
      "emailMatchingWorkbench.list.statusEnabled",
    );
    expect(model.metaChips).toContain("Label:financialItem");

    const target = model.steps.find((step) => step.kind === "target");
    expect(target?.bullets).toEqual(
      expect.arrayContaining([
        expect.stringContaining("targetRecordName"),
        expect.stringContaining("targetRecord"),
      ]),
    );
    expect(target?.summary).toContain("Visa ****7185");

    const senders = model.steps.find((step) => step.kind === "senders");
    expect(senders?.bullets?.length).toBe(2);

    const subject = model.steps.find((step) => step.kind === "subject");
    expect(subject?.bullets?.[0]).toContain("patternContains");
    expect(subject?.bullets?.[1]).toContain("patternRegex");

    const extractors = model.steps.find((step) => step.kind === "extractors");
    expect(extractors?.summary).toContain("amount");
    expect(extractors?.details?.[1]?.bullets?.length).toBe(2);
  });

  it("handles empty matching rules", () => {
    const model = buildEmailMatchingPreviewModel(
      sampleInput({
        draft: {
          ...sampleInput().draft,
          fromAddresses: "",
          subjectPatterns: "",
          bodyPatterns: "",
          bodyFieldExtractors: [],
          enabled: false,
          useAi: true,
          ingestMode: "link",
          catchupNeeded: false,
        },
      }),
      mockContext(),
    );

    expect(
      model.steps.find((step) => step.kind === "senders")?.summary,
    ).toBe("emailMatchingWorkbench.preview.steps.sendersEmpty");
    expect(
      model.steps.find((step) => step.kind === "extractors")?.summary,
    ).toBe("emailMatchingWorkbench.preview.steps.extractorsEmpty");
    expect(model.metaChips).toContain(
      "emailMatchingWorkbench.list.statusDisabled",
    );
    expect(model.metaChips).toContain("emailMatchingWorkbench.list.useAiOn");
    expect(model.metaChips).toContain(
      "emailMatchingWorkbench.list.ingestLink",
    );
  });
});
