import {
  estimateTokenCount,
  hashSourceValue,
  truncateText,
  type TenantAiContextRecord,
  type UserAiMemoryRecord,
} from "@repo/ai-context";

import {
  GROUNDED_CHAT_PREFIX_MAX_CHARS,
  GROUNDED_CHAT_SYSTEM_INSTRUCTION,
} from "./constants.js";

export interface AssembledGroundedChatPrefix {
  readonly systemInstruction: string;
  /** Stable context packed into Vertex CachedContent contents (or prompt blocks). */
  readonly prefixText: string;
  readonly prefixHash: string;
  readonly estimatedTokens: number;
}

function catalogFragment(record: TenantAiContextRecord | null): string {
  if (!record) return "";
  if (record.assembled && record.assembled.trim().length > 0) {
    return record.assembled;
  }
  return Object.values(record.fragments).join("\n\n");
}

export function assembleGroundedChatPrefix(input: {
  readonly entityCatalog: TenantAiContextRecord | null;
  readonly memory: UserAiMemoryRecord | null;
}): AssembledGroundedChatPrefix {
  const parts: string[] = [];

  const catalog = catalogFragment(input.entityCatalog);
  if (catalog.trim()) {
    parts.push(`## Tenant entity catalog\n${catalog.trim()}`);
  }

  if (input.memory?.profileFragment?.trim()) {
    parts.push(`## User profile\n${input.memory.profileFragment.trim()}`);
  }

  if (input.memory?.dataSnapshot?.trim()) {
    parts.push(`## User data snapshot\n${input.memory.dataSnapshot.trim()}`);
  }

  if (input.memory?.factIndex && input.memory.factIndex.length > 0) {
    const facts = input.memory.factIndex
      .map((f) => `- ${f.key}: ${f.value}`)
      .join("\n");
    parts.push(`## Known facts\n${facts}`);
  }

  const prefixText = truncateText(
    parts.join("\n\n"),
    GROUNDED_CHAT_PREFIX_MAX_CHARS,
  );
  const prefixHash = hashSourceValue({
    catalogHash: input.entityCatalog?.sourceHash ?? null,
    memoryHash: input.memory?.sourceHash ?? null,
    prefixText,
  });

  return {
    systemInstruction: GROUNDED_CHAT_SYSTEM_INSTRUCTION,
    prefixText,
    prefixHash,
    estimatedTokens: estimateTokenCount(
      `${GROUNDED_CHAT_SYSTEM_INSTRUCTION}\n${prefixText}`,
    ),
  };
}
