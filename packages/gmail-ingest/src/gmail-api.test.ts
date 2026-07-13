import { describe, expect, it } from "vitest";

import { gmailApiMessageToEnvelope } from "./gmail-api.js";

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
          { name: "From", value: "BANCO_DAVIVIENDA@davivienda.com" },
          { name: "Subject", value: "DAVIVIENDA" },
        ],
        mimeType: "text/html",
        body: { data: html },
      },
    });

    expect(envelope.bodyText).toContain("Valor Transacción: 124,582");
    expect(envelope.bodyText).toContain("Aprobado(a)");
    expect(envelope.bodyText).toContain("FARMATODO");
  });
});
