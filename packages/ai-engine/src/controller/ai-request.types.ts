import type {
  AiJobContextRef,
  AiJobFeature,
  AiJobInput,
  AiJobModelUsage,
  AiJobOperation,
  AiJobOutput,
  AiJobRecord,
  AiJobStatus,
  AiJobStepTraceEntry,
} from "../schemas/ai-job.schema.js";
import type {
  GenerateModelAnswerInput,
  GenerateModelAnswerOptions,
  GenerateModelAnswerResult,
  GenerateModelAnswerStreamOptions,
  GenerateModelFilePart,
  VertexAiConfig,
} from "../clients/internal/vertex-ai.client.js";

export type { GenerateModelFilePart };

export class AiDisabledError extends Error {
  readonly code = "ai.disabled" as const;

  constructor(message = "AI is disabled by platform kill-switch.") {
    super(message);
    this.name = "AiDisabledError";
  }
}

export interface AiJobRepositoryPort {
  create(
    tenantId: string,
    input: {
      readonly feature: AiJobFeature;
      readonly input: AiJobInput;
      readonly requestedBy: string;
      readonly permission: string;
      readonly status?: AiJobStatus;
      readonly operation?: AiJobOperation;
      readonly parentJobId?: string;
      readonly contextRef?: AiJobContextRef;
      readonly error?: string | null;
    },
  ): Promise<AiJobRecord>;
  update(
    tenantId: string,
    id: string,
    patch: Partial<
      Pick<
        AiJobRecord,
        | "status"
        | "output"
        | "error"
        | "progress"
        | "draft"
        | "stepTrace"
        | "modelUsage"
        | "metrics"
      >
    >,
  ): Promise<AiJobRecord>;
  appendStepTrace(
    tenantId: string,
    id: string,
    entry: AiJobStepTraceEntry,
  ): Promise<AiJobRecord>;
}

export interface AiControllerFlags {
  isAiEnabled(): boolean | Promise<boolean>;
  isAiTraceEnabled(): boolean | Promise<boolean>;
}

export interface AiControllerClients {
  generateModelAnswer(
    config: VertexAiConfig,
    input: GenerateModelAnswerInput,
    options?: GenerateModelAnswerOptions,
  ): Promise<GenerateModelAnswerResult>;
  generateModelAnswerStream?(
    config: VertexAiConfig,
    input: GenerateModelAnswerInput,
    options?: GenerateModelAnswerStreamOptions,
  ): Promise<GenerateModelAnswerResult>;
  generateChatAnswer(
    config: VertexAiConfig,
    question: string,
  ): Promise<GenerateModelAnswerResult>;
  generateTextEmbedding(
    config: VertexAiConfig,
    text: string,
  ): Promise<{
    readonly vector: readonly number[];
    readonly usage: AiJobModelUsage;
  }>;
  generateImagenImage?(
    config: VertexAiConfig,
    prompt: string,
  ): Promise<{
    readonly base64: string;
    readonly mimeType: string;
    readonly usage: AiJobModelUsage;
  }>;
}

export type AiGenerateTextParams = {
  readonly operation: "generateText";
  readonly systemInstruction: string;
  readonly userText: string;
  readonly contextBlocks?: readonly {
    readonly id: string;
    readonly content: string;
  }[];
  readonly outputInstruction?: string;
  readonly modelOptions?: GenerateModelAnswerOptions;
  readonly stepId?: string;
  /**
   * Multimodal file/image parts. Prefer GCS `fileUri` so document bytes are
   * never stored on `ai_jobs.input`.
   */
  readonly fileParts?: readonly GenerateModelFilePart[];
};

export type AiGenerateChatParams = {
  readonly operation: "generateChat";
  readonly question: string;
};

export type AiGenerateEmbeddingParams = {
  readonly operation: "generateEmbedding";
  readonly text: string;
};

export type AiGenerateImageParams = {
  readonly operation: "generateImage";
  readonly prompt: string;
};

export type AiOperationParams =
  | AiGenerateTextParams
  | AiGenerateChatParams
  | AiGenerateEmbeddingParams
  | AiGenerateImageParams;

export interface AiRequest {
  readonly tenantId: string;
  readonly feature: AiJobFeature;
  readonly operation: AiJobOperation;
  readonly requestedBy: string;
  readonly permission: string;
  readonly input: AiJobInput;
  readonly parentJobId?: string;
  readonly contextRef?: AiJobContextRef;
  readonly params: AiOperationParams;
  /** When set for generateText, uses the streaming Vertex path when available. */
  readonly onTextChunk?: (textSoFar: string) => void | Promise<void>;
}

export interface AiResponse<TOutput extends AiJobOutput = AiJobOutput> {
  readonly jobId: string;
  readonly output: TOutput;
  readonly rawModelAnswer: string;
  readonly durationMs: number;
  readonly modelUsage?: AiJobModelUsage;
  /** Full embedding vector (not persisted on ai_jobs). */
  readonly embeddingVector?: readonly number[];
}

export interface AiControllerDeps {
  readonly repository: AiJobRepositoryPort;
  readonly vertexAiConfig: VertexAiConfig;
  readonly clients: AiControllerClients;
  readonly flags: AiControllerFlags;
  readonly now?: () => Date;
  /** Called before model invocation; throw to reject (e.g. spend limit). */
  readonly assertSpendAllowed?: (request: AiRequest) => Promise<void>;
  /** Called after a successful model run with usage (failed jobs skip this). */
  readonly recordSpendUsage?: (input: {
    readonly tenantId: string;
    readonly requestedBy: string;
    readonly modelUsage: AiJobModelUsage;
  }) => Promise<void>;
}
