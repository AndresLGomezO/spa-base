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
 * Extract a JSON object from a model answer that may include markdown fences or prose.
 */
export function extractJsonFromModelAnswer(answer: string): unknown {
  const trimmed = answer.trim();
  if (trimmed.length === 0) {
    throw new Error("Model answer is empty.");
  }

  const candidate = extractJsonCandidate(trimmed);
  const jsonStart = candidate.indexOf("{");
  const jsonEnd = candidate.lastIndexOf("}");
  if (jsonStart === -1) {
    throw new Error("No JSON object found in model answer.");
  }
  if (jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(
      "Model response appears truncated (incomplete JSON object).",
    );
  }

  const jsonText = candidate.slice(jsonStart, jsonEnd + 1);
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
