import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadEntityFile = vi.fn();
const createStableEntityFileObjectId = vi.fn((key: string) => `object:${key}`);

vi.mock("@repo/gcp-firebase", () => ({
  uploadEntityFile: (options: unknown) => uploadEntityFile(options),
  createStableEntityFileObjectId: (key: string) =>
    createStableEntityFileObjectId(key),
}));

import { importGmailAttachmentsForBinding } from "./gmail-attachment-import.js";

describe("importGmailAttachmentsForBinding", () => {
  beforeEach(() => {
    uploadEntityFile.mockReset();
    uploadEntityFile.mockResolvedValue({
      objectId: "obj-1",
      contentType: "application/pdf",
      fileName: "stmt.pdf",
    });
  });

  it("sets emailId on created attachment rows when provided", async () => {
    const create = vi.fn(async () => ({ id: "att-1", tenantId: "t1" }));
    const list = vi.fn(async () => []);
    const gmail = {
      getAttachment: vi.fn(async () => Buffer.from("%PDF-1.4")),
    };

    const result = await importGmailAttachmentsForBinding({
      gmail: gmail as never,
      email: {
        messageId: "msg-1",
        threadId: "th-1",
        from: "bank@example.com",
        subject: "Statement",
        snippet: "",
        date: "2026-07-01",
        bodyText: null,
        attachments: [
          {
            attachmentId: "att-gmail-1",
            filename: "stmt.pdf",
            mimeType: "application/pdf",
            size: 12,
          },
        ],
      },
      binding: {
        id: "binding-1",
        tenantId: "tenant-1",
        userId: "user-1",
        entityName: "financialItem",
        recordId: "fi-1",
        fromAddresses: ["bank@example.com"],
        subjectPatterns: [],
        bodyPatterns: [],
        bodyFieldExtractors: [],
        enabled: true,
        useAi: false,
        catchupNeeded: false,
        order: 0,
        ingestMode: "create",
        attachmentImport: {
          enabled: true,
          documentType: "STATEMENT",
          recordIdField: "financialItemId",
        },
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
      extracted: {
        relevant: true,
        reason: "ok",
        fields: { statementDate: "2026-07-01" },
      },
      entities: {
        create,
        list,
      } as never,
      firebaseAdminConfig: {} as never,
      tenantId: "tenant-1",
      uploadedBy: "user-1",
      emailId: "email-ledger-1",
    });

    expect(result).toEqual({ created: 1, skipped: 0 });
    expect(create).toHaveBeenCalledWith(
      "attachment",
      expect.objectContaining({
        emailId: "email-ledger-1",
        description: "gmail:msg-1",
        financialItemId: "fi-1",
        documentType: "STATEMENT",
      }),
    );
  });
});
