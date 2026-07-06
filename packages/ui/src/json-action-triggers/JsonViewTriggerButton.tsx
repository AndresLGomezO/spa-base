import { FileJson } from "lucide-react";

import {
  DEFAULT_JSON_ACTION_TRIGGER_LABELS,
  type JsonActionTriggerLabels,
} from "./json-action-trigger-types";
import { jsonActionTriggerButtonClassName } from "./json-action-trigger-classes";

export interface JsonViewTriggerButtonProps {
  readonly labels?: JsonActionTriggerLabels;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

export function JsonViewTriggerButton({
  labels = DEFAULT_JSON_ACTION_TRIGGER_LABELS,
  onClick,
  disabled = false,
}: JsonViewTriggerButtonProps) {
  return (
    <button
      type="button"
      className={jsonActionTriggerButtonClassName}
      aria-label={labels.viewAriaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <FileJson aria-hidden className="size-3.5 shrink-0" />
      <span>{labels.view}</span>
    </button>
  );
}
