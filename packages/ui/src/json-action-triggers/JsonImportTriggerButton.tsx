import { FileUp } from "lucide-react";

import {
  DEFAULT_JSON_ACTION_TRIGGER_LABELS,
  type JsonActionTriggerLabels,
} from "./json-action-trigger-types";
import { jsonActionTriggerButtonClassName } from "./json-action-trigger-classes";

export interface JsonImportTriggerButtonProps {
  readonly labels?: JsonActionTriggerLabels;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

export function JsonImportTriggerButton({
  labels = DEFAULT_JSON_ACTION_TRIGGER_LABELS,
  onClick,
  disabled = false,
}: JsonImportTriggerButtonProps) {
  return (
    <button
      type="button"
      className={jsonActionTriggerButtonClassName}
      aria-label={labels.importAriaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <FileUp aria-hidden className="size-3.5 shrink-0" />
      <span>{labels.import}</span>
    </button>
  );
}
