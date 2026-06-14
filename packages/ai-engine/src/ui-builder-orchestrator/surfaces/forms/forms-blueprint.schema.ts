import { z } from "zod";

export const formBlueprintStepSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    goal: z.string().trim().min(1).optional(),
    maxFields: z.number().int().min(1).max(6).optional(),
    helper: z.string().trim().min(1).optional(),
    readOnly: z.boolean().optional(),
  })
  .strict();

export const formBlueprintSchema = z
  .object({
    conceptName: z.string().trim().min(1),
    presentation: z.enum(["plain", "wizard"]),
    visualTheme: z.string().trim().min(1).optional(),
    steps: z.array(formBlueprintStepSchema).min(1).max(8),
    footerLayout: z.string().trim().min(1).optional(),
  })
  .strict();

export type FormBlueprint = z.infer<typeof formBlueprintSchema>;
export type FormBlueprintStep = z.infer<typeof formBlueprintStepSchema>;

export const generateBlueprintOutputSchema = z
  .object({
    blueprint: formBlueprintSchema,
  })
  .strict();
