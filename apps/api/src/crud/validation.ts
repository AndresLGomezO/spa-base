import { z } from "zod";

function formatZodError(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
    const messages = fieldErrors[path] ?? [];
    messages.push(issue.message);
    fieldErrors[path] = messages;
  }

  return fieldErrors;
}

export function stripToSchemaKeys(
  schema: z.ZodTypeAny,
  input: unknown,
): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  if (!(schema instanceof z.ZodObject)) {
    return input;
  }

  const allowedKeys = new Set(Object.keys(schema.shape));
  const stripped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (allowedKeys.has(key)) {
      stripped[key] = value;
    }
  }

  return stripped;
}

export function parseOrFormatError<T>(
  schema: z.ZodType<T>,
  input: unknown,
):
  | { success: true; data: T }
  | { success: false; details: Record<string, string[]> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return { success: false, details: formatZodError(parsed.error) };
}
