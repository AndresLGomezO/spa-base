import { createHash, randomUUID } from "node:crypto";

import { getStorage } from "firebase-admin/storage";

import {
  DOCUMENT_CONTENT_TYPES,
  IMAGE_CONTENT_TYPES,
  type EntityFileReference,
} from "@repo/entities";

import {
  getFirebaseAdminApp,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import {
  buildFirebaseStorageDownloadUrl,
  validateStorageObjectId,
} from "./tenant-storage.js";

export type EntityFileFieldType = "image" | "document";

const FIREBASE_DOWNLOAD_TOKEN_METADATA_KEY = "firebaseStorageDownloadTokens";

const CONTENT_TYPES_BY_FIELD_TYPE: Record<
  EntityFileFieldType,
  readonly string[]
> = {
  image: IMAGE_CONTENT_TYPES,
  document: DOCUMENT_CONTENT_TYPES,
};

function resolveStorageBucket(config: FirebaseAdminConfig): string {
  if (config.storageBucket?.trim()) {
    return config.storageBucket.trim();
  }
  return `${config.projectId}.appspot.com`;
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("pdf")) return "pdf";
  return "jpg";
}

function buildEntityFileObjectPath(params: {
  readonly tenantId: string;
  readonly entityName: string;
  readonly objectId: string;
  readonly contentType: string;
}): string {
  const extension = extensionForContentType(params.contentType);
  return `tenants/${params.tenantId}/entity-files/${params.entityName}/${params.objectId}.${extension}`;
}

function buildEmulatorDownloadUrl(
  config: FirebaseAdminConfig,
  bucketName: string,
  storagePath: string,
): string {
  const publicHost =
    config.storageEmulatorPublicHost?.trim() || config.storageEmulatorHost;
  const encodedPath = encodeURIComponent(storagePath);
  return `http://${publicHost}/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
}

async function resolveOrCreateDownloadToken(file: {
  getMetadata: () => Promise<
    [
      {
        metadata?: Readonly<Record<string, string | number | boolean | null>>;
      },
      ...unknown[],
    ]
  >;
  setMetadata: (metadata: {
    metadata: Record<string, string>;
  }) => Promise<unknown>;
}): Promise<string> {
  const [metadata] = await file.getMetadata();
  const customMetadata = metadata.metadata ?? {};
  const existingToken = customMetadata[FIREBASE_DOWNLOAD_TOKEN_METADATA_KEY];
  if (typeof existingToken === "string" && existingToken.trim()) {
    return existingToken.trim();
  }

  const downloadToken = randomUUID();
  await file.setMetadata({
    metadata: {
      ...customMetadata,
      [FIREBASE_DOWNLOAD_TOKEN_METADATA_KEY]: downloadToken,
    },
  });
  return downloadToken;
}

/** Opaque storage key for entity file objects. Never derived from user filenames. */
export function generateEntityFileObjectId(): string {
  return randomUUID();
}

/** Deterministic opaque id for idempotent seeds (same seed → same object id). */
export function createStableEntityFileObjectId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

export function buildFieldDefaultEntityFileObjectId(fieldName: string): string {
  return `field-default-${fieldName}`;
}

export function validateEntityFileContentType(
  fieldType: EntityFileFieldType,
  contentType: string,
): boolean {
  return CONTENT_TYPES_BY_FIELD_TYPE[fieldType].includes(contentType);
}

export async function uploadEntityFile(params: {
  readonly config: FirebaseAdminConfig;
  readonly tenantId: string;
  readonly entityName: string;
  readonly fieldName: string;
  readonly fieldType: EntityFileFieldType;
  readonly objectId: string;
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly fileName: string;
  readonly uploadedBy: string;
}): Promise<EntityFileReference> {
  if (!validateStorageObjectId(params.objectId)) {
    throw new Error("Invalid storage object id.");
  }

  if (!validateEntityFileContentType(params.fieldType, params.contentType)) {
    throw new Error("Unsupported content type for field type.");
  }

  const bucketName = resolveStorageBucket(params.config);
  const app = getFirebaseAdminApp(params.config);
  const bucket = getStorage(app).bucket(bucketName);
  const objectPath = buildEntityFileObjectPath({
    tenantId: params.tenantId,
    entityName: params.entityName,
    objectId: params.objectId,
    contentType: params.contentType,
  });
  const file = bucket.file(objectPath);
  const customMetadata = {
    tenantId: params.tenantId,
    uploadedBy: params.uploadedBy,
    entityName: params.entityName,
    fieldName: params.fieldName,
    fieldType: params.fieldType,
    fileName: params.fileName,
  };

  if (params.config.storageEmulatorHost) {
    await file.save(params.buffer, {
      metadata: {
        contentType: params.contentType,
        cacheControl: "private, max-age=0",
        metadata: customMetadata,
      },
      resumable: false,
    });
  } else {
    const downloadToken = randomUUID();
    await file.save(params.buffer, {
      metadata: {
        contentType: params.contentType,
        cacheControl: "private, max-age=0",
        metadata: {
          ...customMetadata,
          [FIREBASE_DOWNLOAD_TOKEN_METADATA_KEY]: downloadToken,
        },
      },
      resumable: false,
    });
  }

  return {
    storagePath: objectPath,
    contentType: params.contentType,
    fileName: params.fileName,
  };
}

export async function createEntityFileDownloadUrl(params: {
  readonly config: FirebaseAdminConfig;
  readonly storagePath: string;
}): Promise<string> {
  const bucketName = resolveStorageBucket(params.config);
  const app = getFirebaseAdminApp(params.config);
  const bucket = getStorage(app).bucket(bucketName);
  const file = bucket.file(params.storagePath);

  if (params.config.storageEmulatorHost) {
    return buildEmulatorDownloadUrl(
      params.config,
      bucketName,
      params.storagePath,
    );
  }

  const downloadToken = await resolveOrCreateDownloadToken(file);
  return buildFirebaseStorageDownloadUrl(
    bucketName,
    params.storagePath,
    downloadToken,
  );
}
