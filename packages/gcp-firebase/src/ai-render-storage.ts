import { randomUUID } from "node:crypto";

import { getStorage } from "firebase-admin/storage";

import {
  buildFirebaseStorageDownloadUrl,
  validateStorageObjectId,
} from "./tenant-storage.js";
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

export interface UploadAiUiRenderImageResult {
  readonly imageUrl: string;
  readonly storagePath: string;
}

export async function uploadAiUiRenderImage(params: {
  readonly config: FirebaseAdminConfig;
  readonly tenantId: string;
  readonly jobId: string;
  readonly buffer: Buffer;
  readonly contentType?: string;
}): Promise<UploadAiUiRenderImageResult> {
  const objectId = params.jobId.trim();
  if (!validateStorageObjectId(objectId)) {
    throw new Error("Invalid AI render job id for storage.");
  }

  const contentType = params.contentType ?? "image/png";
  const bucketName = resolveStorageBucket(params.config);
  const app = getFirebaseAdminApp(params.config);
  const bucket = getStorage(app).bucket(bucketName);
  const objectPath = `tenants/${params.tenantId}/ai-ui-renders/${objectId}.png`;
  const file = bucket.file(objectPath);

  if (params.config.storageEmulatorHost) {
    await file.save(params.buffer, {
      metadata: {
        contentType,
        cacheControl: "public,max-age=3600",
      },
      resumable: false,
    });

    const publicHost =
      params.config.storageEmulatorPublicHost?.trim() ||
      params.config.storageEmulatorHost;
    const encodedPath = encodeURIComponent(objectPath);
    return {
      imageUrl: `http://${publicHost}/v0/b/${bucketName}/o/${encodedPath}?alt=media`,
      storagePath: objectPath,
    };
  }

  const downloadToken = randomUUID();
  await file.save(params.buffer, {
    metadata: {
      contentType,
      cacheControl: "public,max-age=3600",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return {
    imageUrl: buildFirebaseStorageDownloadUrl(
      bucketName,
      objectPath,
      downloadToken,
    ),
    storagePath: objectPath,
  };
}

export async function downloadAiUiRenderImage(params: {
  readonly config: FirebaseAdminConfig;
  readonly storagePath: string;
}): Promise<Buffer> {
  const bucketName = resolveStorageBucket(params.config);
  const app = getFirebaseAdminApp(params.config);
  const bucket = getStorage(app).bucket(bucketName);
  const file = bucket.file(params.storagePath);
  const [buffer] = await file.download();
  return buffer;
}
