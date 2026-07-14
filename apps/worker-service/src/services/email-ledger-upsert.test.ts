import { describe, expect, it, vi } from "vitest";

import type { GmailMessageEnvelope } from "@repo/gmail-ingest";

import {
  EMAIL_LEDGER_ENTITY_NAME,
  updateEmailLedgerStatus,
  upsertProcessedEmailLedger,
  type EmailLedgerEntities,
} from "./email-ledger-upsert.js";

const baseEmail: GmailMessageEnvelope = {
  messageId: "msg-1",
  threadId: "thread-1",
  rfcMessageId: "<msg-1@example.com>",
  from: "bank@example.com",
  subject: "Your statement",
  snippet: "Hello",
  date: "2026-07-01T12:00:00.000Z",
  bodyText: "Body text here",
  attachments: [],
};

function createMockEntities(overrides?: {
  readonly listRows?: readonly Record<string, unknown>[];
}): {
  readonly entities: EmailLedgerEntities;
  readonly create: ReturnType<typeof vi.fn>;
  readonly update: ReturnType<typeof vi.fn>;
  readonly list: ReturnType<typeof vi.fn>;
} {
  const list = vi.fn(async () =>
    (overrides?.listRows ?? []).map((row) => ({
      id: String(row.id ?? "missing"),
      tenantId: String(row.tenantId ?? "t1"),
      ...row,
    })),
  );
  const create = vi.fn(
    async (_entity: string, data: Record<string, unknown>) => ({
      id: "email-new",
      tenantId: "t1",
      ...data,
    }),
  );
  const update = vi.fn(
    async (_entity: string, id: string, data: Record<string, unknown>) => ({
      id,
      tenantId: "t1",
      ...data,
    }),
  );
  return {
    entities: { list, create, update },
    create,
    update,
    list,
  };
}

describe("upsertProcessedEmailLedger", () => {
  it("creates a ledger row when none exists for gmailMessageId", async () => {
    const { entities, create, update, list } = createMockEntities();
    const result = await upsertProcessedEmailLedger({
      entities,
      email: baseEmail,
      userId: "user-1",
      bindingId: "binding-1",
      matchEntityName: "financialItem",
      matchRecordId: "fi-1",
      extracted: {
        relevant: true,
        reason: "ok",
        fields: { extractSource: "manual" },
      },
      relevant: true,
      contentFingerprint: "fp-1",
      status: "processed",
    });

    expect(result).toEqual({ id: "email-new", created: true });
    expect(list).toHaveBeenCalledWith(EMAIL_LEDGER_ENTITY_NAME, {
      field: "gmailMessageId",
      value: "msg-1",
    });
    expect(create).toHaveBeenCalledWith(
      EMAIL_LEDGER_ENTITY_NAME,
      expect.objectContaining({
        gmailMessageId: "msg-1",
        subject: "Your statement",
        fromAddress: "bank@example.com",
        userId: "user-1",
        matchRecordId: "fi-1",
        status: "processed",
        extractSource: "manual",
        contentFingerprint: "fp-1",
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the existing row for the same gmailMessageId (idempotent)", async () => {
    const { entities, create, update } = createMockEntities({
      listRows: [
        {
          id: "email-existing",
          tenantId: "t1",
          gmailMessageId: "msg-1",
          userId: "user-1",
        },
      ],
    });

    const result = await upsertProcessedEmailLedger({
      entities,
      email: { ...baseEmail, subject: "Updated subject" },
      userId: "user-1",
      bindingId: "binding-1",
      matchEntityName: "financialItem",
      matchRecordId: "fi-1",
      extracted: { relevant: true, reason: "retry", fields: {} },
      relevant: true,
      status: "processed",
    });

    expect(result).toEqual({ id: "email-existing", created: false });
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      EMAIL_LEDGER_ENTITY_NAME,
      "email-existing",
      expect.objectContaining({
        subject: "Updated subject",
        status: "processed",
        reason: "retry",
      }),
    );
  });

  it("truncates bodyText to 8k characters", async () => {
    const { entities, create } = createMockEntities();
    const longBody = "x".repeat(9_000);
    await upsertProcessedEmailLedger({
      entities,
      email: { ...baseEmail, bodyText: longBody },
      userId: "user-1",
      bindingId: "binding-1",
      matchEntityName: "financialItem",
      matchRecordId: "fi-1",
      extracted: null,
      relevant: true,
      status: "processed",
    });

    const data = create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(typeof data.bodyText).toBe("string");
    expect(String(data.bodyText).length).toBeLessThanOrEqual(8_001);
    expect(String(data.bodyText).endsWith("…")).toBe(true);
  });
});

describe("updateEmailLedgerStatus", () => {
  it("patches status on the ledger row", async () => {
    const { entities, update } = createMockEntities();
    await updateEmailLedgerStatus({
      entities,
      emailId: "email-1",
      status: "failed",
      reason: "hook exploded",
    });
    expect(update).toHaveBeenCalledWith(EMAIL_LEDGER_ENTITY_NAME, "email-1", {
      status: "failed",
      reason: "hook exploded",
    });
  });
});
