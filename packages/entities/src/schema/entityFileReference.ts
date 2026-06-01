import { z } from "zod";

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DOCUMENT_CONTENT_TYPES = ["application/pdf"] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];
export type DocumentContentType = (typeof DOCUMENT_CONTENT_TYPES)[number];

export interface EntityFileReference {
  readonly storagePath: string;
  readonly contentType: string;
  readonly fileName: string;
}

export interface EntityFileReferenceWithDownload extends EntityFileReference {
  readonly downloadUrl?: string;
}

const storagePathSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^tenants\/[^/]+\/entity-files\/[^/]+\/[a-zA-Z0-9_-]+\.[a-z0-9]+$/);

const fileNameSchema = z.string().trim().min(1).max(255);

export const entityFileReferenceSchema = z
  .object({
    storagePath: storagePathSchema,
    contentType: z.string().trim().min(1),
    fileName: fileNameSchema,
  })
  .strict();

export function createEntityFileReferenceSchema(
  allowedContentTypes: readonly string[],
): z.ZodType<EntityFileReference> {
  const strictSchema = entityFileReferenceSchema.superRefine((value, ctx) => {
    if (!allowedContentTypes.includes(value.contentType)) {
      ctx.addIssue({
        code: "custom",
        message: `Unsupported content type "${value.contentType}".`,
        path: ["contentType"],
      });
    }
  });

  return z.preprocess(
    (value) =>
      value === undefined || value === null
        ? value
        : stripDownloadUrlFromFileReference(value),
    strictSchema,
  );
}

export const imageFileReferenceSchema =
  createEntityFileReferenceSchema(IMAGE_CONTENT_TYPES);

export const documentFileReferenceSchema = createEntityFileReferenceSchema(
  DOCUMENT_CONTENT_TYPES,
);

export function isEntityFileReference(
  value: unknown,
): value is EntityFileReference {
  return entityFileReferenceSchema.safeParse(value).success;
}

export function stripDownloadUrlFromFileReference(value: unknown): unknown {
  if (
    typeof value !== "object" ||
    value === null ||
    !("storagePath" in value)
  ) {
    return value;
  }

  const { downloadUrl: _downloadUrl, ...rest } =
    value as EntityFileReferenceWithDownload & Record<string, unknown>;
  void _downloadUrl;
  return rest;
}
