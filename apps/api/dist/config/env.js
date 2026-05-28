import { FirebaseRuntimeEnvSchema } from "@repo/gcp-firebase/env";
import { AppEnvSchema } from "@repo/shared-types";
import { z } from "zod";
const ApiEnvSchema = z.object({
    API_HOST: z.string().trim().min(1).default("0.0.0.0"),
    API_PORT: z.coerce.number().int().positive().default(3000),
    VITE_ENV: AppEnvSchema.optional(),
});
const ParsedEnvSchema = ApiEnvSchema.merge(FirebaseRuntimeEnvSchema);
const parsed = ParsedEnvSchema.safeParse({
    ...process.env,
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ?? "demo-project-base",
});
if (!parsed.success) {
    throw new Error(`Invalid API environment configuration: ${JSON.stringify(parsed.error.format())}`);
}
export const apiEnv = parsed.data;
