import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  migrateListPresentation,
  normalizeEntityViews,
  putEntityUiOverrideInputSchema,
  serializeEntityDefinition,
  type EntityUIConfig,
  type EntityUiOverrideRecord,
  type PutEntityUiOverrideInput,
  type UiLayoutDocument,
  type WizardFormConfig,
} from "@repo/entities";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

interface RegisterEntityUiOverrideRoutesOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly entityUiOverrideRepository: EntityUiOverrideRepository;
}

const entityNameParamSchema = z.object({
  entityName: z.string().trim().min(1),
});

function formatZodValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid UI override payload.";
  }
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

/** Preserve override slices omitted from a surface-specific PUT body. */
function mergeUiOverridePutInput(
  existing: EntityUiOverrideRecord | null,
  incoming: PutEntityUiOverrideInput,
): PutEntityUiOverrideInput {
  const incomingForms = incoming.forms;
  const existingForms = existing?.forms;
  const sharedLayout = incomingForms?.layout ?? existingForms?.layout;
  const createLayout = incomingForms?.create ?? existingForms?.create;
  const editLayout = incomingForms?.edit ?? existingForms?.edit;
  const plainLayout = sharedLayout ?? createLayout ?? editLayout;
  const presentation =
    incomingForms?.presentation ?? existingForms?.presentation;
  const wizard = incomingForms?.wizard ?? existingForms?.wizard;
  const modalSize = incomingForms?.modalSize ?? existingForms?.modalSize;

  const forms =
    plainLayout ||
    presentation ||
    wizard ||
    createLayout ||
    editLayout ||
    modalSize
      ? {
          ...(presentation ? { presentation } : {}),
          ...(plainLayout ? { layout: plainLayout } : {}),
          ...(wizard ? { wizard } : {}),
          ...(modalSize ? { modalSize } : {}),
          ...(createLayout && !plainLayout ? { create: createLayout } : {}),
          ...(editLayout && !plainLayout ? { edit: editLayout } : {}),
        }
      : undefined;

  const recordDetail =
    incoming.recordDetail ?? existing?.recordDetail ?? existing?.detail;

  return {
    views: incoming.views,
    ...((incoming.listViewType ?? existing?.listViewType)
      ? { listViewType: incoming.listViewType ?? existing?.listViewType }
      : {}),
    ...((incoming.listItem ?? existing?.listItem)
      ? { listItem: incoming.listItem ?? existing?.listItem }
      : {}),
    ...((incoming.mainPage ?? existing?.mainPage)
      ? { mainPage: incoming.mainPage ?? existing?.mainPage }
      : {}),
    ...(recordDetail ? { recordDetail } : {}),
    ...(forms ? { forms } : {}),
  } as PutEntityUiOverrideInput;
}

