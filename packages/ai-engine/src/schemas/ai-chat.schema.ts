import { z } from "zod";

export const aiChatInputSchema = z.object({
  question: z.string().trim().min(1).max(8000),
  sessionId: z.string().trim().min(1).optional(),
  userPermissions: z.array(z.string().trim().min(1)).max(200).optional(),
});

export type AiChatInput = z.infer<typeof aiChatInputSchema>;

export const submitAiChatRequestSchema = z.object({
  question: z.string().trim().min(1).max(8000),
  sessionId: z.string().trim().min(1).optional(),
});

export type SubmitAiChatRequest = z.infer<typeof submitAiChatRequestSchema>;
