import { randomUUID } from "node:crypto";

import type { DocumentExtractionTemplateRecord } from "@repo/ai-context";
import { getDocumentPassword } from "@repo/ai-context/document-extraction";
import type {
  StatementExtractionEncryptedPayload,
  StatementExtractionRecord,
  StatementExtractionRepository,
} from "@repo/ai-context/storage";
import type {
  AiController,
  GenerateModelFilePart,
} from "@repo/ai-engine/controller";
import { extractJsonFromModelAnswer } from "@repo/ai-engine/extract-json-from-model-answer";
import type { DlpClient } from "@repo/document-extraction-dlp";
import { encryptEnvelope, type KmsEnvelopeClient } from "@repo/encryption";
import { isPdfEncrypted } from "@repo/pdf-unlock";

export type DocumentExtractionProcessorPayload = {
  readonly tenantId: string;
  readonly attachmentId: string;
  readonly templateId?: string;
  readonly requestedBy?: string;
};

export type DocumentExtractionProcessor = (
  payload: DocumentExtractionProcessorPayload,
) => Promise<void>;

/** Minimal template shape used by the processor (Record from catalog). */
export type DocumentExtractionTemplate = DocumentExtractionTemplateRecord;

export type DocumentExtractionProcessorDeps = {
  readonly aiController: AiController;
  readonly statementExtractionRepository: StatementExtractionRepository;
  readonly getAttachment: (
    tenantId: string,
    id: string,
  ) => Promise<Record<string, unknown> | null>;
  readonly getFinancialItem?: (
    tenantId: string,
    id: string,
  ) => Promise<Record<string, unknown> | null>;
  readonly listTemplates: (
    tenantId: string,
  ) => Promise<readonly DocumentExtractionTemplate[]>;
  readonly dlpClient: DlpClient;
  readonly kmsClient: KmsEnvelopeClient;
  /** Used only for local fallback labeling when wrapping fails mid-pipeline. */
  readonly kmsKeyName: string;
  readonly flashModelId: string;
  readonly reasoningModelId: string;
  /** Resolves `gs://` URI from attachment.file.storagePath. */
  readonly resolveGcsUri: (storagePath: string) => string;
  /** Optional: download PDF bytes when a per-documentType password is set. */
  readonly downloadFromGcs?: (storagePath: string) => Promise<Buffer>;
  /** Optional: unlock a password-protected PDF in memory via qpdf. */
  readonly unlockPdf?: (bytes: Buffer, password: string) => Promise<Buffer>;
};

const PENDING_ENVELOPE: StatementExtractionEncryptedPayload = {
  ciphertext: "pending",
  iv: "pending",
  tag: "pending",
  wrappedDek: "pending",
  kmsKeyName: "pending",
  aad: "pending",
};

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isStatementDocumentType(value: unknown): boolean {
  return (
    typeof value === "string" && value.trim().toUpperCase() === "STATEMENT"
  );
}

function readFileRef(
  attachment: Record<string, unknown>,
): { storagePath: string; mimeType: string } | null {
  const file = attachment.file;
  if (!file || typeof file !== "object" || Array.isArray(file)) {
    return null;
  }
  const ref = file as Record<string, unknown>;
  const storagePath = asOptionalString(ref.storagePath);
  if (!storagePath) {
    return null;
  }
  const mimeType =
    asOptionalString(ref.contentType) ??
    asOptionalString(ref.mimeType) ??
    "application/pdf";
  return { storagePath, mimeType };
}

async function resolveFileParts(options: {
  readonly fileRef: { storagePath: string; mimeType: string };
  readonly resolveGcsUri: (storagePath: string) => string;
  readonly documentType: string | undefined;
  readonly financialItem: Record<string, unknown> | null;
  readonly downloadFromGcs?: (storagePath: string) => Promise<Buffer>;
  readonly unlockPdf?: (bytes: Buffer, password: string) => Promise<Buffer>;
}): Promise<
  | { readonly ok: true; readonly fileParts: readonly GenerateModelFilePart[] }
  | { readonly ok: false; readonly error: string }
