/** Browser-safe permission constants (no Node.js crypto). */

export const HOOK_PERMISSIONS = [
  "hook.read",
  "hook.create",
  "hook.update",
  "hook.delete",
] as const;
