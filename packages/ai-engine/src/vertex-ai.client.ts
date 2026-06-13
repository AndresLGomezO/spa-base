import { VertexAI } from "@google-cloud/vertexai";

export interface VertexAiConfig {
  readonly projectId: string;
  readonly region: string;
  readonly modelId: string;
  readonly mockEnabled: boolean;
}

let vertexClient: VertexAI | null = null;

function getVertexClient(config: VertexAiConfig): VertexAI {
  if (!vertexClient) {
    vertexClient = new VertexAI({
      project: config.projectId,
      location: config.region,
    });
  }
  return vertexClient;
}

export function extractResponseText(response: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("Vertex AI returned an empty response.");
  }
  return text;
}

export async function generateChatAnswer(
  config: VertexAiConfig,
  question: string,
): Promise<string> {
  if (config.mockEnabled) {
    return `[mock] You asked: ${question.slice(0, 200)}`;
  }

  const model = getVertexClient(config).getGenerativeModel({
    model: config.modelId,
    systemInstruction: {
      role: "system",
      parts: [
        {
          text: "You are a helpful assistant for an entity management platform. Answer clearly and concisely.",
        },
      ],
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: question }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  });

  return extractResponseText(result.response);
}
