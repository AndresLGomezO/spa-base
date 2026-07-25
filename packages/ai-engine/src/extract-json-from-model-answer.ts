function extractJsonCandidate(answer: string): string {
  const trimmed = answer.trim();
  const closedFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (closedFence?.[1]) {
    return closedFence[1].trim();
  }

  const openFence = trimmed.match(/^```(?:json)?\s*([\s\S]*)$/i);
  if (openFence?.[1]) {
    return openFence[1].trim();
  }

  return trimmed;
}

/**
 * Slice the first complete `{...}` value, ignoring braces inside strings.
 * Avoids `first {` … `last }` which breaks when the model appends a second object.
 */
function sliceFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (ch === "\\") {
        escaping = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

export const INCOMPLETE_JSON_OBJECT_ERROR =
  "Model response appears truncated (incomplete JSON object).";

export const MAX_OUTPUT_TOKENS_ERROR =
  "Model response was truncated (max output tokens reached).";

/** True when the model answer was cut off mid-JSON (or hit max tokens). */
export function isRetriableTruncatedModelAnswerError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message;
  return (
    message.includes(INCOMPLETE_JSON_OBJECT_ERROR) ||
    message.includes(MAX_OUTPUT_TOKENS_ERROR) ||
    message.includes("truncated (incomplete JSON") ||
    message.includes("max output tokens reached")
  );
}

/**
 * Extract a JSON object from a model answer that may include markdown fences or prose.
 */
export function extractJsonFromModelAnswer(answer: string): unknown {
  const trimmed = answer.trim();
  if (trimmed.length === 0) {
    throw new Error("Model answer is empty.");
  }

  const candidate = extractJsonCandidate(trimmed);
  const jsonText = sliceFirstJsonObject(candidate);
  if (!jsonText) {
    if (candidate.includes("{")) {
      throw new Error(INCOMPLETE_JSON_OBJECT_ERROR);
    }
    throw new Error("No JSON object found in model answer.");
  }

  return parseJsonObjectText(jsonText);
}

/** Fix common LLM JSON mistakes before parsing. */
export function repairJsonText(text: string): string {
  return text.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonObjectText(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText) as unknown;
  } catch (firstError) {
    try {
      return JSON.parse(repairJsonText(jsonText)) as unknown;
    } catch {
      const message =
        firstError instanceof Error
          ? firstError.message
          : "Invalid JSON in model answer.";
      throw new Error(message);
    }
  }
}

/** @internal exported for tests that need parse without full answer extraction */
export function parseJsonFromModelAnswerSlice(jsonText: string): unknown {
  return parseJsonObjectText(jsonText);
}
