import {
  createStableEntityFileObjectId,
  uploadEntityFile,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import {
  GmailApiClient,
  type EmailAiExtractResult,
  type EmailMatchBinding,
  type GmailMessageEnvelope,
} from "@repo/gmail-ingest";
import type { HookEntityServices } from "@repo/hooks";

/**
 * Download PDF attachment(s) for a binding with `attachmentImport.enabled`
 * and create an `attachment` entity row (idempotent by gmail:{messageId} description).
 */
export async function importGmailAttachmentsForBinding(options: {
  readonly gmail: GmailApiClient;
  readonly email: GmailMessageEnvelope;
  readonly binding: EmailMatchBinding;
  readonly extracted: EmailAiExtractResult | null;
  readonly entities: HookEntityServices;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly tenantId: string;
  readonly uploadedBy: string;
  /** Domain email ledger id; set on created attachment rows when present. */
  readonly emailId?: string | null;
}): Promise<{ readonly created: number; readonly skipped: number }> {
  const importConfig = options.binding.attachmentImport;
  if (!importConfig?.enabled) {
    return { created: 0, skipped: 0 };
  }

  const pdfs = (options.email.attachments ?? []).filter(
    (attachment) =>
      attachment.mimeType.toLowerCase().includes("pdf") ||
      attachment.filename.toLowerCase().endsWith(".pdf"),
  );
  if (pdfs.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const descriptionKey = `gmail:${options.email.messageId}`;
  const existing = await options.entities.list("attachment", {
    field: "description",
    value: descriptionKey,
  });
  if (existing.length > 0) {
    return { created: 0, skipped: existing.length };
  }

  const dateField = importConfig.documentDateField?.trim();
  const documentDateRaw =
    dateField && options.extracted?.fields
      ? options.extracted.fields[dateField]
      : undefined;
  const documentDate =
    typeof documentDateRaw === "string" && documentDateRaw.trim().length > 0
      ? documentDateRaw.trim()
      : (options.email.date ?? null);

  const recordIdField = importConfig.recordIdField?.trim();

  let created = 0;
  for (const pdf of pdfs) {
    const buffer = await options.gmail.getAttachment(
      options.email.messageId,
      pdf.attachmentId,
    );
    const contentType = pdf.mimeType.toLowerCase().includes("pdf")
      ? "application/pdf"
      : "application/pdf";
    const fileRef = await uploadEntityFile({
      config: options.firebaseAdminConfig,
      tenantId: options.tenantId,
      entityName: "attachment",
      fieldName: "file",
      fieldType: "document",
      objectId: createStableEntityFileObjectId(
        `${options.tenantId}:${options.email.messageId}:${pdf.attachmentId}`,
      ),
      buffer,
      contentType,
      fileName: pdf.filename,
      uploadedBy: options.uploadedBy,
    });

    const dateSuffix =
      typeof documentDate === "string"
        ? documentDate.slice(0, 10)
        : "statement";
    await options.entities.create("attachment", {
      name: `${importConfig.documentType} ${dateSuffix}`,
      documentType: importConfig.documentType,
      ...(documentDate ? { documentDate } : {}),
      ...(recordIdField ? { [recordIdField]: options.binding.recordId } : {}),
      file: fileRef,
      description: descriptionKey,
      ...(options.emailId ? { emailId: options.emailId } : {}),
    });
    created += 1;
  }

  return { created, skipped: 0 };
}
