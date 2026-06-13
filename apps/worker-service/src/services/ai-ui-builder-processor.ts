import { aiUiBuilderInputSchema } from "@repo/ai-engine/schemas";
import { processAiUiBuilderTaskPayloadSchema } from "@repo/ai-engine/schemas";
import {
  buildTenantAiContextDocId,
  ENTITY_CATALOG_FRAGMENT_ID,
  ENTITY_CURRENT_FRAGMENT_ID,
  ENTITY_TENANT_FRAGMENT_ID,
} from "@repo/ai-context";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import { runListUiBuilderOrchestrator } from "@repo/ai-engine/ui-builder-orchestrator";
import { appendSurfaceOutputInstruction } from "@repo/ai-engine/ui-builder-output-prompts";
import type { TenantAiContextRepository } from "@repo/worker-firestore";
import type { UiBuilderAiSuggestionRepository } from "@repo/worker-firestore";
import type { WorkerEntityDefinitionRepository } from "@repo/worker-firestore";

import { PermanentTaskError } from "./ai-chat-processor.js";
import {
  processAiUiBuilder,
  type VertexAiConfig,
} from "../process-ai-ui-builder.js";
import { assembleUiBuilderContextFromRecords } from "@repo/ai-context";

export { processAiUiBuilderTaskPayloadSchema };

export interface AiUiBuilderProcessorDeps {
  readonly aiJobRepository: import("@repo/worker-firestore").AiJobRepository;
  readonly tenantAiContextRepository: TenantAiContextRepository;
  readonly uiBuilderAiSuggestionRepository: UiBuilderAiSuggestionRepository;
  readonly entityDefinitionRepository: WorkerEntityDefinitionRepository;
  readonly vertexAiConfig: VertexAiConfig;
}

