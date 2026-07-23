import type {
  CreateDataHookExecutionInput,
  DataHookExecutionRecord,
  UpdateDataHookExecutionPatch,
} from "@repo/hooks";

import type {
  HookExecutionListCursor,
  HookExecutionListPage,
} from "./pagination.js";

export type { HookExecutionListCursor, HookExecutionListPage };
export {
  buildHookExecutionNextCursor,
  decodeHookExecutionListCursor,
  encodeHookExecutionListCursor,
} from "./pagination.js";

export interface DataHookExecutionActiveCounts {
  readonly pending: number;
  readonly running: number;
  readonly queuedPending: number;
  readonly inlineRunning: number;
  readonly deferredRunning: number;
  readonly cloudRunning: number;
}

export interface DataHookExecutionRepository {
  create(
    tenantId: string,
    input: CreateDataHookExecutionInput,
    options?: { readonly id?: string },
  ): Promise<DataHookExecutionRecord>;
  update(
    tenantId: string,
    id: string,
    patch: UpdateDataHookExecutionPatch,
  ): Promise<DataHookExecutionRecord>;
  listByHookId(
    tenantId: string,
    hookId: string,
    options?: {
      readonly limit?: number;
      readonly cursor?: HookExecutionListCursor | null;
    },
  ): Promise<HookExecutionListPage>;
  listRecent(
    tenantId: string,
    options?: {
      readonly limit?: number;
      readonly cursor?: HookExecutionListCursor | null;
      readonly since?: string;
      readonly until?: string;
    },
  ): Promise<HookExecutionListPage>;
  listByEntityRecord(
    tenantId: string,
    entityName: string,
    recordId: string,
    options?: {
      readonly limit?: number;
      readonly cursor?: HookExecutionListCursor | null;
      readonly since?: string;
      readonly until?: string;
    },
  ): Promise<HookExecutionListPage>;
  listByEmailLedgerId(
    tenantId: string,
    emailLedgerId: string,
    options?: {
      readonly limit?: number;
      readonly cursor?: HookExecutionListCursor | null;
      readonly since?: string;
      readonly until?: string;
    },
  ): Promise<HookExecutionListPage>;
  listActive(tenantId: string): Promise<readonly DataHookExecutionRecord[]>;
  countActiveByStatus(tenantId: string): Promise<DataHookExecutionActiveCounts>;
}
