import {
  buildAllModelFragments,
  MODEL_FRAGMENT_IDS,
} from "../generate/model-schema.js";

export const DATA_MODEL_SYSTEM_INSTRUCTION = `You are an expert data-model assistant for a multi-tenant entity management platform.
You help design and modify entity definitions (fields, types, relations, and UI flags).
Rules:
- Use only field types and properties from the provided schema fragments.
- Entity and field names must be camelCase; entity name starts with lowercase letter.
- Do not define system fields (id, tenantId, createdAt, updatedAt, ownerId, accessUserIds, sharedWith).
- Relation fields store ids; respect cardinality and onDelete semantics.
- Mark sensitive fields appropriately; never output raw sensitive values.
- When proposing a definition, return valid JSON matching the create/patch input shape.`;

export function buildDataModelContext(): Record<string, string> {
  return buildAllModelFragments();
}

export function assembleDataModelContext(input?: {
  readonly userPrompt?: string;
  readonly existingDefinitionJson?: string;
}): {
  readonly systemInstruction: string;
  readonly contextBlocks: readonly {
    readonly id: string;
    readonly content: string;
  }[];
} {
  const fragments = buildAllModelFragments();
  const blocks: { id: string; content: string }[] = MODEL_FRAGMENT_IDS.map(
    (id) => ({
      id,
      content: fragments[id] ?? "",
    }),
  ).filter((block) => block.content.length > 0);

  if (input?.existingDefinitionJson?.trim()) {
    blocks.push({
      id: "model.current.definition",
      content: `# Current entity definition\n\n\`\`\`json\n${input.existingDefinitionJson.trim()}\n\`\`\``,
    });
  }

  if (input?.userPrompt?.trim()) {
    blocks.push({
      id: "user.prompt",
      content: `# User request\n\n${input.userPrompt.trim()}`,
    });
  }

  return {
    systemInstruction: DATA_MODEL_SYSTEM_INSTRUCTION,
    contextBlocks: blocks,
  };
}
