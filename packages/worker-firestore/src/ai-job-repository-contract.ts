import type { AiJobInput, AiJobRecord } from "@repo/ai-engine/schemas";

export type { AiJobRecord };

export interface AiJobRepository {
  create(
    tenantId: string,
    input: {
      readonly feature: AiJobRecord["feature"];
      readonly input: AiJobInput;
      readonly requestedBy: string;
      readonly permission: string;
    },
  ): Promise<AiJobRecord>;
  getById(tenantId: string, id: string): Promise<AiJobRecord | null>;
  update(
    tenantId: string,
    id: string,
    patch: Partial<
      Pick<AiJobRecord, "status" | "output" | "error" | "progress" | "draft">
    >,
  ): Promise<AiJobRecord>;
}
