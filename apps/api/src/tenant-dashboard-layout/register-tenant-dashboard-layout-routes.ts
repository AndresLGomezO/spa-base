import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  MAX_IMAGE_UPLOAD_REQUEST_BODY_BYTES,
  putTenantDashboardLayoutInputSchema,
  tenantDashboardLayoutRecordSchema,
} from "@repo/entities";
import type { TenantDashboardLayoutRepository } from "@repo/firestore-converters";
import {
  uploadTenantDashboardImage,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { createEmptyLayout } from "@repo/ui-builder-core";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterTenantDashboardLayoutRoutesOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly tenantDashboardLayoutRepository: TenantDashboardLayoutRepository;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
}

const uploadDashboardImageBodySchema = z.object({
  contentType: z.string().trim().min(1),
  data: z.string().trim().min(1),
});

function formatZodValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid tenant dashboard layout payload.";
  }
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

function createDefaultTenantDashboardLayoutRecord(tenantId: string) {
  return tenantDashboardLayoutRecordSchema.parse({
    tenantId,
    dashboardSections: [],
    dashboardLayout: createEmptyLayout(1),
    updatedAt: new Date().toISOString(),
  });
}

export async function registerTenantDashboardLayoutRoutes(
  app: FastifyInstance,
  options: RegisterTenantDashboardLayoutRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "entityUiOverride.read",
  );
  const requireWrite = createRequireAnyPermission(
    options.permissionDeps,
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  app.get(
    "/api/tenant-dashboard-layout",
    {
      preHandler: [
        options.authenticate,
        requireRead as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const record =
        (await options.tenantDashboardLayoutRepository.get(tenantId)) ??
        createDefaultTenantDashboardLayoutRecord(tenantId);

      return reply.send(successEnvelope({ config: record }));
    },
  );

  app.put(
    "/api/tenant-dashboard-layout",
    {
      preHandler: [
        options.authenticate,
        requireWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const parsed = putTenantDashboardLayoutInputSchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          formatZodValidationMessage(parsed.error),
        );
      }

      const config = await options.tenantDashboardLayoutRepository.put(
        tenantId,
        parsed.data,
      );

      return reply.send(successEnvelope({ config }));
    },
  );

  app.post(
    "/api/tenant-dashboard-layout/upload-image",
    {
      preHandler: [
        options.authenticate,
        requireWrite as preHandlerAsyncHookHandler,
      ],
      bodyLimit: MAX_IMAGE_UPLOAD_REQUEST_BODY_BYTES,
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const parsedBody = uploadDashboardImageBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Request body must include contentType and base64 data.",
        );
      }

      try {
        const buffer = Buffer.from(parsedBody.data.data, "base64");
        if (buffer.length > DEFAULT_IMAGE_MAX_SIZE_BYTES) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            `File exceeds maximum size of ${DEFAULT_IMAGE_MAX_SIZE_BYTES} bytes.`,
          );
        }

        const imageUrl = await uploadTenantDashboardImage({
          config: options.firebaseAdminConfig,
          tenantId,
          objectId: randomUUID(),
          buffer,
          contentType: parsedBody.data.contentType,
        });

        return reply.send(successEnvelope({ imageUrl }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to upload image.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );
}