export async function processAiUiBuilderJob(
  deps: AiUiBuilderProcessorDeps,
  tenantId: string,
  jobId: string,
): Promise<void> {
  const job = await deps.aiJobRepository.getById(tenantId, jobId);
  if (!job) {
    throw new PermanentTaskError("JOB_NOT_FOUND");
  }

  if (job.feature !== "uiBuilder") {
    throw new PermanentTaskError("INVALID_FEATURE");
  }

  if (job.status === "completed" || job.status === "failed") {
    return;
  }

  const parsedInput = aiUiBuilderInputSchema.safeParse(job.input);
  if (!parsedInput.success) {
    throw new PermanentTaskError("INVALID_INPUT");
  }

  await deps.aiJobRepository.update(tenantId, jobId, {
    status: "running",
    progress: null,
    draft: null,
  });

  try {
    const themeRecord = await deps.tenantAiContextRepository.get(
      tenantId,
      buildTenantAiContextDocId("theme"),
    );
    const catalogRecord = await deps.tenantAiContextRepository.get(
      tenantId,
      buildTenantAiContextDocId("entityCatalog"),
    );
    const entityRecord = await deps.tenantAiContextRepository.get(
      tenantId,
      buildTenantAiContextDocId("entity", parsedInput.data.entityName),
    );

    if (!themeRecord || !catalogRecord || !entityRecord) {
      throw new Error(
        "Required AI context records are missing for this tenant.",
      );
    }

    if (parsedInput.data.surface === "list") {
      await processListSurfaceJob(deps, tenantId, jobId, parsedInput.data, {
        themeRecord,
        catalogRecord,
        entityRecord,
        requestedBy: job.requestedBy,
        question: parsedInput.data.question,
      });
      return;
    }

    await processLegacySingleShotJob(
      deps,
      tenantId,
      jobId,
      parsedInput.data,
      themeRecord,
      catalogRecord,
      entityRecord,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AI UI builder processing failed.";
    await deps.aiJobRepository.update(tenantId, jobId, {
      status: "failed",
      output: null,
      error: message,
      progress: null,
    });
    throw new PermanentTaskError("PROCESSING_FAILED");
  }
}

async function processListSurfaceJob(
  deps: AiUiBuilderProcessorDeps,
  tenantId: string,
  jobId: string,
  input: import("@repo/ai-engine/schemas").AiUiBuilderInput,
  context: {
    readonly themeRecord: NonNullable<
      Awaited<ReturnType<TenantAiContextRepository["get"]>>
    >;
    readonly catalogRecord: NonNullable<
      Awaited<ReturnType<TenantAiContextRepository["get"]>>
    >;
    readonly entityRecord: NonNullable<
      Awaited<ReturnType<TenantAiContextRepository["get"]>>
    >;
    readonly requestedBy: string;
    readonly question: string;
  },
): Promise<void> {
  const definitionRecord = await deps.entityDefinitionRepository.getByName(
    tenantId,
    input.entityName,
  );
  if (!definitionRecord) {
    await deps.uiBuilderAiSuggestionRepository.create(tenantId, {
      entityName: input.entityName,
      surface: "list",
      jobId,
      status: "failed",
      userContext: input.question,
      validationErrors: [
        {
          path: "(entity)",
          message: `Entity definition not found: ${input.entityName}`,
        },
      ],
      createdBy: context.requestedBy,
    });
    await deps.aiJobRepository.update(tenantId, jobId, {
      status: "failed",
      error: `Entity definition not found: ${input.entityName}`,
      progress: null,
    });
    return;
  }

  const entity = defineEntityFromRecord(definitionRecord);
  const entityFieldPaths = Object.keys(entity.metadata.fields);
  const tenantFragment =
    context.catalogRecord.fragments[ENTITY_TENANT_FRAGMENT_ID] ??
    context.catalogRecord.assembled ??
    "";
  const catalogFragment =
    context.catalogRecord.fragments[ENTITY_CATALOG_FRAGMENT_ID] ?? "";
  const currentFragment =
    context.entityRecord.fragments[ENTITY_CURRENT_FRAGMENT_ID] ??
    context.entityRecord.assembled ??
    "";

  const orchestratorResult = await runListUiBuilderOrchestrator({
    vertexConfig: deps.vertexAiConfig,
    entityName: input.entityName,
    userPrompt: input.question,
    ...(input.currentLayoutJson
      ? { currentLayoutJson: input.currentLayoutJson }
      : {}),
    entityDefinition: definitionRecord,
    themeFragments: context.themeRecord.fragments,
    entityTenantFragment: tenantFragment,
    entityCatalogFragment: catalogFragment,
    entityCurrentFragment: currentFragment,
    entityFieldPaths,
    callbacks: {
      onProgress: async (progress) => {
        await deps.aiJobRepository.update(tenantId, jobId, { progress });
      },
      onDraftUpdate: async (draft) => {
        await deps.aiJobRepository.update(tenantId, jobId, {
          draft: draft as unknown as Record<string, unknown>,
        });
      },
    },
  });

  await deps.aiJobRepository.update(tenantId, jobId, {
    status: "completed",
    output: orchestratorResult.output,
    error: null,
    progress: null,
    draft: null,
  });

  const listViewType = orchestratorResult.listViewType;

  await deps.uiBuilderAiSuggestionRepository.create(tenantId, {
    entityName: input.entityName,
    surface: "list",
    jobId,
    status: "ready",
    userContext: input.question,
    sliceData: orchestratorResult.sliceData as unknown as Record<
      string,
      unknown
    >,
    ...(listViewType ? { listViewType } : {}),
    createdBy: context.requestedBy,
  });
}

async function processLegacySingleShotJob(
  deps: AiUiBuilderProcessorDeps,
  tenantId: string,
  jobId: string,
  parsedInput: import("@repo/ai-engine/schemas").AiUiBuilderInput,
  themeRecord: NonNullable<
    Awaited<ReturnType<TenantAiContextRepository["get"]>>
  >,
  catalogRecord: NonNullable<
    Awaited<ReturnType<TenantAiContextRepository["get"]>>
  >,
  entityRecord: NonNullable<
    Awaited<ReturnType<TenantAiContextRepository["get"]>>
  >,
): Promise<void> {
  const assembled = assembleUiBuilderContextFromRecords({
    request: {
      tenantId,
      entityName: parsedInput.entityName,
      surface: parsedInput.surface,
      ...(parsedInput.listViewType
        ? { listViewType: parsedInput.listViewType }
        : {}),
      ...(parsedInput.formPresentation
        ? { formPresentation: parsedInput.formPresentation }
        : {}),
      ...(parsedInput.currentLayoutJson
        ? { currentLayoutJson: parsedInput.currentLayoutJson }
        : {}),
      userPrompt: parsedInput.question,
    },
    themeRecord,
    catalogRecord,
    entityRecord,
  });

  const systemInstruction = appendSurfaceOutputInstruction(
    assembled.systemInstruction,
    parsedInput.surface,
  );

  const output = await processAiUiBuilder(deps.vertexAiConfig, parsedInput, {
    systemInstruction,
    contextBlocks: assembled.contextBlocks,
  });

  await deps.aiJobRepository.update(tenantId, jobId, {
    status: "completed",
    output: { answer: output.answer },
    error: null,
    progress: null,
  });
}
