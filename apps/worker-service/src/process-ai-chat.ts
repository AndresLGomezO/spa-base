import type { AiController } from "@repo/ai-engine/controller";
import type { AiChatInput, AiChatOutput } from "@repo/ai-engine/schemas";
import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";
import {
  createMockVertexCachedContentClient,
  createRestVertexCachedContentClient,
  refreshUserAiMemory,
  runGroundedChatOrchestrator,
  type GroundedChatDataPorts,
  type GroundedChatOrchestratorCallbacks,
  type GroundedChatOrchestratorMetrics,
} from "@repo/ai-engine/grounded-chat";
import type {
  AiChatSessionRepository,
  TenantAiContextRepository,
  UserAiMemoryRepository,
} from "@repo/firestore-converters";

export interface ProcessAiChatOptions {
  readonly aiController: AiController;
  readonly tenantId: string;
  readonly parentJobId: string;
  readonly requestedBy: string;
  readonly tenantAiContextRepository: TenantAiContextRepository;
  readonly userAiMemoryRepository: UserAiMemoryRepository;
  readonly aiChatSessionRepository: AiChatSessionRepository;
  readonly dataPorts: GroundedChatDataPorts;
  readonly sessionId?: string;
  readonly isAiTraceEnabled?: () => boolean | Promise<boolean>;
  readonly callbacks?: GroundedChatOrchestratorCallbacks;
  /** Optional catalog source for L2 refresh before answering. */
  readonly memoryRefreshSource?: {
    readonly entitySummaries: readonly {
      readonly name: string;
      readonly label?: string;
      readonly recordCount?: number;
    }[];
    readonly metricSummaries?: readonly {
      readonly id: string;
      readonly name: string;
    }[];
    readonly querySummaries?: readonly {
      readonly id: string;
      readonly name: string;
      readonly entityName?: string;
    }[];
    readonly profileFragment?: string;
    readonly assembledSectionsText?: string;
  };
}

export async function processAiChat(
  config: VertexAiConfig,
  input: AiChatInput,
  options: ProcessAiChatOptions,
): Promise<
  AiChatOutput & { readonly metrics: GroundedChatOrchestratorMetrics }
> {
  const cacheClient = config.mockEnabled
    ? createMockVertexCachedContentClient()
    : createRestVertexCachedContentClient();

  if (options.memoryRefreshSource) {
    await refreshUserAiMemory(
      { repository: options.userAiMemoryRepository },
      options.tenantId,
      options.requestedBy,
      options.memoryRefreshSource,
    );
  }

  let session = options.sessionId
    ? await options.aiChatSessionRepository.get(
        options.tenantId,
        options.sessionId,
      )
    : null;

  if (session && session.userId !== options.requestedBy) {
    session = null;
  }

  if (!session && options.sessionId) {
    // Stale session id — continue without prior turns.
    session = null;
  }

  if (!session) {
    session = await options.aiChatSessionRepository.create(options.tenantId, {
      userId: options.requestedBy,
      messages: [],
    });
  }

  const nowIso = new Date().toISOString();
  await options.aiChatSessionRepository.update(options.tenantId, session.id, {
    messages: [
      ...session.messages,
      {
        role: "user",
        content: input.question,
        createdAt: nowIso,
        jobId: options.parentJobId,
      },
    ],
    lastJobId: options.parentJobId,
  });
  session = await options.aiChatSessionRepository.get(
    options.tenantId,
    session.id,
  );

  const result = await runGroundedChatOrchestrator(
    {
      aiController: options.aiController,
      vertexAiConfig: config,
      tenantAiContextRepository: options.tenantAiContextRepository,
      userAiMemoryRepository: options.userAiMemoryRepository,
      dataPorts: options.dataPorts,
      cacheClient,
      ...(options.isAiTraceEnabled
        ? { isAiTraceEnabled: options.isAiTraceEnabled }
        : {}),
      ...(options.callbacks ? { callbacks: options.callbacks } : {}),
    },
    {
      tenantId: options.tenantId,
      userId: options.requestedBy,
      question: input.question,
      parentJobId: options.parentJobId,
      session,
    },
  );

  const assistantAt = new Date().toISOString();
  const traceEnabled = options.isAiTraceEnabled
    ? Boolean(await options.isAiTraceEnabled())
    : false;
  await options.aiChatSessionRepository.update(options.tenantId, session!.id, {
    messages: [
      ...(session?.messages ?? []),
      {
        role: "assistant",
        content: result.answer,
        createdAt: assistantAt,
        jobId: options.parentJobId,
        citations: result.citations,
      },
    ],
    ...(traceEnabled ? { scratchpad: result.scratchpad } : { scratchpad: "" }),
    citations: result.citations ?? [],
    lastJobId: options.parentJobId,
  });

  return {
    answer: result.answer,
    ...(result.citations ? { citations: result.citations } : {}),
    ...(result.clarifyingQuestion
      ? { clarifyingQuestion: result.clarifyingQuestion }
      : {}),
    sessionId: session!.id,
    metrics: result.metrics,
  };
}

export type ProcessAiChatResult = Awaited<ReturnType<typeof processAiChat>>;

export type { VertexAiConfig };
