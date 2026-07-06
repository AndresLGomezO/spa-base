import { type ReactNode } from "react";

import { Text } from "../typography/Text";
import {
  DEFAULT_JSON_ACTION_TRIGGER_LABELS,
  type JsonActionTriggerLabels,
} from "./json-action-trigger-types";
import { jsonActionTriggerClusterClassName } from "./json-action-trigger-classes";

export interface JsonActionTriggerGroupProps {
  readonly labels?: JsonActionTriggerLabels;
  readonly children: ReactNode;
  readonly showGroupLabel?: boolean;
}

export function JsonActionTriggerGroup({
  labels = DEFAULT_JSON_ACTION_TRIGGER_LABELS,
  children,
  showGroupLabel = true,
}: JsonActionTriggerGroupProps) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
      {showGroupLabel && labels.group ? (
        <Text className="text-muted-foreground shrink-0 text-xs font-medium">
          {labels.group}
        </Text>
      ) : null}
      <div className={jsonActionTriggerClusterClassName}>{children}</div>
    </div>
  );
}
