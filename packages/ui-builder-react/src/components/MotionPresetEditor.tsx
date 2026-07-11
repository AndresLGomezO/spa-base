import {
  MOTION_DURATION_MAX_MS,
  MOTION_HOVER_ROTATE_DEG_MAX,
  MOTION_HOVER_ROTATE_DEG_MIN,
  MOTION_PRESS_GLOW_BLUR_MAX_PX,
  MOTION_PRESS_OPACITY_MAX,
  MOTION_PRESS_OPACITY_MIN,
  MOTION_PRESS_SCALE_MAX,
  MOTION_PRESS_SCALE_MIN,
  type MotionEntrance,
  type MotionHoverSurface,
  type MotionHoverTransform,
  type MotionPress,
  type MotionPressColor,
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
  readonly press: string;
  readonly pressColor: string;
  readonly pressDurationMs: string;
  readonly pressScale: string;
  readonly pressOpacity: string;
  readonly pressGlowBlurPx: string;
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

const PRESS_OPTIONS: readonly {
  readonly value: MotionPress;
  readonly label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "ripple", label: "Ripple" },
  { value: "glow", label: "Glow pulse" },
  { value: "wave", label: "Wave flash" },
  { value: "neon", label: "Neon expand" },
  { value: "pop", label: "Icon pop" },
  { value: "slide", label: "Slide highlight" },
];

const PRESS_COLOR_OPTIONS: readonly {
  readonly value: MotionPressColor;
  readonly label: string;
}[] = [
  { value: "default", label: "Primary (theme)" },
  { value: "accent", label: "Accent (theme)" },
  { value: "muted", label: "Muted (theme)" },
  { value: "info", label: "Info (theme)" },
  { value: "destructive", label: "Destructive (theme)" },
  { value: "warning", label: "Warning (theme)" },
  { value: "success", label: "Success (theme)" },
  { value: "foreground", label: "Foreground (theme)" },
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
    motion.press !== undefined ||
    motion.pressColor !== undefined ||
    motion.pressDurationMs !== undefined ||
    motion.pressScale !== undefined ||
    motion.pressOpacity !== undefined ||
    motion.pressGlowBlurPx !== undefined ||
    motion.transition !== undefined ||
    motion.durationMs !== undefined ||
    motion.delayMs !== undefined ||
    motion.staggerIndex === true
  );
}

function clearNumberField(
  motion: MotionPreset | undefined,
  key: keyof MotionPreset,
  onChange: (motion: MotionPreset | undefined) => void,
): void {
  const next = { ...(motion ?? {}) };
  delete next[key];
  onChange(hasMotionValues(next) ? next : undefined);
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
  const press = motion?.press ?? "none";
  const pressColor = motion?.pressColor ?? "default";
  const transition = motion?.transition ?? "none";
  const showPressDetails = press !== "none";
  const showPressScale = press === "pop";
  const showPressGlowBlur = press === "glow" || press === "neon";

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
              clearNumberField(motion, "hoverRotateDeg", onChange);
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
              clearNumberField(motion, "hoverDurationMs", onChange);
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
        <span className="text-muted-foreground">{labels.press}</span>
        <Select
          searchable
          value={press}
          onChange={(event) =>
            onChange(
              patchMotion(motion, {
                press: event.target.value as MotionPress,
              }),
            )
          }
        >
          {PRESS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      {showPressDetails ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{labels.pressColor}</span>
            <Select
              searchable
              value={pressColor}
              onChange={(event) =>
                onChange(
                  patchMotion(motion, {
                    pressColor: event.target.value as MotionPressColor,
                  }),
                )
              }
            >
              {PRESS_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.pressDurationMs}
            </span>
            <Input
              type="number"
              min={0}
              max={MOTION_DURATION_MAX_MS}
              step={25}
              value={motion?.pressDurationMs ?? ""}
              placeholder="Default"
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw.length === 0) {
                  clearNumberField(motion, "pressDurationMs", onChange);
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onChange(
                  patchMotion(motion, {
                    pressDurationMs: Math.min(
                      MOTION_DURATION_MAX_MS,
                      Math.max(0, parsed),
                    ),
                  }),
                );
              }}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{labels.pressOpacity}</span>
            <Input
              type="number"
              min={MOTION_PRESS_OPACITY_MIN}
              max={MOTION_PRESS_OPACITY_MAX}
              step={0.05}
              value={motion?.pressOpacity ?? ""}
              placeholder="0.4"
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw.length === 0) {
                  clearNumberField(motion, "pressOpacity", onChange);
                  return;
                }
                const parsed = Number.parseFloat(raw);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onChange(
                  patchMotion(motion, {
                    pressOpacity: Math.min(
                      MOTION_PRESS_OPACITY_MAX,
                      Math.max(MOTION_PRESS_OPACITY_MIN, parsed),
                    ),
                  }),
                );
              }}
            />
          </label>

          {showPressScale ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.pressScale}</span>
              <Input
                type="number"
                min={MOTION_PRESS_SCALE_MIN}
                max={MOTION_PRESS_SCALE_MAX}
                step={0.05}
                value={motion?.pressScale ?? ""}
                placeholder="1.2"
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  if (raw.length === 0) {
                    clearNumberField(motion, "pressScale", onChange);
                    return;
                  }
                  const parsed = Number.parseFloat(raw);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  onChange(
                    patchMotion(motion, {
                      pressScale: Math.min(
                        MOTION_PRESS_SCALE_MAX,
                        Math.max(MOTION_PRESS_SCALE_MIN, parsed),
                      ),
                    }),
                  );
                }}
              />
            </label>
          ) : null}

          {showPressGlowBlur ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.pressGlowBlurPx}
              </span>
              <Input
                type="number"
                min={0}
                max={MOTION_PRESS_GLOW_BLUR_MAX_PX}
                step={1}
                value={motion?.pressGlowBlurPx ?? ""}
                placeholder={press === "neon" ? "40" : "20"}
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  if (raw.length === 0) {
                    clearNumberField(motion, "pressGlowBlurPx", onChange);
                    return;
                  }
                  const parsed = Number.parseInt(raw, 10);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  onChange(
                    patchMotion(motion, {
                      pressGlowBlurPx: Math.min(
                        MOTION_PRESS_GLOW_BLUR_MAX_PX,
                        Math.max(0, parsed),
                      ),
                    }),
                  );
                }}
              />
            </label>
          ) : null}
        </>
      ) : null}

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
              clearNumberField(motion, "durationMs", onChange);
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
              clearNumberField(motion, "delayMs", onChange);
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
