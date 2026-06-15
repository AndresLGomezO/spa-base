import { randomUUID } from "node:crypto";

import { getStorage } from "firebase-admin/storage";

import {
  getFirebaseAdminApp,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

function resolveStorageBucket(config: FirebaseAdminConfig): string {
  if (config.storageBucket?.trim()) {
    return config.storageBucket.trim();
  }
  return `${config.projectId}.appspot.com`;
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("svg")) return "svg";
  return "jpg";
}

const STORAGE_OBJECT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function validateStorageObjectId(objectId: string): boolean {
  return STORAGE_OBJECT_ID_PATTERN.test(objectId);
}

export function buildFirebaseStorageDownloadUrl(
  bucketName: string,
  objectPath: string,
  downloadToken: string,
): string {
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}

export function buildTenantLogoDownloadUrl(
  bucketName: string,
  objectPath: string,
  downloadToken: string,
): string {
  return buildFirebaseStorageDownloadUrl(bucketName, objectPath, downloadToken);
}

export async function uploadTenantLogo(params: {
  readonly config: FirebaseAdminConfig;
  readonly tenantId: string;
  readonly objectId: string;
  readonly buffer: Buffer;
  readonly contentType: string;
}): Promise<string> {
  if (!validateStorageObjectId(params.objectId)) {
    throw new Error("Invalid storage object id.");
  }

  const bucketName = resolveStorageBucket(params.config);
  const app = getFirebaseAdminApp(params.config);
  const bucket = getStorage(app).bucket(bucketName);
  const extension = extensionForContentType(params.contentType);
  const objectPath = `tenants/${params.tenantId}/images/${params.objectId}.${extension}`;
  const file = bucket.file(objectPath);

  if (params.config.storageEmulatorHost) {
    await file.save(params.buffer, {
      metadata: {
        contentType: params.contentType,
        cacheControl: "public,max-age=3600",
      },
      resumable: false,
    });

    const publicHost =
      params.config.storageEmulatorPublicHost?.trim() ||
      params.config.storageEmulatorHost;
    const encodedPath = encodeURIComponent(objectPath);
    return `http://${publicHost}/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
  }

  const downloadToken = randomUUID();
  await file.save(params.buffer, {
    metadata: {
      contentType: params.contentType,
      cacheControl: "public,max-age=3600",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return buildTenantLogoDownloadUrl(bucketName, objectPath, downloadToken);
}

export async function uploadTenantDashboardImage(params: {
  readonly config: FirebaseAdminConfig;
  readonly tenantId: string;
  readonly objectId: string;
  readonly buffer: Buffer;
  readonly contentType: string;
}): Promise<string> {
  if (!validateStorageObjectId(params.objectId)) {
    throw new Error("Invalid storage object id.");
  }

  const bucketName = resolveStorageBucket(params.config);
  const app = getFirebaseAdminApp(params.config);
  const bucket = getStorage(app).bucket(bucketName);
  const extension = extensionForContentType(params.contentType);
  const objectPath = `tenants/${params.tenantId}/dashboard/${params.objectId}.${extension}`;
  const file = bucket.file(objectPath);

  if (params.config.storageEmulatorHost) {
    await file.save(params.buffer, {
      metadata: {
        contentType: params.contentType,
        cacheControl: "public,max-age=3600",
      },
      resumable: false,
    });

    const publicHost =
      params.config.storageEmulatorPublicHost?.trim() ||
      params.config.storageEmulatorHost;
    const encodedPath = encodeURIComponent(objectPath);
    return `http://${publicHost}/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
  }

  const downloadToken = randomUUID();
  await file.save(params.buffer, {
    metadata: {
      contentType: params.contentType,
      cacheControl: "public,max-age=3600",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return buildFirebaseStorageDownloadUrl(bucketName, objectPath, downloadToken);
}
