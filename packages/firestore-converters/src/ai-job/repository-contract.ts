import type {
  AiJobContextRef,
  AiJobFeature,
  AiJobInput,
  AiJobOperation,
  AiJobStepTraceEntry,
  AiJobStatus,
} from "@repo/ai-engine/schemas";
import { aiJobRecordSchema, type AiJobRecord } from "@repo/ai-engine/schemas";

export { aiJobRecordSchema, type AiJobRecord, type AiJobStatus };

export interface AiJobCreateInput {
  readonly feature: AiJobRecord["feature"];
  readonly input: AiJobInput;
  readonly requestedBy: string;
  readonly permission: string;
  readonly status?: AiJobStatus;
  readonly operation?: AiJobOperation;
  readonly parentJobId?: string;
  readonly contextRef?: AiJobContextRef;
  readonly error?: string | null;
}

export interface AiJobRepository {
  create(tenantId: string, input: AiJobCreateInput): Promise<AiJobRecord>;
  getById(tenantId: string, id: string): Promise<AiJobRecord | null>;
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
        | "input"
        | "operation"
        | "parentJobId"
        | "contextRef"
      >
    >,
  ): Promise<AiJobRecord>;
  appendStepTrace(
    tenantId: string,
    id: string,
    entry: AiJobStepTraceEntry,
  ): Promise<AiJobRecord>;
  listRecent(
    tenantId: string,
    options?: {
      readonly feature?: AiJobFeature;
      readonly parentJobId?: string;
      readonly limit?: number;
      readonly since?: string;
      readonly until?: string;
    },
  ): Promise<readonly AiJobRecord[]>;
}
