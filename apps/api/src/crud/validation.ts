import type { z } from "zod";

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
