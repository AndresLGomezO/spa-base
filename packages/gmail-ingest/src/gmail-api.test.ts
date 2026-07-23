import { describe, expect, it } from "vitest";

import {
  gmailApiMessageToEnvelope,
  listPdfAttachmentsFromPayload,
} from "./gmail-api.js";

describe("gmailApiMessageToEnvelope", () => {
  it("falls back to HTML body when plain text is missing", () => {
    const html = Buffer.from(
      "<html><body>DAVIVIENDA<br>Valor Transacción: 124,582<br>Respuesta: Aprobado(a)<br>Lugar: FARMATODO</body></html>",
      "utf8",
    ).toString("base64url");

    const envelope = gmailApiMessageToEnvelope({
      id: "msg_1",
      threadId: "thr_1",
      snippet: "DAVIVIENDA: truncated…",
      payload: {
        headers: [
          { name: "From", value: "alerts@bank.example.com" },
          { name: "Subject", value: "DAVIVIENDA" },
        ],
        mimeType: "text/html",
        body: { data: html },
      },
    });

    expect(envelope.bodyText).toContain("Valor Transacción: 124,582");
    expect(envelope.bodyText).toContain("Aprobado(a)");
    expect(envelope.bodyText).toContain("FARMATODO");
    expect(envelope.attachments).toEqual([]);
  });

  it("decodes named HTML entities in text/plain bodies", () => {
    const plain = Buffer.from(
      "N&uacute;mero de transacci&oacute;n: APIE1\nDescripci&oacute;n del pago: Torre 2",
      "utf8",
    ).toString("base64url");

    const envelope = gmailApiMessageToEnvelope({
      id: "msg_entities",
      threadId: "thr_entities",
      snippet: "Pago exitoso",
      payload: {
        headers: [
          { name: "From", value: "notify@bank.example.com" },
          { name: "Subject", value: "Pago exitoso" },
        ],
        mimeType: "text/plain",
        body: { data: plain },
      },
    });

    expect(envelope.bodyText).toContain("Número de transacción: APIE1");
    expect(envelope.bodyText).toContain("Descripción del pago: Torre 2");
  });

  it("lists PDF attachment metadata from parts", () => {
    const envelope = gmailApiMessageToEnvelope({
      id: "msg_pdf",
      payload: {
        headers: [
          { name: "From", value: "alerts@bank.example.com" },
          {
            name: "Subject",
            value: "Extracto tarjeta de Crédito Banco Davivienda 20260628",
          },
        ],
        mimeType: "multipart/mixed",
        parts: [
          {
            mimeType: "text/plain",
            body: {
              data: Buffer.from("Pago mínimo\n$1", "utf8").toString(
                "base64url",
              ),
            },
          },
          {
            mimeType: "application/pdf",
            filename: "extracto.pdf",
            body: { attachmentId: "att_1", size: 2048 },
          },
        ],
      },
    });

    expect(envelope.attachments).toEqual([
      {
        attachmentId: "att_1",
        filename: "extracto.pdf",
        mimeType: "application/pdf",
        size: 2048,
      },
    ]);
  });
});

describe("listPdfAttachmentsFromPayload", () => {
  it("finds nested PDFs", () => {
    const attachments = listPdfAttachmentsFromPayload({
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [{ mimeType: "text/plain", body: { data: "x" } }],
        },
        {
          mimeType: "application/octet-stream",
          filename: "statement.PDF",
          body: { attachmentId: "nested", size: 10 },
        },
      ],
    });
    expect(attachments).toEqual([
      {
        attachmentId: "nested",
        filename: "statement.PDF",
        mimeType: "application/octet-stream",
        size: 10,
      },
    ]);
  });
});
