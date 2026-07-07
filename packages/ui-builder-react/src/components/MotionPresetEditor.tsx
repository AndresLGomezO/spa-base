import {
  MOTION_DURATION_MAX_MS,
  MOTION_HOVER_ROTATE_DEG_MAX,
  MOTION_HOVER_ROTATE_DEG_MIN,
  type MotionEntrance,
  type MotionHoverSurface,
  type MotionHoverTransform,
  type MotionPreset,
  type MotionTransition,
} from "@repo/ui-builder-core";
import { Button, Input, Text, Select } from "@repo/ui";

export interface MotionPresetEditorLabels {
  readonly title?: string;
  readonly entrance: string;
  readonly hoverSurface: string;
  readonly hoverTransform: string;
  readonly hoverRotateDeg: string;
  readonly hoverDurationMs: string;
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

const HOVER_SURFACE_OPTIONS: readonly {
  readonly value: MotionHoverSurface;
  readonly label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "default", label: "Highlight (theme)" },
  { value: "accent", label: "Accent (theme)" },
  { value: "muted", label: "Muted (theme)" },
  { value: "info", label: "Info tint (theme)" },
  { value: "destructive", label: "Destructive tint (theme)" },
  { value: "warning", label: "Warning tint (theme)" },
  { value: "success", label: "Success tint (theme)" },
];

const HOVER_TRANSFORM_OPTIONS: readonly {
  readonly value: MotionHoverTransform;
  readonly label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "scale-up", label: "Scale up" },
  { value: "scale-down", label: "Scale down" },
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

function resolveHoverSurface(
  motion: MotionPreset | undefined,
): MotionHoverSurface {
  return motion?.hoverSurface ?? "none";
}

function resolveHoverTransform(
  motion: MotionPreset | undefined,
): MotionHoverTransform {
  if (motion?.hoverTransform !== undefined) {
    return motion.hoverTransform;
  }
  switch (motion?.hover) {
    case "lift":
      return "lift";
    case "glow":
      return "glow";
    default:
      return "none";
  }
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

export function MotionPresetEditor({
  motion,
  onChange,
  labels,
  className,
}: MotionPresetEditorProps) {
  const entrance = motion?.entrance ?? "none";
  const hoverSurface = resolveHoverSurface(motion);
  const hoverTransform = resolveHoverTransform(motion);
  const transition = motion?.transition ?? "none";

  return (
    <div className={className ?? "flex flex-col gap-2"}>
      {labels.title ? (
        <Text className="text-muted-foreground text-sm">{labels.title}</Text>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.entrance}</span>
        <Select
          searchable
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
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.hoverSurface}</span>
        <Select
          searchable
          value={hoverSurface}
          onChange={(event) =>
            onChange(
              patchMotion(motion, {
                hoverSurface: event.target.value as MotionHoverSurface,
                hover: undefined,
              }),
            )
          }
        >
          {HOVER_SURFACE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.hoverTransform}</span>
        <Select
          searchable
          value={hoverTransform}
          onChange={(event) =>
            onChange(
              patchMotion(motion, {
                hoverTransform: event.target.value as MotionHoverTransform,
                hover: undefined,
              }),
            )
          }
        >
          {HOVER_TRANSFORM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.hoverRotateDeg}</span>
        <Input
          type="number"
          min={MOTION_HOVER_ROTATE_DEG_MIN}
          max={MOTION_HOVER_ROTATE_DEG_MAX}
          step={1}
          value={motion?.hoverRotateDeg ?? ""}
          placeholder="0"
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (raw.length === 0) {
              const { hoverRotateDeg: _removed, ...rest } = motion ?? {};
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
                hoverRotateDeg: Math.min(
                  MOTION_HOVER_ROTATE_DEG_MAX,
                  Math.max(MOTION_HOVER_ROTATE_DEG_MIN, parsed),
                ),
              }),
            );
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.hoverDurationMs}</span>
        <Input
          type="number"
          min={0}
          max={MOTION_DURATION_MAX_MS}
          step={25}
          value={motion?.hoverDurationMs ?? ""}
          placeholder="150"
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (raw.length === 0) {
              const { hoverDurationMs: _removed, ...rest } = motion ?? {};
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
                hoverDurationMs: Math.min(
                  MOTION_DURATION_MAX_MS,
                  Math.max(0, parsed),
                ),
              }),
            );
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.transition}</span>
        <Select
          searchable
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
        </Select>
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
