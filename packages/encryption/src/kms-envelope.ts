import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const DEK_LENGTH = 32;
const LOCAL_HKDF_INFO = "kms-envelope-mock";
const LOCAL_KMS_KEY_NAME = "local/kms-envelope-mock";

/**
 * Envelope-encrypted payload. Binary fields are base64 strings;
 * `kmsKeyName` and `aad` are plain UTF-8 strings.
 */
export type EnvelopeEncryptedPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
  wrappedDek: string;
  kmsKeyName: string;
  aad: string;
};

export interface KmsEnvelopeClient {
  wrapDek(
    dek: Buffer,
    aad: string,
  ): Promise<{ wrappedDek: string; kmsKeyName: string }>;
  unwrapDek(
    wrappedDek: string,
    kmsKeyName: string,
    aad: string,
  ): Promise<Buffer>;
}

function deriveLocalKek(masterKeyBase64: string): Buffer {
  const ikm = Buffer.from(masterKeyBase64, "base64");
  return Buffer.from(
    hkdfSync("sha256", ikm, "local-kek", LOCAL_HKDF_INFO, KEY_LENGTH),
  );
}

/**
 * Local/dev KMS stand-in: wraps DEKs with AES-256-GCM using a fixed KEK
 * derived via HKDF from `masterKeyBase64` (info = "kms-envelope-mock").
 */
export function createLocalKmsEnvelopeClient(
  masterKeyBase64: string,
): KmsEnvelopeClient {
  const kek = deriveLocalKek(masterKeyBase64);

  return {
    async wrapDek(dek, aad) {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, kek, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      cipher.setAAD(Buffer.from(aad, "utf8"));
      const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
      const tag = cipher.getAuthTag();
      const wrappedDek = Buffer.concat([iv, ciphertext, tag]).toString(
        "base64",
      );
      return { wrappedDek, kmsKeyName: LOCAL_KMS_KEY_NAME };
    },
    async unwrapDek(wrappedDek, _kmsKeyName, aad) {
      const blob = Buffer.from(wrappedDek, "base64");
      if (blob.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
        throw new Error("Invalid wrapped DEK payload.");
      }
      const iv = blob.subarray(0, IV_LENGTH);
      const tag = blob.subarray(blob.length - AUTH_TAG_LENGTH);
      const ciphertext = blob.subarray(
        IV_LENGTH,
        blob.length - AUTH_TAG_LENGTH,
      );
      const decipher = createDecipheriv(ALGORITHM, kek, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAAD(Buffer.from(aad, "utf8"));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    },
  };
}

export type GcpKmsEnvelopeClientOptions = {
  readonly projectId: string;
  readonly location: string;
  readonly keyRing: string;
  readonly cryptoKey: string;
};

/**
 * Production KMS client using Cloud KMS encrypt/decrypt to wrap data keys.
 */
export function createGcpKmsEnvelopeClient(
  options: GcpKmsEnvelopeClientOptions,
): KmsEnvelopeClient {
  const keyName = `projects/${options.projectId}/locations/${options.location}/keyRings/${options.keyRing}/cryptoKeys/${options.cryptoKey}`;

  type KmsClient = InstanceType<
    typeof import("@google-cloud/kms").KeyManagementServiceClient
  >;
  let clientPromise: Promise<KmsClient> | undefined;

  async function getClient(): Promise<KmsClient> {
    clientPromise ??= (async () => {
      const { KeyManagementServiceClient } = await import("@google-cloud/kms");
      return new KeyManagementServiceClient();
    })();
    return clientPromise;
  }

  return {
    async wrapDek(dek, aad) {
      const client = await getClient();
      const [response] = await client.encrypt({
        name: keyName,
        plaintext: dek,
        additionalAuthenticatedData: Buffer.from(aad, "utf8"),
      });
      if (!response.ciphertext) {
        throw new Error("Cloud KMS encrypt returned empty ciphertext.");
      }
      const wrappedDek = Buffer.from(
        response.ciphertext as Uint8Array,
      ).toString("base64");
      return { wrappedDek, kmsKeyName: keyName };
    },
    async unwrapDek(wrappedDek, kmsKeyName, aad) {
      const client = await getClient();
      const [response] = await client.decrypt({
        name: kmsKeyName || keyName,
        ciphertext: Buffer.from(wrappedDek, "base64"),
        additionalAuthenticatedData: Buffer.from(aad, "utf8"),
      });
      if (!response.plaintext) {
        throw new Error("Cloud KMS decrypt returned empty plaintext.");
      }
      return Buffer.from(response.plaintext as Uint8Array);
    },
  };
}

export async function encryptEnvelope(
  plaintext: string | Buffer,
  client: KmsEnvelopeClient,
  aad: string,
): Promise<EnvelopeEncryptedPayload> {
  const dek = randomBytes(DEK_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const plain =
    typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext;

  const cipher = createCipheriv(ALGORITHM, dek, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  const { wrappedDek, kmsKeyName } = await client.wrapDek(dek, aad);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    wrappedDek,
    kmsKeyName,
    aad,
  };
}

export async function decryptEnvelope(
  payload: EnvelopeEncryptedPayload,
  client: KmsEnvelopeClient,
): Promise<Buffer> {
  const dek = await client.unwrapDek(
    payload.wrappedDek,
    payload.kmsKeyName,
    payload.aad,
  );
  const iv = Buffer.from(payload.iv, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const tag = Buffer.from(payload.tag, "base64");

  const decipher = createDecipheriv(ALGORITHM, dek, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAAD(Buffer.from(payload.aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
