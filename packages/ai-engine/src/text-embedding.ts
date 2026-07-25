/**
 * Public embedding helpers (similarity, field readers, mock vectors).
 * Live Vertex embedding calls are internal — use `createAiController`.
 */
export {
  buildMockTextEmbedding,
  cosineSimilarity,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL_ID,
  pickBestEmbeddingMatch,
  readEmbeddingField,
  type EmbeddingTaskType,
  type GenerateTextEmbeddingOptions,
} from "./clients/internal/text-embedding.js";
