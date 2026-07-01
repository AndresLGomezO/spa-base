import { z } from "zod";

export const HOOK_LOG_MESSAGES_COLLECTION = "__hook_log_messages" as const;

export const HOOK_LOG_LEVELS = ["info", "error"] as const;
export type HookLogLevel = (typeof HOOK_LOG_LEVELS)[number];

export const createHookLogMessageInputSchema = z.object({
  level: z.enum(HOOK_LOG_LEVELS),
  message: z.string().trim().min(1),
  meta: z.record(z.string(), z.unknown()).optional(),
  hookId: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1).optional(),
  timestamp: z.string().trim().min(1),
});
export type CreateHookLogMessageInput = z.infer<
  typeof createHookLogMessageInputSchema
>;

export const hookLogMessageRecordSchema =
  createHookLogMessageInputSchema.extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
  });
export type HookLogMessageRecord = z.infer<typeof hookLogMessageRecordSchema>;
