import { z } from "zod";

export const gmailIngestDeliveryModeSchema = z.enum(["poll", "push"]);
export type GmailIngestDeliveryMode = z.infer<
  typeof gmailIngestDeliveryModeSchema
>;

export function parseGmailIngestDeliveryMode(
  value: string | undefined,
): GmailIngestDeliveryMode {
  const parsed = gmailIngestDeliveryModeSchema.safeParse(
    (value ?? "poll").trim().toLowerCase(),
  );
  return parsed.success ? parsed.data : "poll";
}
