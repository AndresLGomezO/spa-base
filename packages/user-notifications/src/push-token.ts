import { z } from "zod";

export const PUSH_TOKENS_COLLECTION = "__push_tokens" as const;

export const upsertPushTokenInputSchema = z.object({
  userId: z.string().trim().min(1),
  token: z.string().trim().min(1),
  userAgent: z.string().trim().min(1).optional(),
  createdAt: z.string().trim().min(1).optional(),
  updatedAt: z.string().trim().min(1).optional(),
});
export type UpsertPushTokenInput = z.infer<typeof upsertPushTokenInputSchema>;

export const pushTokenRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  token: z.string().trim().min(1),
  userAgent: z.string().trim().min(1).optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});
export type PushTokenRecord = z.infer<typeof pushTokenRecordSchema>;
