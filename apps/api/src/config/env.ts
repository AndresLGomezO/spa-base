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