export async function registerEntityUiOverrideRoutes(
  app: FastifyInstance,
  options: RegisterEntityUiOverrideRoutesOptions,
): Promise<void> {
  const requireEntityUiOverrideWrite = createRequireAnyPermission(
    options.permissionDeps,
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  app.get(
    "/api/entities/:entityName/ui-override",
    {
      preHandler: [
        options.authenticate,
        requireEntityUiOverrideWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = request.ctx?.tenantId?.trim();
      if (!tenantId) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.TENANT_NOT_RESOLVED,
          "Tenant context is required.",
        );
      }

      const params = entityNameParamSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid entity name.",
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const entity = options.entityRuntime.getEntityDefinition(
        params.data.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          `Entity "${params.data.entityName}" not found.`,
        );
      }

      const override = await options.entityUiOverrideRepository.get(
        tenantId,
        params.data.entityName,
      );

      return reply.send(successEnvelope({ override }));
    },
  );

  app.put(
    "/api/entities/:entityName/ui-override",
    {
      preHandler: [
        options.authenticate,
        requireEntityUiOverrideWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = request.ctx?.tenantId?.trim();
      if (!tenantId) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.TENANT_NOT_RESOLVED,
          "Tenant context is required.",
        );
      }

      const params = entityNameParamSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid entity name.",
        );
      }

      const parsedBody = putEntityUiOverrideInputSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid UI override payload.",
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const entity = options.entityRuntime.getEntityDefinition(
        params.data.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          `Entity "${params.data.entityName}" not found.`,
        );
      }

      const serialized = serializeEntityDefinition(entity);
      const normalizedViews = normalizeEntityViews(
        parsedBody.data.views as EntityUIConfig["views"],
      );

      const overrideForms = parsedBody.data.forms;
      const sharedPlainLayout =
        overrideForms?.layout ?? overrideForms?.create ?? overrideForms?.edit;
      const presentation =
        overrideForms?.presentation ??
        (overrideForms?.wizard ? ("wizard" as const) : undefined) ??
        serialized.ui.forms.presentation;
      const wizard = (overrideForms?.wizard ?? serialized.ui.forms.wizard) as
        | WizardFormConfig
        | undefined;
      const modalSize =
        overrideForms?.modalSize ?? serialized.ui.forms.modalSize;

      const mergedForms: EntityUIConfig["forms"] = {
        ...(presentation ? { presentation } : {}),
        ...(wizard ? { wizard } : {}),
        ...(modalSize ? { modalSize } : {}),
        create: {
          ...serialized.ui.forms.create,
          ...(sharedPlainLayout && presentation !== "wizard"
            ? { layout: sharedPlainLayout as UiLayoutDocument }
            : parsedBody.data.forms?.create
              ? { layout: parsedBody.data.forms.create as UiLayoutDocument }
              : {}),
        },
        edit: {
          ...serialized.ui.forms.edit,
          ...(sharedPlainLayout && presentation !== "wizard"
            ? { layout: sharedPlainLayout as UiLayoutDocument }
            : parsedBody.data.forms?.edit
              ? { layout: parsedBody.data.forms.edit as UiLayoutDocument }
              : {}),
        },
      };

      const mergedUi: EntityUIConfig = migrateListPresentation({
        ...serialized.ui,
        views: normalizedViews,
        forms: mergedForms,
        ...(parsedBody.data.listViewType
          ? { listViewType: parsedBody.data.listViewType }
          : {}),
        ...(parsedBody.data.listItem
          ? { listItem: parsedBody.data.listItem as UiLayoutDocument }
          : {}),
        ...(parsedBody.data.mainPage
          ? { mainPageLayout: parsedBody.data.mainPage as UiLayoutDocument }
          : {}),
        ...(parsedBody.data.recordDetail
          ? {
              recordDetailLayout: parsedBody.data
                .recordDetail as UiLayoutDocument,
              detailLayout: parsedBody.data.recordDetail as UiLayoutDocument,
            }
          : {}),
      });

      try {
        const { validateEntityUIConfig } = await import("@repo/entities");
        validateEntityUIConfig(entity, mergedUi);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid UI configuration.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }

      const existingOverride = await options.entityUiOverrideRepository.get(
        tenantId,
        params.data.entityName,
      );

      try {
        const override = await options.entityUiOverrideRepository.put(
          tenantId,
          params.data.entityName,
          mergeUiOverridePutInput(existingOverride, {
            views: [...normalizedViews],
            ...(parsedBody.data.listViewType
              ? { listViewType: parsedBody.data.listViewType }
              : {}),
            ...(parsedBody.data.listItem
              ? { listItem: parsedBody.data.listItem }
              : {}),
            ...(parsedBody.data.mainPage
              ? { mainPage: parsedBody.data.mainPage }
              : {}),
            ...(parsedBody.data.recordDetail
              ? { recordDetail: parsedBody.data.recordDetail }
              : {}),
            ...(parsedBody.data.forms ? { forms: parsedBody.data.forms } : {}),
          }),
        );

        return reply.send(successEnvelope({ override }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            formatZodValidationMessage(error),
          );
        }
        throw error;
      }
    },
  );
}
