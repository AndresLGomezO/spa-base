import { describe, expect, it, vi } from "vitest";

import { encodeDocumentPasswords } from "@repo/ai-context/document-extraction";
import { createInMemoryStatementExtractionRepository } from "@repo/firestore-converters";
import { createMockDlpClient } from "@repo/document-extraction-dlp";
import { createLocalKmsEnvelopeClient } from "@repo/encryption";

import { createDocumentExtractionProcessor } from "./document-extraction-processor.js";

const MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

function createMockAiController() {
  return {
    runAiRequest: vi.fn(
      async (request: {
        input: { phase?: string };
        params?: {
          fileParts?: readonly (
            | { fileUri: string; mimeType: string }
            | { inlineData: { data: string; mimeType: string } }
          )[];
        };
      }) => {
        const phase = request.input.phase ?? "extract";
        if (phase === "classify") {
          return {
            jobId: "aijob_classify",
            output: {
              text: JSON.stringify({
                templateId: "davivienda-visa-statement",
                confidence: 0.9,
                documentType: "creditCardStatement",
              }),
            },
            rawModelAnswer: "",
            durationMs: 1,
            modelUsage: {
              modelId: "flash",
              promptTokens: 10,
              candidatesTokens: 5,
            },
          };
        }
        return {
          jobId: "aijob_extract",
          output: {
            text: JSON.stringify({
              statementDate: "2026-06-15",
              closingBalance: 1_250_000,
              minPayment: 85_000,
              paymentDueDate: "2026-07-05",
              productNumberLast4: "4242",
              productNumberEncrypted: "4111111111114242",
              transactions: [
                {
                  date: "2026-05-20",
                  description: "Merchant",
                  amount: 120_000,
                },
              ],
            }),
          },
          rawModelAnswer: "",
          durationMs: 2,
          modelUsage: {
            modelId: "pro",
            promptTokens: 100,
            candidatesTokens: 50,
          },
        };
      },
    ),
  };
}

