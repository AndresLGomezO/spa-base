import type { AiChatInput } from "@repo/ai-engine";
import {
  aiJobRecordSchema,
  type AiJobRecord,
  type AiJobStatus,
} from "@repo/ai-engine";

export { aiJobRecordSchema, type AiJobRecord, type AiJobStatus };

export interface AiJobRepository {
  create(
    tenantId: string,
    input: {
      readonly feature: AiJobRecord["feature"];
      readonly input: AiChatInput;
      readonly requestedBy: string;
      readonly permission: string;
    },
  ): Promise<AiJobRecord>;
  getById(tenantId: string, id: string): Promise<AiJobRecord | null>;
  update(
    tenantId: string,
    id: string,
    patch: Partial<Pick<AiJobRecord, "status" | "output" | "error">>,
  ): Promise<AiJobRecord>;
}
