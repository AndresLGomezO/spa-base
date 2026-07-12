import { decryptValue, deriveUserKey, encryptValue } from "@repo/encryption";

export function encryptUserSecret(
  masterKey: string,
  userId: string,
  plaintext: string,
): string {
  return encryptValue(plaintext, deriveUserKey(masterKey, userId));
}

export function decryptUserSecret(
  masterKey: string,
  userId: string,
  ciphertext: string,
): string {
  return decryptValue(ciphertext, deriveUserKey(masterKey, userId));
}
