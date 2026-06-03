import type { EntityFileReference } from "@repo/entities";

import { apiRequest } from "./api-client";

export interface EntityFileDownloadTarget {
  readonly entityName: string;
  readonly recordId: string;
  readonly fieldName: string;
}

interface EntityFileReferenceWithDownload extends EntityFileReference {
  readonly downloadUrl?: string;
}

export function isEntityFileReferenceWithDownload(
  value: unknown,
): value is EntityFileReferenceWithDownload {
  return (
    typeof value === "object" &&
    value !== null &&
    "storagePath" in value &&
    typeof (value as EntityFileReference).storagePath === "string" &&
    "fileName" in value &&
    typeof (value as EntityFileReference).fileName === "string"
  );
}

export async function uploadEntityFile(input: {
  readonly entityName: string;
  readonly fieldName: string;
  readonly contentType: string;
  readonly fileName: string;
  readonly data: string;
  readonly recordId?: string;
  readonly purpose?: "record" | "fieldDefault" | "layoutStatic";
}): Promise<EntityFileReferenceWithDownload> {
  const response = await apiRequest<{
    readonly file: EntityFileReferenceWithDownload;
  }>("/api/entity-files/upload", {
    method: "POST",
    body: input,
  });
  return response.file;
}

export async function fetchEntityFileDownloadUrl(
  target: EntityFileDownloadTarget,
): Promise<string> {
  const response = await apiRequest<{ readonly downloadUrl: string }>(
    "/api/entity-files/download",
    {
      query: {
        entityName: target.entityName,
        recordId: target.recordId,
        fieldName: target.fieldName,
      },
    },
  );
  return response.downloadUrl;
}

export async function fetchEntityFileDownloadUrlByStoragePath(
  entityName: string,
  storagePath: string,
): Promise<string> {
  const response = await apiRequest<{ readonly downloadUrl: string }>(
    "/api/entity-files/download-storage",
    {
      query: {
        entityName,
        storagePath,
      },
    },
  );
  return response.downloadUrl;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Invalid file data."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}
