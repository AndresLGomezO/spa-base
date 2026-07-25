export const AI_JOB_FEATURE_KEYS = [
  "chat",
  "uiBuilder",
  "dataModelBuilder",
  "dataHookCallAi",
  "dataHookBatchCallAi",
  "dataHookEmbedding",
  "gmailExtract",
] as const;

export type AiJobFeatureKey = (typeof AI_JOB_FEATURE_KEYS)[number];

function isAiJobFeatureKey(value: string): value is AiJobFeatureKey {
  return (AI_JOB_FEATURE_KEYS as readonly string[]).includes(value);
}

export function parseAiJobFeatures(
  raw: string | null,
): readonly AiJobFeatureKey[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(isAiJobFeatureKey);
}

export function aiJobFeatureForEvent(event: {
  readonly subtitle?: string | null;
  readonly summary?: Readonly<Record<string, unknown>> | null;
}): AiJobFeatureKey | null {
  const fromSummary =
    typeof event.summary?.feature === "string" ? event.summary.feature : null;
  const candidate = fromSummary ?? event.subtitle ?? null;
  if (!candidate || !isAiJobFeatureKey(candidate)) {
    return null;
  }
  return candidate;
}

export function aiJobFeatureLabelKey(
  feature: AiJobFeatureKey,
): `aiDebugger.features.${AiJobFeatureKey}` {
  return `aiDebugger.features.${feature}`;
}
