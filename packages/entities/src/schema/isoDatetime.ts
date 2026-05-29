/**
 * ISO datetime string validator aligned with @repo/shared-types User model.
 * Entity `type: "date"` fields use strings, not native Date objects.
 */
import { z } from "zod";

/** ISO datetime string validated with Date.parse (aligned with @repo/shared-types User model). */
export const isoDatetimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be an ISO datetime string.",
  });
