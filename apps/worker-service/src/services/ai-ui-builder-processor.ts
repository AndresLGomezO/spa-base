import { aiUiBuilderInputSchema } from "@repo/ai-engine/schemas";
import { processAiUiBuilderTaskPayloadSchema } from "@repo/ai-engine/schemas";
import {
  buildTenantAiContextDocId,
  ENTITY_CATALOG_FRAGMENT_ID,
  ENTITY_CURRENT_FRAGMENT_ID,
  ENTITY_TENANT_FRAGMENT_ID,
} from "@repo/ai-context";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import {
  runFormsUiBuilderOrchestrator,
  runFormsRenderOrchestrator,
  runListUiBuilderOrchestrator,
  buildFormFieldPaths,
  toFieldPathDefinition,
} from "@repo/ai-engine/ui-builder-orchestrator";
import {
  createOrchestratorTraceCallbacks,
  isAiStepTraceEnabled,
  sanitizeStepTraceForPersistence,
  slimUiBuilderDraftForPersistence,
  stripCurrentLayoutJsonFromJobInput,
  type OrchestratorCallbacks,
} from "@repo/ai-engine/ui-builder-orchestrator";
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

function extractHtmlFromLegacyRenderBrief(
  renderBrief: string | undefined,
): string | undefined {
  if (!renderBrief?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(renderBrief) as { htmlDocument?: string };
    return typeof parsed.htmlDocument === "string"
      ? parsed.htmlDocument
      : undefined;
  } catch {
    return undefined;
  }
}

async function buildOrchestratorCallbacks(
  deps: AiUiBuilderProcessorDeps,
  tenantId: string,
  jobId: string,
): Promise<OrchestratorCallbacks> {
  const traceEnabled = deps.isAiStepTraceEnabled
    ? await deps.isAiStepTraceEnabled()
    : isAiStepTraceEnabled();
  const { callbacks: traceCallbacks } = createOrchestratorTraceCallbacks(
    traceEnabled,
    async (trace) => {
      await deps.aiJobRepository.update(tenantId, jobId, {
        stepTrace: sanitizeStepTraceForPersistence(trace),
      });
    },
  );

  return {
    onProgress: async (progress) => {
      await deps.aiJobRepository.update(tenantId, jobId, { progress });
    },
    onDraftUpdate: async (draft) => {
      await deps.aiJobRepository.update(tenantId, jobId, {
        draft: slimUiBuilderDraftForPersistence(
          draft as unknown as Record<string, unknown>,
        ),
      });
    },
    ...traceCallbacks,
  };
}

export interface AiUiBuilderProcessorDeps {
  readonly aiJobRepository: import("@repo/worker-firestore").AiJobRepository;
  readonly tenantAiContextRepository: TenantAiContextRepository;
  readonly uiBuilderAiSuggestionRepository: UiBuilderAiSuggestionRepository;
  readonly entityDefinitionRepository: WorkerEntityDefinitionRepository;
  readonly vertexAiConfig: VertexAiConfig;
  readonly isAiStepTraceEnabled?: () => Promise<boolean>;
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
    stepTrace: [],
    input: stripCurrentLayoutJsonFromJobInput(parsedInput.data),
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

