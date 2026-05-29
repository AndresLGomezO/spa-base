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
  API_RATE_LIMIT_MAX: z.coerce.number().int().nonnegative().default(100),
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