> {
  const gcsUri = options.resolveGcsUri(options.fileRef.storagePath);
  const fileUriParts: readonly GenerateModelFilePart[] = [
    { fileUri: gcsUri, mimeType: options.fileRef.mimeType },
  ];

  if (!options.documentType || !options.financialItem) {
    return { ok: true, fileParts: fileUriParts };
  }

  const password = getDocumentPassword(
    options.financialItem.documentPasswords,
    options.documentType,
  );
  if (!password) {
    return { ok: true, fileParts: fileUriParts };
  }

  if (!options.downloadFromGcs || !options.unlockPdf) {
    return {
      ok: false,
      error:
        "PDF password is configured but the worker cannot download/unlock PDFs.",
    };
  }

  let bytes: Buffer;
  try {
    bytes = await options.downloadFromGcs(options.fileRef.storagePath);
  } catch {
    return {
      ok: false,
      error: "Failed to download PDF from storage for password unlock.",
    };
  }

  if (!isPdfEncrypted(bytes)) {
    // Password set but PDF is not encrypted — use the normal GCS URI path.
    return { ok: true, fileParts: fileUriParts };
  }

  try {
    const unlocked = await options.unlockPdf(bytes, password);
    return {
      ok: true,
      fileParts: [
        {
          inlineData: {
            data: unlocked.toString("base64"),
            mimeType: options.fileRef.mimeType,
          },
        },
      ],
    };
  } catch {
    return {
      ok: false,
      error:
        "PDF is password-protected and provided password did not unlock it.",
    };
  }
}

function matchTemplateByFinancialItem(
  templates: readonly DocumentExtractionTemplate[],
  financialItem: Record<string, unknown>,
): DocumentExtractionTemplate | null {
  const institution = asOptionalString(financialItem.institution);
  const itemType =
    asOptionalString(financialItem.itemType) ??
    asOptionalString(financialItem.type);

  for (const template of templates) {
    const hints = template.matchHints?.financialItem;
    if (!hints) continue;
    if (
      hints.institution &&
      institution &&
      hints.institution.toLowerCase() !== institution.toLowerCase()
    ) {
      continue;
    }
    if (
      hints.itemType &&
      itemType &&
      hints.itemType.toLowerCase() !== itemType.toLowerCase()
    ) {
      continue;
    }
    if (hints.institution || hints.itemType) {
      return template;
    }
  }
  return null;
}

function readTextOutput(result: {
  readonly output: unknown;
  readonly rawModelAnswer?: string;
}): string {
  const raw = result.rawModelAnswer?.trim();
  if (raw) return raw;
  const output = result.output;
  if (
    output &&
    typeof output === "object" &&
    "text" in output &&
    typeof (output as { text: unknown }).text === "string"
  ) {
    return (output as { text: string }).text.trim();
  }
  return "";
}

async function markFailed(
  repo: StatementExtractionRepository,
  record: StatementExtractionRecord,
  error: string,
): Promise<void> {
  await repo.update(record.tenantId, record.id, {
    status: "failed",
    error,
    preview: {},
    encryptedPayload: PENDING_ENVELOPE,
  });
}