    if (parsedInput.data.surface === "forms") {
      if (parsedInput.data.outputMode === "render") {
        await processFormsRenderSurfaceJob(
          deps,
          tenantId,
          jobId,
          parsedInput.data,
          {
            themeRecord,
            catalogRecord,
            entityRecord,
            requestedBy: job.requestedBy,
            question: parsedInput.data.question,
          },
        );
        return;
      }

      await processFormsSurfaceJob(deps, tenantId, jobId, parsedInput.data, {
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
    callbacks: await buildOrchestratorCallbacks(deps, tenantId, jobId),
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

async function processFormsSurfaceJob(
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
      surface: "forms",
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

  const orchestratorResult = await runFormsUiBuilderOrchestrator({
    vertexConfig: deps.vertexAiConfig,
    entityName: input.entityName,
    userPrompt: input.question,
    ...(input.presentationHint
      ? { presentationHint: input.presentationHint }
      : input.formPresentation
        ? { presentationHint: input.formPresentation }
        : {}),
    ...(input.allowCreative ? { allowCreative: true } : {}),
    ...(input.currentLayoutJson
      ? { currentLayoutJson: input.currentLayoutJson }
      : {}),
    entityDefinition: definitionRecord,
    themeFragments: context.themeRecord.fragments,
    entityTenantFragment: tenantFragment,
    entityCatalogFragment: catalogFragment,
    entityCurrentFragment: currentFragment,
    entityFieldPaths,
    callbacks: await buildOrchestratorCallbacks(deps, tenantId, jobId),
  });

  await deps.aiJobRepository.update(tenantId, jobId, {
    status: "completed",
    output: orchestratorResult.output,
    error: null,
    progress: null,
    draft: null,
  });

  await deps.uiBuilderAiSuggestionRepository.create(tenantId, {
    entityName: input.entityName,
    surface: "forms",
    jobId,
    status: "ready",
    userContext: input.question,
    sliceData: orchestratorResult.sliceData as unknown as Record<
      string,
      unknown
    >,
    ...(orchestratorResult.draft.formBlueprint
      ? {
          rawAnswer: JSON.stringify(orchestratorResult.draft.formBlueprint),
        }
      : {}),
    createdBy: context.requestedBy,
  });
}

async function processFormsRenderSurfaceJob(
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
      surface: "forms",
      jobId,
      status: "failed",
      outputMode: "render",
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

  const currentFragment =
    context.entityRecord.fragments[ENTITY_CURRENT_FRAGMENT_ID] ??
    context.entityRecord.assembled ??
    "";

  let previousHtmlDocument: string | undefined;
  let parentIterationNumber = 0;

  if (input.parentSuggestionId) {
    const parentSuggestion = await deps.uiBuilderAiSuggestionRepository.getById(
      tenantId,
      input.parentSuggestionId,
    );
    if (!parentSuggestion?.renderHtml && !parentSuggestion?.renderBrief) {
      throw new Error("Parent render suggestion not found or missing HTML.");
    }
    previousHtmlDocument =
      parentSuggestion.renderHtml ??
      extractHtmlFromLegacyRenderBrief(parentSuggestion.renderBrief);
    parentIterationNumber = parentSuggestion.iterationNumber ?? 0;
  }

  const entity = defineEntityFromRecord(definitionRecord);
  const formFieldPaths = buildFormFieldPaths(toFieldPathDefinition(entity));

  const orchestratorResult = await runFormsRenderOrchestrator({
    vertexConfig: deps.vertexAiConfig,
    entityName: input.entityName,
    userPrompt: input.question,
    formFieldPaths,
    ...(input.presentationHint
      ? { presentationHint: input.presentationHint }
      : input.formPresentation
        ? { presentationHint: input.formPresentation }
        : {}),
    ...(input.modificationRequest
      ? { modificationRequest: input.modificationRequest }
      : {}),
    ...(previousHtmlDocument ? { previousHtmlDocument } : {}),
    iterationNumber: input.parentSuggestionId ? parentIterationNumber + 1 : 0,
    entityCurrentFragment: currentFragment,
    callbacks: await buildOrchestratorCallbacks(deps, tenantId, jobId),
  });

  await deps.aiJobRepository.update(tenantId, jobId, {
    status: "completed",
    output: orchestratorResult.output,
    error: null,
    progress: null,
    draft: null,
  });

  await deps.uiBuilderAiSuggestionRepository.create(tenantId, {
    entityName: input.entityName,
    surface: "forms",
    jobId,
    status: "ready",
    outputMode: "render",
    userContext: input.question,
    renderHtml: orchestratorResult.renderHtml,
    renderBrief: orchestratorResult.renderBrief,
    iterationNumber: orchestratorResult.iterationNumber,
    ...(input.parentSuggestionId
      ? { parentSuggestionId: input.parentSuggestionId }
      : {}),
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
