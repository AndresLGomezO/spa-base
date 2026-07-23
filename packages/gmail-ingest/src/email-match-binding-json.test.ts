import { describe, expect, it } from "vitest";

import {
  createEmailMatchBindingEnvelope,
  createEmailMatchBindingsEnvelope,
  parseEmailMatchBindingJson,
  parseEmailMatchBindingsJson,
} from "./email-match-binding-json.js";

const sample = {
  entityName: "financialItem",
  recordId: "0819cd3c-2926-4297-9845-f1edd9f8ea0d",
  enabled: true,
  fromAddresses: ["BANCO_DAVIVIENDA@davivienda.com"],
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
      expect(parsed.data.fromAddresses).toEqual([
        "BANCO_DAVIVIENDA@davivienda.com",
      ]);
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
      name: "Visa Davivienda ****7185 — approved purchases",
      description:
        "Creates expenses/payments from Davivienda approval emails for card ****7185.",
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
