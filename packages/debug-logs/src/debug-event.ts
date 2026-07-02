import { z } from "zod";

export const DEBUG_EVENT_SOURCES = [
  "ai",
  "hookExecution",
  "hookLog",
  "audit",
  "requestPerf",
  "indexProvision",
] as const;
export type DebugEventSource = (typeof DEBUG_EVENT_SOURCES)[number];

export const DEBUG_EVENT_STATUSES = [
  "success",
  "error",
  "skipped",
  "info",
  "running",
  "pending",
  "failed",
  "completed",
] as const;
export type DebugEventStatus = (typeof DEBUG_EVENT_STATUSES)[number];

export const debugEventSchema = z.object({
  id: z.string().trim().min(1),
  source: z.enum(DEBUG_EVENT_SOURCES),
  timestamp: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().optional(),
  status: z.enum(DEBUG_EVENT_STATUSES).optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
  payload: z.unknown().optional(),
});
export type DebugEvent = z.infer<typeof debugEventSchema>;
