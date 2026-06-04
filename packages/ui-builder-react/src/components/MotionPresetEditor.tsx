import {
  MOTION_DURATION_MAX_MS,
  type MotionEntrance,
  type MotionHover,
  type MotionPreset,
  type MotionTransition,
} from "@repo/ui-builder-core";
import { Button, Input, Text } from "@repo/ui";

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

export interface MotionPresetEditorLabels {
  readonly title?: string;
  readonly entrance: string;
  readonly hover: string;
  readonly transition: string;
  readonly durationMs: string;
  readonly delayMs: string;
  readonly staggerIndex: string;
  readonly clearEffects: string;
}

export interface MotionPresetEditorProps {
  readonly motion?: MotionPreset;
  readonly onChange: (motion: MotionPreset | undefined) => void;
  readonly labels: MotionPresetEditorLabels;
  readonly className?: string;
}

const ENTRANCE_OPTIONS: readonly {
  readonly value: MotionEntrance;
  readonly label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade in" },
  { value: "slide-up", label: "Slide up" },
  { value: "scale", label: "Scale in" },
];

const HOVER_OPTIONS: readonly {
  readonly value: MotionHover;
  readonly label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
];

const TRANSITION_OPTIONS: readonly {
  readonly value: MotionTransition;
  readonly label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "layout", label: "Layout" },
  { value: "all", label: "All properties" },
];

function patchMotion(
  motion: MotionPreset | undefined,
  patch: Partial<MotionPreset>,
): MotionPreset {
  return { ...(motion ?? {}), ...patch };
}

function hasMotionValues(motion: MotionPreset | undefined): boolean {
  if (!motion) {
    return false;
  }
  return (
    motion.entrance !== undefined ||
    motion.hover !== undefined ||
    motion.transition !== undefined ||
    motion.durationMs !== undefined ||
    motion.delayMs !== undefined ||
    motion.staggerIndex === true
  );
}

export function MotionPresetEditor({
  motion,
  onChange,
  labels,
  className,
}: MotionPresetEditorProps) {
  const entrance = motion?.entrance ?? "none";
  const hover = motion?.hover ?? "none";
  const transition = motion?.transition ?? "none";

  return (
    <div className={className ?? "flex flex-col gap-2"}>
      {labels.title ? (
        <Text className="text-muted-foreground text-sm">{labels.title}</Text>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.entrance}</span>
        <select
          className={SELECT_CLASS}
          value={entrance}
          onChange={(event) =>
            onChange(
              patchMotion(motion, {
                entrance: event.target.value as MotionEntrance,
              }),
            )
          }
        >
          {ENTRANCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.hover}</span>
        <select
          className={SELECT_CLASS}
          value={hover}
          onChange={(event) =>
            onChange(
              patchMotion(motion, {
                hover: event.target.value as MotionHover,
              }),
            )
          }
        >
          {HOVER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.transition}</span>
        <select
          className={SELECT_CLASS}
          value={transition}
          onChange={(event) =>
            onChange(
              patchMotion(motion, {
                transition: event.target.value as MotionTransition,
              }),
            )
          }
        >
          {TRANSITION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.durationMs}</span>
        <Input
          type="number"
          min={0}
          max={MOTION_DURATION_MAX_MS}
          step={50}
          value={motion?.durationMs ?? ""}
          placeholder="Default"
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (raw.length === 0) {
              const { durationMs: _removed, ...rest } = motion ?? {};
              void _removed;
              onChange(hasMotionValues(rest) ? rest : undefined);
              return;
            }
            const parsed = Number.parseInt(raw, 10);
            if (!Number.isFinite(parsed)) {
              return;
            }
            onChange(
              patchMotion(motion, {
                durationMs: Math.min(
                  MOTION_DURATION_MAX_MS,
                  Math.max(0, parsed),
                ),
              }),
            );
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.delayMs}</span>
        <Input
          type="number"
          min={0}
          max={MOTION_DURATION_MAX_MS}
          step={50}
          value={motion?.delayMs ?? ""}
          placeholder="Default"
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (raw.length === 0) {
              const { delayMs: _removed, ...rest } = motion ?? {};
              void _removed;
              onChange(hasMotionValues(rest) ? rest : undefined);
              return;
            }
            const parsed = Number.parseInt(raw, 10);
            if (!Number.isFinite(parsed)) {
              return;
            }
            onChange(
              patchMotion(motion, {
                delayMs: Math.min(MOTION_DURATION_MAX_MS, Math.max(0, parsed)),
              }),
            );
          }}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={motion?.staggerIndex ?? false}
          onChange={(event) =>
            onChange(
              patchMotion(motion, { staggerIndex: event.target.checked }),
            )
          }
        />
        <span>{labels.staggerIndex}</span>
      </label>

      {hasMotionValues(motion) ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(undefined)}
        >
          {labels.clearEffects}
        </Button>
      ) : null}
    </div>
  );
}
