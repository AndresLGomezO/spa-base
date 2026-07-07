import { z } from "zod";

import {
  MOTION_DURATION_MAX_MS,
  MOTION_HOVER_ROTATE_DEG_MAX,
  MOTION_HOVER_ROTATE_DEG_MIN,
} from "../types/motion.js";

export const motionPresetSchema = z
  .object({
    entrance: z.enum(["none", "fade", "slide-up", "scale"]).optional(),
    durationMs: z.number().int().min(0).max(MOTION_DURATION_MAX_MS).optional(),
    delayMs: z.number().int().min(0).max(MOTION_DURATION_MAX_MS).optional(),
    staggerIndex: z.boolean().optional(),
    hover: z.enum(["none", "lift", "glow"]).optional(),
    hoverSurface: z
      .enum([
        "none",
        "default",
        "accent",
        "muted",
        "info",
        "destructive",
        "warning",
        "success",
      ])
      .optional(),
    hoverTransform: z
      .enum(["none", "lift", "scale-up", "scale-down", "glow"])
      .optional(),
    hoverRotateDeg: z
      .number()
      .min(MOTION_HOVER_ROTATE_DEG_MIN)
      .max(MOTION_HOVER_ROTATE_DEG_MAX)
      .optional(),
    hoverDurationMs: z
      .number()
      .int()
      .min(0)
      .max(MOTION_DURATION_MAX_MS)
      .optional(),
    transition: z.enum(["none", "layout", "all"]).optional(),
  })
  .strict();
