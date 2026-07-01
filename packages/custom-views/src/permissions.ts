/** Browser-safe permission constants (no Node.js crypto). */

export const CUSTOM_VIEW_PERMISSIONS = [
  "customView.read",
  "customView.create",
  "customView.update",
  "customView.delete",
] as const;
