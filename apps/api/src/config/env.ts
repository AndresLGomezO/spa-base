import { FirebaseRuntimeEnvSchema } from "@repo/gcp-firebase/env";
import { AppEnvSchema } from "@repo/shared-types";
import { z } from "zod";

const ApiEnvSchema = z.object({
  API_HOST: z.string().trim().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_CORS_ORIGINS: z
    .string()
    .trim()
    .default("http://localhost:5173,http://127.0.0.1:5173"),
  VITE_ENV: AppEnvSchema.optional(),
  PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS: z.string().trim().default(""),
  CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(60_000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().nonnegative().default(300),
  API_RATE_LIMIT_TIME_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),
  ENABLE_PERF_LOGS: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "production" ? "false" : "true")
    .transform((value) => value === "true"),
  STRICT_QUERY_PAGINATION: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "test" ? "true" : "false")
    .transform((value) => value === "true"),
  TENANT_ENCRYPTION_MASTER_KEY: z.string().trim().min(1).optional(),
  QUERY_CURSOR_SECRET: z
    .string()
    .trim()
    .min(16)
    .default("dev-cursor-secret-change-in-prod"),
  ENSURE_FIRESTORE_INDEXES: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "production" ? "false" : "true")
    .transform((value) => value === "true"),
  CLIENT_QUERY_FALLBACK_MAX_DOCS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(5_000),
  INDEX_PROVISIONING_PUBSUB: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  INDEX_PROVISIONING_TOPIC: z
    .string()
    .trim()
    .min(1)
    .default("index-provisioning"),
  INDEX_PROVISIONING_CONCURRENCY: z.coerce.number().int().positive().default(1),
  INDEX_PROVISIONING_BATCH_DELAY_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(400),
  AGGREGATION_EVENTS_PUBSUB: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AGGREGATION_EVENTS_TOPIC: z
    .string()
    .trim()
    .min(1)
    .default("aggregation-events"),
  GCP_REGION: z.string().trim().min(1).default("us-central1"),
  WORKER_SERVICE_URL: z.string().trim().default("http://127.0.0.1:3001"),
  CLOUD_TASKS_QUEUE_NAME: z.string().trim().default("ai-jobs"),
  TASKS_SA_EMAIL: z.string().trim().optional(),
  AI_TASKS_LOCAL_DISPATCH: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "production" ? "false" : "true")
    .transform((value) => value === "true"),
  HOOK_TASKS_QUEUE_NAME: z.string().trim().default("hook-jobs"),
  HOOK_TASKS_LOCAL_DISPATCH: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "production" ? "false" : "true")
    .transform((value) => value === "true"),
  TENANT_DELETION_PROTECTED_IDS: z.string().trim().default("rates"),
});

const ParsedEnvSchema = ApiEnvSchema.merge(FirebaseRuntimeEnvSchema);

const parsed = ParsedEnvSchema.safeParse({
  ...process.env,
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ?? "demo-project-base",
});

if (!parsed.success) {
  throw new Error(
    `Invalid API environment configuration: ${JSON.stringify(parsed.error.format())}`,
  );
}

export const apiEnv = parsed.data;
