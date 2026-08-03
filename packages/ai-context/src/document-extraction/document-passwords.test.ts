import { describe, expect, it } from "vitest";

import {
  decodeDocumentPasswords,
  encodeDocumentPasswords,
  getDocumentPassword,
  listDocumentTypesWithPassword,
  DOCUMENT_PASSWORDS_PREFIX,
} from "./document-passwords.js";

describe("document-passwords helpers", () => {
  it("round-trips a password map with a non-JSON prefix", () => {
    const encoded = encodeDocumentPasswords({
      STATEMENT: "s3cret",
      INVOICE: "inv",
    });
    expect(encoded.startsWith(DOCUMENT_PASSWORDS_PREFIX)).toBe(true);
    expect(() => JSON.parse(encoded)).toThrow();
    expect(decodeDocumentPasswords(encoded)).toEqual({
      STATEMENT: "s3cret",
      INVOICE: "inv",
    });
  });

  it("looks up passwords case-insensitively and lists set types", () => {
    const encoded = encodeDocumentPasswords({ STATEMENT: "pw" });
    expect(getDocumentPassword(encoded, "statement")).toBe("pw");
    expect(getDocumentPassword(encoded, "INVOICE")).toBeUndefined();
    expect(listDocumentTypesWithPassword(encoded)).toEqual(["STATEMENT"]);
  });

  it("ignores empty / unknown keys", () => {
    expect(
      decodeDocumentPasswords(
        `${DOCUMENT_PASSWORDS_PREFIX}${JSON.stringify({
          STATEMENT: "ok",
          BOGUS: "x",
          RECEIPT: "",
        })}`,
      ),
    ).toEqual({ STATEMENT: "ok" });
  });
});
