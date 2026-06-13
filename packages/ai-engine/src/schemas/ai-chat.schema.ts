import { z } from "zod";

export const aiChatInputSchema = z.object({
  question: z.string().trim().min(1).max(8000),
});

export type AiChatInput = z.infer<typeof aiChatInputSchema>;

export const submitAiChatRequestSchema = z.object({
  question: z.string().trim().min(1).max(8000),
});

export type SubmitAiChatRequest = z.infer<typeof submitAiChatRequestSchema>;
