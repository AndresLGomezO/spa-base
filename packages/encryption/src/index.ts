export {
  deriveKey,
  deriveUserKey,
  encryptValue,
  decryptValue,
  encryptFields,
  decryptFields,
} from "./field-encryption.js";

export {
  createLocalKmsEnvelopeClient,
  createGcpKmsEnvelopeClient,
  encryptEnvelope,
  decryptEnvelope,
  type EnvelopeEncryptedPayload,
  type KmsEnvelopeClient,
  type GcpKmsEnvelopeClientOptions,
} from "./kms-envelope.js";
