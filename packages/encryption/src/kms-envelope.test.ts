import { describe, expect, it } from "vitest";

import {
  createLocalKmsEnvelopeClient,
  decryptEnvelope,
  encryptEnvelope,
} from "./kms-envelope.js";

const TEST_MASTER_KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef",
  "utf8",
).toString("base64");

describe("kms-envelope (local client)", () => {
  const client = createLocalKmsEnvelopeClient(TEST_MASTER_KEY);

  it("round-trips a string payload", async () => {
    const aad = "tenant:t1:extraction:e1";
    const plaintext = JSON.stringify({
      statementDate: "2026-01-15",
      accountNumberEncrypted: "4111111111111111",
    });

    const payload = await encryptEnvelope(plaintext, client, aad);
    expect(payload.ciphertext).not.toBe(plaintext);
    expect(payload.iv).toBeTruthy();
    expect(payload.tag).toBeTruthy();
    expect(payload.wrappedDek).toBeTruthy();
    expect(payload.kmsKeyName).toBe("local/kms-envelope-mock");
    expect(payload.aad).toBe(aad);

    const decrypted = await decryptEnvelope(payload, client);
    expect(decrypted.toString("utf8")).toBe(plaintext);
  });

  it("round-trips a Buffer payload", async () => {
    const aad = "tenant:t1:buf";
    const plaintext = Buffer.from([1, 2, 3, 4, 5, 255]);
    const payload = await encryptEnvelope(plaintext, client, aad);
    const decrypted = await decryptEnvelope(payload, client);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it("fails when AAD mismatches on decrypt", async () => {
    const payload = await encryptEnvelope("secret", client, "aad-a");
    await expect(
      decryptEnvelope({ ...payload, aad: "aad-b" }, client),
    ).rejects.toThrow();
  });

  it("produces different ciphertexts for the same plaintext", async () => {
    const aad = "same-aad";
    const a = await encryptEnvelope("same", client, aad);
    const b = await encryptEnvelope("same", client, aad);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.wrappedDek).not.toBe(b.wrappedDek);
  });
});