const baseTemplate = {
  id: "davivienda-visa-statement",
  tenantId: "t1",
  documentType: "creditCardStatement",
  institution: "Davivienda",
  matchHints: {
    financialItem: { institution: "Davivienda", itemType: "CREDIT_CARD" },
  },
  extractionInstructions: "Extract statement fields as JSON.",
  schema: { type: "object" },
  onConfirmHookId: "apply-statement-extraction-visa-davivienda",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as const;

describe("createDocumentExtractionProcessor", () => {
  it("writes awaitingReview extraction with encrypted payload and safe preview", async () => {
    const statementExtractionRepository =
      createInMemoryStatementExtractionRepository();
    const aiController = createMockAiController();
    const kmsClient = createLocalKmsEnvelopeClient(MASTER_KEY);

    const process = createDocumentExtractionProcessor({
      aiController: aiController as never,
      statementExtractionRepository,
      getAttachment: async () => ({
        id: "att_1",
        documentType: "STATEMENT",
        financialItemId: "fi_1",
        file: {
          storagePath: "tenants/t1/entity-files/attachment/att_1.pdf",
          contentType: "application/pdf",
        },
      }),
      listTemplates: async () => [baseTemplate],
      dlpClient: createMockDlpClient(),
      kmsClient,
      kmsKeyName: "local/kms-envelope-mock",
      flashModelId: "flash",
      reasoningModelId: "pro",
      resolveGcsUri: (storagePath) => `gs://bucket/${storagePath}`,
    });

    await process({
      tenantId: "t1",
      attachmentId: "att_1",
      templateId: "davivienda-visa-statement",
      requestedBy: "user_1",
    });

    const listed = await statementExtractionRepository.list("t1", {
      status: "awaitingReview",
    });
    expect(listed).toHaveLength(1);
    const record = listed[0]!;
    expect(record.status).toBe("awaitingReview");
    expect(record.attachmentId).toBe("att_1");
    expect(record.templateId).toBe("davivienda-visa-statement");
    expect(record.encryptedPayload.ciphertext).not.toBe("pending");
    expect(record.encryptedPayload.aad).toContain("t1|att_1|");
    expect(record.preview).toBeTypeOf("object");
    // Full PAN must not appear in preview (DLP / preview builder).
    const previewJson = JSON.stringify(record.preview);
    expect(previewJson).not.toContain("4111111111114242");
    expect(aiController.runAiRequest).toHaveBeenCalled();
    const extractCall = aiController.runAiRequest.mock.calls.find(
      (call) => call[0]?.input?.phase === "extract" || !call[0]?.input?.phase,
    );
    const firstPart = extractCall?.[0]?.params?.fileParts?.[0];
    expect(
      firstPart && "fileUri" in firstPart ? firstPart.fileUri : undefined,
    ).toMatch(/^gs:\/\//);
  });

  it("no-ops when attachment is not a STATEMENT document", async () => {
    const statementExtractionRepository =
      createInMemoryStatementExtractionRepository();
    const aiController = createMockAiController();
    const process = createDocumentExtractionProcessor({
      aiController: aiController as never,
      statementExtractionRepository,
      getAttachment: async () => ({
        id: "att_2",
        documentType: "OTHER",
        file: {
          storagePath: "tenants/t1/entity-files/attachment/att_2.pdf",
          contentType: "application/pdf",
        },
      }),
      listTemplates: async () => [],
      dlpClient: createMockDlpClient(),
      kmsClient: createLocalKmsEnvelopeClient(MASTER_KEY),
      kmsKeyName: "local/kms-envelope-mock",
      flashModelId: "flash",
      reasoningModelId: "pro",
      resolveGcsUri: (p) => `gs://bucket/${p}`,
    });

    await process({ tenantId: "t1", attachmentId: "att_2" });

    const listed = await statementExtractionRepository.list("t1");
    expect(listed).toHaveLength(0);
    expect(aiController.runAiRequest).not.toHaveBeenCalled();
  });

  it("uses inlineData when a password unlocks an encrypted PDF", async () => {
    const statementExtractionRepository =
      createInMemoryStatementExtractionRepository();
    const aiController = createMockAiController();
    const encryptedBytes = Buffer.from(
      "%PDF-1.4\n/Encrypt << /Filter /Standard >>",
    );
    const unlockedBytes = Buffer.from("%PDF-1.4\nunlocked");

    const process = createDocumentExtractionProcessor({
      aiController: aiController as never,
      statementExtractionRepository,
      getAttachment: async () => ({
        id: "att_3",
        documentType: "STATEMENT",
        financialItemId: "fi_1",
        file: {
          storagePath: "tenants/t1/entity-files/attachment/att_3.pdf",
          contentType: "application/pdf",
        },
      }),
      getFinancialItem: async () => ({
        id: "fi_1",
        documentPasswords: encodeDocumentPasswords({ STATEMENT: "s3cret" }),
      }),
      listTemplates: async () => [baseTemplate],
      dlpClient: createMockDlpClient(),
      kmsClient: createLocalKmsEnvelopeClient(MASTER_KEY),
      kmsKeyName: "local/kms-envelope-mock",
      flashModelId: "flash",
      reasoningModelId: "pro",
      resolveGcsUri: (p) => `gs://bucket/${p}`,
      downloadFromGcs: async () => encryptedBytes,
      unlockPdf: async (_bytes, password) => {
        expect(password).toBe("s3cret");
        return unlockedBytes;
      },
    });

    await process({
      tenantId: "t1",
      attachmentId: "att_3",
      templateId: "davivienda-visa-statement",
    });

    const extractCall = aiController.runAiRequest.mock.calls.find(
      (call) => call[0]?.input?.phase === "extract" || !call[0]?.input?.phase,
    );
    const part = extractCall?.[0]?.params?.fileParts?.[0];
    expect(part).toEqual({
      inlineData: {
        data: unlockedBytes.toString("base64"),
        mimeType: "application/pdf",
      },
    });

    const listed = await statementExtractionRepository.list("t1", {
      status: "awaitingReview",
    });
    expect(listed).toHaveLength(1);
  });

  it("marks failed when unlock throws for a password-protected PDF", async () => {
    const statementExtractionRepository =
      createInMemoryStatementExtractionRepository();
    const aiController = createMockAiController();
    const encryptedBytes = Buffer.from(
      "%PDF-1.4\n/Encrypt << /Filter /Standard >>",
    );

    const process = createDocumentExtractionProcessor({
      aiController: aiController as never,
      statementExtractionRepository,
      getAttachment: async () => ({
        id: "att_4",
        documentType: "STATEMENT",
        financialItemId: "fi_1",
        file: {
          storagePath: "tenants/t1/entity-files/attachment/att_4.pdf",
          contentType: "application/pdf",
        },
      }),
      getFinancialItem: async () => ({
        id: "fi_1",
        documentPasswords: encodeDocumentPasswords({ STATEMENT: "wrong" }),
      }),
      listTemplates: async () => [baseTemplate],
      dlpClient: createMockDlpClient(),
      kmsClient: createLocalKmsEnvelopeClient(MASTER_KEY),
      kmsKeyName: "local/kms-envelope-mock",
      flashModelId: "flash",
      reasoningModelId: "pro",
      resolveGcsUri: (p) => `gs://bucket/${p}`,
      downloadFromGcs: async () => encryptedBytes,
      unlockPdf: async () => {
        throw new Error("bad password");
      },
    });

    await process({
      tenantId: "t1",
      attachmentId: "att_4",
      templateId: "davivienda-visa-statement",
    });

    const listed = await statementExtractionRepository.list("t1", {
      status: "failed",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.error).toBe(
      "PDF is password-protected and provided password did not unlock it.",
    );
    expect(aiController.runAiRequest).not.toHaveBeenCalled();
  });
});
