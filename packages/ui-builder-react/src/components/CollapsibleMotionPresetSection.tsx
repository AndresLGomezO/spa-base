import type { MotionPreset } from "@repo/ui-builder-core";

import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";
import {
  MotionPresetEditor,
  type MotionPresetEditorLabels,
} from "./MotionPresetEditor.js";

export interface CollapsibleMotionPresetSectionProps {
  readonly title: string;
  readonly motion?: MotionPreset;
  readonly onChange: (motion: MotionPreset | undefined) => void;
  readonly labels: MotionPresetEditorLabels;
  readonly clearLabel?: string;
  readonly defaultOpen?: boolean;
}

function hasMotionValues(motion: MotionPreset | undefined): boolean {
  if (!motion) {
    return false;
  }
  return (
    motion.entrance !== undefined ||
    motion.hover !== undefined ||
    motion.hoverSurface !== undefined ||
    motion.hoverTransform !== undefined ||
    motion.hoverRotateDeg !== undefined ||
    motion.hoverDurationMs !== undefined ||
    motion.transition !== undefined ||
    motion.durationMs !== undefined ||
    motion.delayMs !== undefined ||
    motion.staggerIndex === true
  );
}

export function CollapsibleMotionPresetSection({
  title,
  motion,
  onChange,
  labels,
  clearLabel,
  defaultOpen = false,
}: CollapsibleMotionPresetSectionProps) {
  const showClear = hasMotionValues(motion);

  return (
    <CollapsibleEditorCard
      title={title}
      defaultOpen={defaultOpen}
      headerEnd={
        showClear && clearLabel ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            onClick={() => onChange(undefined)}
          >
            {clearLabel}
          </button>
        ) : null
      }
    >
      <MotionPresetEditor
        motion={motion}
        onChange={onChange}
        labels={{ ...labels, title: undefined }}
      />
    </CollapsibleEditorCard>
  );
}
