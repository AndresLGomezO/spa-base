export const AI_CHAT_PERMISSIONS = ["ai.chat.run", "ai.chat.read"] as const;

export const AI_UI_BUILDER_PERMISSIONS = [
  "ai.uiBuilder.run",
  "ai.uiBuilder.read",
] as const;

export const AI_DATA_MODEL_BUILDER_PERMISSIONS = [
  "ai.dataModelBuilder.run",
] as const;

export const AI_DATA_HOOK_PERMISSIONS = [
  "ai.dataHook.run",
  "ai.dataHook.read",
] as const;

export const AI_PERMISSIONS = [
  ...AI_CHAT_PERMISSIONS,
  ...AI_UI_BUILDER_PERMISSIONS,
  ...AI_DATA_MODEL_BUILDER_PERMISSIONS,
  ...AI_DATA_HOOK_PERMISSIONS,
] as const;

export type AiFeature =
  | "chat"
  | "uiBuilder"
  | "dataModelBuilder"
  | "dataHookCallAi"
  | "dataHookBatchCallAi"
  | "dataHookEmbedding"
  | "gmailExtract";

export const AI_FEATURE_PERMISSIONS: Record<
  AiFeature,
  readonly [string, ...string[]]
> = {
  chat: AI_CHAT_PERMISSIONS,
  uiBuilder: AI_UI_BUILDER_PERMISSIONS,
  dataModelBuilder: AI_DATA_MODEL_BUILDER_PERMISSIONS,
  dataHookCallAi: AI_DATA_HOOK_PERMISSIONS,
  dataHookBatchCallAi: AI_DATA_HOOK_PERMISSIONS,
  dataHookEmbedding: AI_DATA_HOOK_PERMISSIONS,
  gmailExtract: AI_DATA_HOOK_PERMISSIONS,
};

export const AI_FEATURE_RUN_PERMISSION: Record<AiFeature, string> = {
  chat: "ai.chat.run",
  uiBuilder: "ai.uiBuilder.run",
  dataModelBuilder: "ai.dataModelBuilder.run",
  dataHookCallAi: "ai.dataHook.run",
  dataHookBatchCallAi: "ai.dataHook.run",
  dataHookEmbedding: "ai.dataHook.run",
  gmailExtract: "ai.dataHook.run",
};
