import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  MAX_IMAGE_UPLOAD_REQUEST_BODY_BYTES,
  putTenantSidebarLayoutInputSchema,
} from "@repo/entities";
import type { TenantSidebarLayoutRepository } from "@repo/firestore-converters";
import {
  uploadTenantSidebarImage,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterTenantSidebarLayoutRoutesOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly tenantSidebarLayoutRepository: TenantSidebarLayoutRepository;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
}

const uploadSidebarImageBodySchema = z.object({
  contentType: z.string().trim().min(1),
  data: z.string().trim().min(1),
});

function formatZodValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid tenant sidebar layout payload.";
  }
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export async function registerTenantSidebarLayoutRoutes(
  app: FastifyInstance,
  options: RegisterTenantSidebarLayoutRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(options.permissionDeps, "*.read");
  const requireWrite = createRequireAnyPermission(
    options.permissionDeps,
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  app.get(
    "/api/tenant-sidebar-layout",
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

      const record = await options.tenantSidebarLayoutRepository.get(tenantId);

      if (!record) {
        return reply.send(successEnvelope({ exists: false as const }));
      }

      return reply.send(
        successEnvelope({ exists: true as const, config: record }),
      );
    },
  );

  app.put(
    "/api/tenant-sidebar-layout",
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

      const parsed = putTenantSidebarLayoutInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          formatZodValidationMessage(parsed.error),
        );
      }

      const config = await options.tenantSidebarLayoutRepository.put(
        tenantId,
        parsed.data,
      );

      return reply.send(successEnvelope({ config }));
    },
  );

  app.delete(
    "/api/tenant-sidebar-layout",
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

      const deleted =
        await options.tenantSidebarLayoutRepository.delete(tenantId);

      return reply.send(successEnvelope({ deleted }));
    },
  );

  app.post(
    "/api/tenant-sidebar-layout/upload-image",
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

      const parsedBody = uploadSidebarImageBodySchema.safeParse(request.body);
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

        const imageUrl = await uploadTenantSidebarImage({
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
