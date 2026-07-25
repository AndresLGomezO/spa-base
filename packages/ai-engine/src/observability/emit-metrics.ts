export interface AiChatMetricsPayload {
  readonly tenantId: string;
  readonly stepCount: number;
  readonly toolCallCount: number;
  readonly cacheHitRatio: number;
  readonly totalTokens: number;
  readonly retrievalTop1Score?: number;
  readonly confidence?: number;
}

export interface AiErrorMetricPayload {
  readonly tenantId: string;
  readonly feature: string;
}

/**
 * Emit custom AI metrics. Uses structured console logs that Cloud Logging
 * can scrape into Cloud Monitoring log-based metrics. Swap for the
 * Monitoring client when a dedicated exporter is configured.
 */
export function emitAiChatMetrics(payload: AiChatMetricsPayload): void {
  console.info(
    JSON.stringify({
      severity: "INFO",
      message: "ai.metrics.chat",
      "ai.tokens.total": payload.totalTokens,
      "ai.cache.hit_ratio": payload.cacheHitRatio,
      "ai.step.count": payload.stepCount,
      "ai.tool_calls.count": payload.toolCallCount,
      ...(payload.retrievalTop1Score != null
        ? { "ai.retrieval.top1_score": payload.retrievalTop1Score }
        : {}),
      ...(payload.confidence != null
        ? { "ai.confidence": payload.confidence }
        : {}),
      tenantId: payload.tenantId,
    }),
  );
}

export function emitAiErrorMetric(payload: AiErrorMetricPayload): void {
  console.info(
    JSON.stringify({
      severity: "ERROR",
      message: "ai.metrics.error",
      "ai.error.count": 1,
      feature: payload.feature,
      tenantId: payload.tenantId,
    }),
  );
}

export function emitAiStepDurationMetric(input: {
  readonly tenantId: string;
  readonly stepId: string;
  readonly durationMs: number;
}): void {
  console.info(
    JSON.stringify({
      severity: "INFO",
      message: "ai.metrics.step",
      "ai.step.duration_ms": input.durationMs,
      stepId: input.stepId,
      tenantId: input.tenantId,
    }),
  );
}
