import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import type { NormalizedFieldMeta } from "@repo/entities";
import {
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  ENTITY_UI_OVERRIDE_PERMISSIONS,
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  LAYOUT_STATIC_IMAGE_FIELD_NAME,
  MAX_ENTITY_FILE_UPLOAD_REQUEST_BODY_BYTES,
} from "@repo/entities";
import { hasPermission } from "@repo/rbac";
import {
  defineEntityFromRecord,
  type FieldDefinitionRecord,
} from "@repo/dynamic-entities";
import {
  uploadEntityFile,
  createEntityFileDownloadUrl,
  validateEntityFileContentType,
  generateEntityFileObjectId,
  buildFieldDefaultEntityFileObjectId,
  type EntityFileFieldType,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { checkRecordAccess } from "../access/record-access.js";
import { requireRequestTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import {
  assertRequestWritableFields,
  resolveRequestFieldAccessMap,
} from "../rbac/create-field-access-resolver.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import { loadRequestPermissions } from "../rbac/load-request-permissions.js";
import {
  fileReferenceMatchesRecordField,
  resolveFileFieldMeta,
  resolveMaxSizeBytesForFileFieldMeta,
} from "./entity-file-field-utils.js";

const uploadBodySchema = z.object({
  entityName: z.string().trim().min(1),
  fieldName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255),
  data: z.string().trim().min(1),
  recordId: z.string().trim().min(1).optional(),
  purpose: z.enum(["record", "fieldDefault", "layoutStatic"]).optional(),
});

const downloadStorageQuerySchema = z.object({
  entityName: z.string().trim().min(1),
  storagePath: z.string().trim().min(1),
});

const downloadQuerySchema = z.object({
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  fieldName: z.string().trim().min(1),
});

interface RegisterEntityFileRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly prefix?: string;
}

function decodeBase64Payload(data: string): Buffer {
  try {
    return Buffer.from(data, "base64");
  } catch {
    throw new Error("Invalid base64 file data.");
  }
}

function storagePathBelongsToEntity(
  tenantId: string,
  entityName: string,
  storagePath: string,
): boolean {
  const prefix = `tenants/${tenantId}/entity-files/${entityName}/`;
  return storagePath.startsWith(prefix);
}

function fieldTypeForMeta(type: string): EntityFileFieldType | null {
  if (type === "image" || type === "document") {
    return type;
  }
  return null;
}

async function resolveUploadFileFieldMeta(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
  entityName: string,
  fieldName: string,
): Promise<NormalizedFieldMeta | null> {
  const entity = entityRuntime.resolveEntity(entityName, tenantId);
  if (entity) {
    return resolveFileFieldMeta(entity, fieldName);
  }

  const definition = await entityRuntime.entityDefinitionRepository.getByName(
    tenantId,
    entityName,
  );
  if (!definition) {
    return null;
  }

  const field = definition.fields.find(
    (entry: FieldDefinitionRecord) => entry.name === fieldName,
  );
  if (!field || (field.type !== "image" && field.type !== "document")) {
    return null;
  }

  const runtimeEntity = defineEntityFromRecord(definition);
  return resolveFileFieldMeta(runtimeEntity, fieldName);
}

