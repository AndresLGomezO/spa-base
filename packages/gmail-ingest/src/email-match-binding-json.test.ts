import { describe, expect, it } from "vitest";

import {
  createEmailMatchBindingEnvelope,
  createEmailMatchBindingsEnvelope,
  parseEmailMatchBindingJson,
  parseEmailMatchBindingsJson,
} from "./email-match-binding-json.js";

const sample = {
  entityName: "financialItem",
  recordId: "00000000-0000-4000-8000-000000000001",
  enabled: true,
  fromAddresses: ["alerts@bank.example.com"],
  subjectPatterns: ["DAVIVIENDA"],
  useAi: true,
  aiInstructions: "Extract amount and categoryName.",
};

describe("email-match-binding-json", () => {
  it("round-trips a single binding envelope", () => {
    const envelope = createEmailMatchBindingEnvelope(sample);
    const parsed = parseEmailMatchBindingJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.entityName).toBe("financialItem");
      expect(parsed.data.fromAddresses).toEqual(["alerts@bank.example.com"]);
    }
  });

  it("parses a bindings list envelope", () => {
    const envelope = createEmailMatchBindingsEnvelope([sample]);
    const parsed = parseEmailMatchBindingsJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0]?.recordId).toBe(sample.recordId);
    }
  });

  it("round-trips name and description", () => {
    const withLabels = {
      ...sample,
      name: "Visa card ****4242 — approved purchases",
      description:
        "Creates expenses/payments from bank approval emails for card ****4242.",
    };
    const envelope = createEmailMatchBindingEnvelope(withLabels);
    const parsed = parseEmailMatchBindingJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe(withLabels.name);
      expect(parsed.data.description).toBe(withLabels.description);
    }
  });

  it("round-trips bodyFieldExtractors", () => {
    const withExtractors = {
      ...sample,
      useAi: false,
      aiInstructions: null,
      bodyFieldExtractors: [
        {
          field: "amount",
          label: "Valor Transacción",
          transform: "amount" as const,
        },
        {
          field: "type",
          label: "Clase de Movimiento",
          transform: "valueMap" as const,
          valueMap: { Compra: "EXPENSE" },
        },
      ],
    };
    const envelope = createEmailMatchBindingEnvelope(withExtractors);
    const parsed = parseEmailMatchBindingJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.useAi).toBe(false);
      expect(parsed.data.bodyFieldExtractors).toEqual(
        withExtractors.bodyFieldExtractors,
      );
    }
  });

  it("round-trips pattern bodyFieldExtractors", () => {
    const withPatterns = {
      ...sample,
      useAi: false,
      aiInstructions: null,
      bodyFieldExtractors: [
        {
          field: "amount",
          label: "",
          pattern: "/por\\s+\\$([\\d.,]+)/i",
          transform: "amount" as const,
        },
        {
          field: "description",
          label: "",
          pattern: "/(transferencia de .+? conectada a la llave \\S+)/i",
          captureGroup: 1,
          transform: "trim" as const,
        },
      ],
    };
    const envelope = createEmailMatchBindingEnvelope(withPatterns);
    const parsed = parseEmailMatchBindingJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.bodyFieldExtractors).toEqual(
        withPatterns.bodyFieldExtractors,
      );
    }
  });
});
