import {
  generateChatAnswer,
  generateModelAnswer,
  type VertexAiConfig,
} from "../clients/internal/vertex-ai.client.js";
import { generateTextEmbedding } from "../clients/internal/text-embedding.js";
import {
  generateImagenImage,
  type VertexImagenConfig,
} from "../clients/internal/vertex-imagen.client.js";
import type { AiControllerClients } from "./ai-request.types.js";

export function createDefaultAiClients(): AiControllerClients {
  return {
    generateModelAnswer,
    generateChatAnswer,
    generateTextEmbedding: async (config: VertexAiConfig, text: string) =>
      generateTextEmbedding(config, text),
    generateImagenImage: async (config: VertexAiConfig, prompt: string) => {
      const imagenConfig: VertexImagenConfig = {
        projectId: config.projectId,
        region: config.region,
        imagenModelId: config.imagenModelId ?? "imagen-3.0-generate-002",
        mockEnabled: config.mockEnabled,
      };
      const result = await generateImagenImage(imagenConfig, prompt);
      return {
        base64: result.buffer.toString("base64"),
        mimeType: result.mimeType,
        usage: result.usage,
      };
    },
  };
}