export function createDocumentExtractionProcessor(
  deps: DocumentExtractionProcessorDeps,
): DocumentExtractionProcessor {
  return async (payload) => {
    const now = new Date().toISOString();
    const extractionId = randomUUID();
    const requestedBy = payload.requestedBy?.trim() || "system";

    const attachment = await deps.getAttachment(
      payload.tenantId,
      payload.attachmentId,
    );
    if (!attachment) {
      await deps.statementExtractionRepository.create({
        id: extractionId,
        tenantId: payload.tenantId,
        attachmentId: payload.attachmentId,
        status: "failed",
        preview: {},
        encryptedPayload: PENDING_ENVELOPE,
        dlpFindings: [],
        error: "Attachment not found.",
        createdAt: now,
        updatedAt: now,
        requestedBy,
      });
      return;
    }

    if (!isStatementDocumentType(attachment.documentType)) {
      return;
    }

    const financialItemId = asOptionalString(attachment.financialItemId);
    const accountId = asOptionalString(attachment.accountId);
    const documentType = asOptionalString(attachment.documentType);

    let record = await deps.statementExtractionRepository.create({
      id: extractionId,
      tenantId: payload.tenantId,
      attachmentId: payload.attachmentId,
      ...(payload.templateId ? { templateId: payload.templateId } : {}),
      ...(documentType ? { documentType } : {}),
      ...(financialItemId ? { financialItemId } : {}),
      ...(accountId ? { accountId } : {}),
      status: "processing",
      preview: {},
      encryptedPayload: PENDING_ENVELOPE,
      dlpFindings: [],
      createdAt: now,
      updatedAt: now,
      requestedBy,
    });

    const fileRef = readFileRef(attachment);
    if (!fileRef) {
      await markFailed(
        deps.statementExtractionRepository,
        record,
        "Attachment is missing file.storagePath.",
      );
      return;
    }

    try {
      let financialItem: Record<string, unknown> | null = null;
      if (financialItemId && deps.getFinancialItem) {
        financialItem = await deps.getFinancialItem(
          payload.tenantId,
          financialItemId,
        );
      }

      const resolvedParts = await resolveFileParts({
        fileRef,
        resolveGcsUri: deps.resolveGcsUri,
        documentType,
        financialItem,
        ...(deps.downloadFromGcs
          ? { downloadFromGcs: deps.downloadFromGcs }
          : {}),
        ...(deps.unlockPdf ? { unlockPdf: deps.unlockPdf } : {}),
      });
      if (!resolvedParts.ok) {
        await markFailed(
          deps.statementExtractionRepository,
          record,
          resolvedParts.error,
        );
        return;
      }
      const fileParts = resolvedParts.fileParts;

      const templates = await deps.listTemplates(payload.tenantId);
      let template: DocumentExtractionTemplate | null = null;
      let confidence: number | undefined;

      if (payload.templateId?.trim()) {
        const requestedTemplateId = payload.templateId.trim();
        template = templates.find((t) => t.id === requestedTemplateId) ?? null;
        if (!template) {
          await markFailed(
            deps.statementExtractionRepository,
            record,
            `Template not found: ${requestedTemplateId}`,
          );
          return;
        }
        confidence = 1;
      } else if (financialItem) {
        template = matchTemplateByFinancialItem(templates, financialItem);
        if (template) confidence = 0.9;
      }

      if (!template) {
        if (templates.length === 0) {
          await markFailed(
            deps.statementExtractionRepository,
            record,
            "No document extraction templates configured for tenant.",
          );
          return;
        }

        const templateIds = templates.map((t) => t.id);
        const classify = await deps.aiController.runAiRequest({
          tenantId: payload.tenantId,
          feature: "documentExtract",
          operation: "generateText",
          requestedBy,
          permission: "ai.documentExtract.run",
          input: {
            kind: "documentExtract",
            attachmentId: payload.attachmentId,
            entityName: "attachment",
            phase: "classify",
            ...(documentType ? { documentType } : {}),
            ...(financialItemId ? { financialItemId } : {}),
            ...(accountId ? { accountId } : {}),
          },
          params: {
            operation: "generateText",
            systemInstruction:
              "You classify financial statement documents. Reply with JSON only.",
            userText: `Classify this statement document. Choose one templateId from this list: ${JSON.stringify(templateIds)}. Return JSON: {"templateId":"...","confidence":0-1,"documentType":"..."}.`,
            fileParts,
            modelOptions: {
              responseMimeType: "application/json",
              modelId: deps.flashModelId,
            },
          },
        });

        const classifyText = readTextOutput(classify);
        const classified = extractJsonFromModelAnswer(classifyText) as Record<
          string,
          unknown
        > | null;
        const classifiedId = asOptionalString(classified?.templateId);
        const classifiedConfidence =
          typeof classified?.confidence === "number"
            ? classified.confidence
            : undefined;
        template =
          (classifiedId
            ? templates.find((t) => t.id === classifiedId)
            : undefined) ?? null;
        confidence = classifiedConfidence;
        if (!template) {
          await markFailed(
            deps.statementExtractionRepository,
            record,
            "Unable to classify document to a known template.",
          );
          return;
        }
      }

      record = await deps.statementExtractionRepository.update(
        payload.tenantId,
        record.id,
        {
          templateId: template.id,
          ...(asOptionalString(template.documentType)
            ? { documentType: template.documentType }
            : {}),
          ...(confidence != null ? { confidence } : {}),
        },
      );

      const schemaDescription = JSON.stringify(template.schema);
      const extract = await deps.aiController.runAiRequest({
        tenantId: payload.tenantId,
        feature: "documentExtract",
        operation: "generateText",
        requestedBy,
        permission: "ai.documentExtract.run",
        input: {
          kind: "documentExtract",
          attachmentId: payload.attachmentId,
          entityName: "attachment",
          phase: "extract",
          templateId: template.id,
          ...(template.documentType
            ? { documentType: template.documentType }
            : {}),
          ...(financialItemId ? { financialItemId } : {}),
          ...(accountId ? { accountId } : {}),
        },
        params: {
          operation: "generateText",
          systemInstruction: template.extractionInstructions,
          userText: `Document extraction — extract per schema: ${schemaDescription}`,
          fileParts,
          modelOptions: {
            responseMimeType: "application/json",
            modelId: deps.reasoningModelId,
          },
        },
      });

      const extractText = readTextOutput(extract);
      if (!extractText) {
        await markFailed(
          deps.statementExtractionRepository,
          record,
          "Document extraction returned empty model answer.",
        );
        return;
      }

      const extractedJson = extractJsonFromModelAnswer(extractText);
      if (
        !extractedJson ||
        typeof extractedJson !== "object" ||
        Array.isArray(extractedJson)
      ) {
        await markFailed(
          deps.statementExtractionRepository,
          record,
          "Document extraction did not return a JSON object.",
        );
        return;
      }

      const dlp = await deps.dlpClient.inspectAndDeidentify(extractedJson, {
        ...(template.dlpAdditionalInfoTypes?.length
          ? { additionalInfoTypes: [...template.dlpAdditionalInfoTypes] }
          : {}),
      });

      const aad = `${payload.tenantId}|${payload.attachmentId}|${record.id}`;
      const encryptedPayload = await encryptEnvelope(
        JSON.stringify(dlp.redactedJson ?? extractedJson),
        deps.kmsClient,
        aad,
      );

      await deps.statementExtractionRepository.update(
        payload.tenantId,
        record.id,
        {
          status: "awaitingReview",
          preview: dlp.preview,
          encryptedPayload,
          dlpFindings: dlp.findings,
          aiJobId: extract.jobId,
          ...(confidence != null ? { confidence } : {}),
          ...(extract.modelUsage
            ? {
                modelUsage: {
                  modelId: extract.modelUsage.modelId ?? deps.reasoningModelId,
                  ...(extract.modelUsage.promptTokens != null
                    ? { promptTokens: extract.modelUsage.promptTokens }
                    : {}),
                  ...(extract.modelUsage.candidatesTokens != null
                    ? {
                        candidatesTokens: extract.modelUsage.candidatesTokens,
                      }
                    : {}),
                  ...(extract.modelUsage.thoughtsTokens != null
                    ? { thoughtsTokens: extract.modelUsage.thoughtsTokens }
                    : {}),
                  ...(extract.modelUsage.cachedContentTokens != null
                    ? {
                        cachedContentTokens:
                          extract.modelUsage.cachedContentTokens,
                      }
                    : {}),
                  ...(extract.modelUsage.totalTokens != null
                    ? { totalTokens: extract.modelUsage.totalTokens }
                    : {}),
                  ...(extract.modelUsage.estimatedCostUsd != null
                    ? {
                        estimatedCostUsd: extract.modelUsage.estimatedCostUsd,
                      }
                    : {}),
                },
              }
            : {}),
          error: undefined,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Document extraction failed.";
      await markFailed(deps.statementExtractionRepository, record, message);
      // Soft-fail: do not rethrow so Cloud Tasks does not endlessly retry
      // after a durable failed extraction record is written.
    }
  };
}
