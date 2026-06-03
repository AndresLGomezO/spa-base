import { z } from "zod";

import { MOTION_DURATION_MAX_MS } from "../types/motion.js";

export const motionPresetSchema = z
  .object({
    entrance: z.enum(["none", "fade", "slide-up", "scale"]).optional(),
    durationMs: z.number().int().min(0).max(MOTION_DURATION_MAX_MS).optional(),
    delayMs: z.number().int().min(0).max(MOTION_DURATION_MAX_MS).optional(),
    staggerIndex: z.boolean().optional(),
    hover: z.enum(["none", "lift", "glow"]).optional(),
    transition: z.enum(["none", "layout", "all"]).optional(),
  })
  .strict();
