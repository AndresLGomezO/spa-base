import { describe, expect, it } from "vitest";

import {
  deriveKey,
  deriveUserKey,
  encryptValue,
  decryptValue,
  encryptFields,
  decryptFields,
} from "./field-encryption.js";

const TEST_MASTER_KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef",
  "utf8",
).toString("base64");

describe("deriveKey", () => {
  it("returns a 32-byte buffer", () => {
    const key = deriveKey(TEST_MASTER_KEY, "tenant-1");
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it("produces different keys for different tenants", () => {
    const key1 = deriveKey(TEST_MASTER_KEY, "tenant-1");
    const key2 = deriveKey(TEST_MASTER_KEY, "tenant-2");
    expect(key1.equals(key2)).toBe(false);
  });
});

describe("deriveUserKey", () => {
  it("returns a 32-byte buffer distinct from tenant keys", () => {
    const userKey = deriveUserKey(TEST_MASTER_KEY, "uid-1");
    const tenantKey = deriveKey(TEST_MASTER_KEY, "uid-1");
    expect(userKey).toBeInstanceOf(Buffer);
    expect(userKey.length).toBe(32);
    expect(userKey.equals(tenantKey)).toBe(false);
  });

  it("produces different keys for different users", () => {
    const key1 = deriveUserKey(TEST_MASTER_KEY, "uid-1");
    const key2 = deriveUserKey(TEST_MASTER_KEY, "uid-2");
    expect(key1.equals(key2)).toBe(false);
  });
});

describe("encryptValue / decryptValue", () => {
  const key = deriveKey(TEST_MASTER_KEY, "tenant-1");

  it("round-trips a plaintext string", () => {
    const plaintext = "hello, world!";
    const encrypted = encryptValue(plaintext, key);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(decryptValue(encrypted, key)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext", () => {
    const plaintext = "test value";
    const a = encryptValue(plaintext, key);
    const b = encryptValue(plaintext, key);
    expect(a).not.toBe(b);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptValue("secret", key);
    const parts = encrypted.split(".");
    parts[1] = Buffer.from("tampered").toString("base64");
    expect(() => decryptValue(parts.join("."), key)).toThrow();
  });

  it("throws on invalid format", () => {
    expect(() => decryptValue("not-valid", key)).toThrow(
      "Invalid encrypted value format",
    );
  });
});

describe("encryptFields / decryptFields", () => {
  const key = deriveKey(TEST_MASTER_KEY, "tenant-1");

  it("encrypts and decrypts only the listed fields", () => {
    const data = { name: "Alice", email: "alice@example.com", age: 30 };
    const encrypted = encryptFields(data, ["email"], key);

    expect(encrypted.name).toBe("Alice");
    expect(encrypted.age).toBe(30);
    expect(encrypted.email).not.toBe("alice@example.com");
    expect(typeof encrypted.email).toBe("string");

    const decrypted = decryptFields(encrypted, ["email"], key);
    expect(decrypted.email).toBe("alice@example.com");
  });

  it("skips null and undefined values", () => {
    const data = { name: "Bob", email: null, phone: undefined };
    const encrypted = encryptFields(data, ["email", "phone"], key);
    expect(encrypted.email).toBeNull();
    expect(encrypted.phone).toBeUndefined();
  });

  it("handles non-string values via JSON serialization", () => {
    const data = { score: 99.5 };
    const encrypted = encryptFields(data, ["score"], key);
    const decrypted = decryptFields(encrypted, ["score"], key);
    expect(decrypted.score).toBe(99.5);
  });

  it("returns data unchanged when sensitiveFieldNames is empty", () => {
    const data = { name: "Test" };
    expect(encryptFields(data, [], key)).toBe(data);
    expect(decryptFields(data, [], key)).toBe(data);
  });
});
