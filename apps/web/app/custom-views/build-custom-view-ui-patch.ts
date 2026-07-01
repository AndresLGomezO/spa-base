import type { PatchCustomViewInput } from "@repo/custom-views";

export function buildCustomViewUiPatch(
  ui: Record<string, unknown>,
): PatchCustomViewInput {
  return { ui: ui as NonNullable<PatchCustomViewInput["ui"]> };
}
