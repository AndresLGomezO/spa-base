/**
 * Public Vertex AI types and generation constants.
 * Model call implementations live under `./clients/internal` and must only be
 * used via `createAiController` / `runAiRequest`.
 */
export {
  DATA_HOOK_AI_BATCH_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_NARRATIVE_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_NARRATIVE_THINKING_BUDGET,
  DATA_HOOK_AI_THINKING_BUDGET,
  resolveGeminiLocation,
  resolveVertexApiEndpoint,
  UI_BUILDER_MAX_OUTPUT_TOKENS,
  type GenerateModelAnswerInput,
  type GenerateModelAnswerOptions,
  type VertexAiConfig,
} from "./clients/internal/vertex-ai.client.js";
