export interface JsonActionTriggerLabels {
  readonly group?: string;
  readonly view: string;
  readonly import: string;
  readonly viewAriaLabel: string;
  readonly importAriaLabel: string;
}

export const DEFAULT_JSON_ACTION_TRIGGER_LABELS: JsonActionTriggerLabels = {
  group: "JSON",
  view: "View",
  import: "Import",
  viewAriaLabel: "View JSON",
  importAriaLabel: "Import JSON",
};