export function registerEntityFileRoutes(
  app: FastifyInstance,
  options: RegisterEntityFileRoutesOptions,
): void {
  const prefix = options.prefix ?? "/api";

  app.post(
    `${prefix}/entity-files/upload`,
    {
      preHandler: options.authenticate,
      bodyLimit: MAX_ENTITY_FILE_UPLOAD_REQUEST_BODY_BYTES,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId || !request.ctx) {
        return;
      }
      const ctx = request.ctx;

      await loadRequestPermissions(request, options.permissionDeps);

      const parsedBody = uploadBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid upload body.",
        );
      }

      const body = parsedBody.data;
      const purpose = body.purpose ?? "record";
      const isFieldDefaultUpload = purpose === "fieldDefault";
      const isLayoutStaticUpload = purpose === "layoutStatic";

      if ((isFieldDefaultUpload || isLayoutStaticUpload) && body.recordId) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Layout and field default uploads cannot include recordId.",
        );
      }

      let fieldMeta = await resolveUploadFileFieldMeta(
        options.entityRuntime,
        tenantId,
        body.entityName,
        body.fieldName,
      );
      if (
        !fieldMeta &&
        isLayoutStaticUpload &&
        body.fieldName === LAYOUT_STATIC_IMAGE_FIELD_NAME
      ) {
        fieldMeta = {
          type: "image",
          required: false,
          optional: true,
          maxSizeBytes: DEFAULT_IMAGE_MAX_SIZE_BYTES,
        };
      }
      if (!fieldMeta) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity or file field not found.",
        );
      }

      const fieldType = fieldTypeForMeta(fieldMeta.type);
      if (!fieldType) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Unsupported file field type.",
        );
      }

      if (
        (isFieldDefaultUpload || isLayoutStaticUpload) &&
        fieldType !== "image"
      ) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Only image fields support layout and default image uploads.",
        );
      }

      if (!validateEntityFileContentType(fieldType, body.contentType)) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Content type is not allowed for this field.",
        );
      }

      if (isLayoutStaticUpload) {
        const canUploadLayoutStatic =
          ctx.isSuperAdmin ||
          ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS.some((permission) =>
            hasPermission(permission, ctx.permissions ?? [], {
              isSuperAdmin: ctx.isSuperAdmin,
            }),
          );
        if (!canUploadLayoutStatic) {
          return replyWithError(
            reply,
            403,
            ApiErrorCode.FORBIDDEN,
            "Insufficient permissions to upload layout image.",
          );
        }
      } else if (isFieldDefaultUpload) {
        const canUpdateDefinitions =
          request.ctx.isSuperAdmin ||
          hasPermission(
            "entityDefinition.update",
            request.ctx.permissions ?? [],
            {
              isSuperAdmin: request.ctx.isSuperAdmin,
            },
          ) ||
          hasPermission(
            "entityDefinition.create",
            request.ctx.permissions ?? [],
            {
              isSuperAdmin: request.ctx.isSuperAdmin,
            },
          );
        if (!canUpdateDefinitions) {
          return replyWithError(
            reply,
            403,
            ApiErrorCode.FORBIDDEN,
            "Insufficient permissions to upload field default image.",
          );
        }
      } else {
        const permissionAction = body.recordId ? "update" : "create";
        const requiredPermission = `${body.entityName}.${permissionAction}`;
        if (
          !request.ctx.isSuperAdmin &&
          !hasPermission(requiredPermission, request.ctx.permissions ?? [], {
            isSuperAdmin: request.ctx.isSuperAdmin,
          })
        ) {
          return replyWithError(
            reply,
            403,
            ApiErrorCode.FORBIDDEN,
            "Insufficient permissions to upload file.",
          );
        }

        const entity = options.entityRuntime.resolveEntity(
          body.entityName,
          tenantId,
        );
        if (!entity) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Entity not found.",
          );
        }

        const businessFieldNames = Object.keys(entity.metadata.fields);
        try {
          assertRequestWritableFields(
            { [body.fieldName]: {} },
            request.ctx,
            body.entityName,
            businessFieldNames,
            permissionAction,
          );
        } catch (error) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            error instanceof Error ? error.message : "Field is not writable.",
          );
        }

        if (body.recordId) {
          const repository = options.entityRuntime.getRepository(
            tenantId,
            body.entityName,
          );
          if (!repository) {
            return replyWithError(
              reply,
              404,
              ApiErrorCode.NOT_FOUND,
              "Entity not found.",
            );
          }

          const existing = await repository.findById(body.recordId, tenantId);
          if (!existing) {
            return replyWithError(
              reply,
              404,
              ApiErrorCode.NOT_FOUND,
              "Record not found.",
            );
          }

          const recordData = existing as unknown as Record<string, unknown>;
          if (recordData.ownerId !== undefined) {
            const access = checkRecordAccess(recordData, request.ctx.uid);
            if (!access.canWrite) {
              return replyWithError(
                reply,
                404,
                ApiErrorCode.NOT_FOUND,
                "Record not found.",
              );
            }
          }
        }
      }

      const objectId = isFieldDefaultUpload
        ? buildFieldDefaultEntityFileObjectId(body.fieldName)
        : generateEntityFileObjectId();

      let buffer: Buffer;
      try {
        buffer = decodeBase64Payload(body.data);
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : "Invalid file data.",
        );
      }

      const maxSizeBytes = resolveMaxSizeBytesForFileFieldMeta(fieldMeta);
      if (buffer.length > maxSizeBytes) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `File exceeds maximum size of ${maxSizeBytes} bytes.`,
        );
      }

      try {
        const file = await uploadEntityFile({
          config: options.firebaseAdminConfig,
          tenantId,
          entityName: body.entityName,
          fieldName: body.fieldName,
          fieldType,
          objectId,
          buffer,
          contentType: body.contentType,
          fileName: body.fileName,
          uploadedBy: request.ctx.uid,
        });

        const downloadUrl = await createEntityFileDownloadUrl({
          config: options.firebaseAdminConfig,
          storagePath: file.storagePath,
        });

        return reply.send(successEnvelope({ file: { ...file, downloadUrl } }));
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : "Upload failed.",
        );
      }
    },
  );

  app.get(
    `${prefix}/entity-files/download`,
    { preHandler: options.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId || !request.ctx) {
        return;
      }

      const parsedQuery = downloadQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid download query.",
        );
      }

      const query = parsedQuery.data;
      await loadRequestPermissions(request, options.permissionDeps);
      const permissions = request.ctx.permissions ?? [];
      const readPermission = `${query.entityName}.read`;
      if (
        !request.ctx.isSuperAdmin &&
        !hasPermission(readPermission, permissions, {
          isSuperAdmin: request.ctx.isSuperAdmin,
        })
      ) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "You do not have permission to perform this action.",
        );
      }

      const entity = options.entityRuntime.resolveEntity(
        query.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      const fieldMeta = resolveFileFieldMeta(entity, query.fieldName);
      if (!fieldMeta) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Field is not a file field.",
        );
      }

      const fieldAccess = resolveRequestFieldAccessMap(
        request.ctx,
        query.entityName,
        Object.keys(entity.metadata.fields),
        "read",
      );
      if (
        !request.ctx.isSuperAdmin &&
        fieldAccess[query.fieldName] === "none"
      ) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "Field access denied.",
        );
      }

      const repository = options.entityRuntime.getRepository(
        tenantId,
        query.entityName,
      );
      if (!repository) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      const record = await repository.findById(query.recordId, tenantId);
      if (!record) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      const recordData = record as unknown as Record<string, unknown>;
      if (recordData.ownerId !== undefined) {
        const access = checkRecordAccess(recordData, request.ctx.uid);
        if (!access.canRead) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Record not found.",
          );
        }
      }

      const fieldValue = recordData[query.fieldName];
      if (
        typeof fieldValue !== "object" ||
        fieldValue === null ||
        !("storagePath" in fieldValue) ||
        typeof (fieldValue as { storagePath: unknown }).storagePath !== "string"
      ) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "File not found.",
        );
      }

      const storagePath = (fieldValue as { storagePath: string }).storagePath;
      if (
        !fileReferenceMatchesRecordField(
          recordData,
          query.fieldName,
          storagePath,
        )
      ) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "File not found.",
        );
      }

      try {
        const downloadUrl = await createEntityFileDownloadUrl({
          config: options.firebaseAdminConfig,
          storagePath,
        });
        return reply.send(successEnvelope({ downloadUrl }));
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : "Download failed.",
        );
      }
    },
  );

  app.get(
    `${prefix}/entity-files/download-storage`,
    { preHandler: options.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId || !request.ctx) {
        return;
      }
      const ctx = request.ctx;

      const parsedQuery = downloadStorageQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid download query.",
        );
      }

      const query = parsedQuery.data;
      if (
        !storagePathBelongsToEntity(
          tenantId,
          query.entityName,
          query.storagePath,
        )
      ) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "File not found.",
        );
      }

      await loadRequestPermissions(request, options.permissionDeps);
      const permissions = ctx.permissions ?? [];
      const readPermission = `${query.entityName}.read`;
      const canReadLayoutFile =
        ctx.isSuperAdmin ||
        hasPermission(readPermission, permissions, {
          isSuperAdmin: ctx.isSuperAdmin,
        }) ||
        ENTITY_UI_OVERRIDE_PERMISSIONS.some((permission) =>
          hasPermission(permission, permissions, {
            isSuperAdmin: ctx.isSuperAdmin,
          }),
        );

      if (!canReadLayoutFile) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "You do not have permission to perform this action.",
        );
      }

      try {
        const downloadUrl = await createEntityFileDownloadUrl({
          config: options.firebaseAdminConfig,
          storagePath: query.storagePath,
        });
        return reply.send(successEnvelope({ downloadUrl }));
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : "Download failed.",
        );
      }
    },
  );
}
