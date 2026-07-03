import { z } from "zod";

export const USER_NOTIFICATIONS_COLLECTION = "__user_notifications" as const;

export const USER_NOTIFICATION_LEVELS = ["info", "error"] as const;
export type UserNotificationLevel = (typeof USER_NOTIFICATION_LEVELS)[number];

export const createUserNotificationInputSchema = z.object({
  userId: z.string().trim().min(1),
  message: z.string().trim().min(1),
  level: z.enum(USER_NOTIFICATION_LEVELS),
  read: z.boolean().optional(),
  hookId: z.string().trim().min(1).optional(),
  hookName: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1).optional(),
  recordId: z.string().trim().min(1).optional(),
  event: z.string().trim().min(1).optional(),
  createdAt: z.string().trim().min(1),
});
export type CreateUserNotificationInput = z.infer<
  typeof createUserNotificationInputSchema
>;

export const userNotificationRecordSchema =
  createUserNotificationInputSchema.extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    read: z.boolean(),
    readAt: z.string().trim().min(1).optional(),
  });
export type UserNotificationRecord = z.infer<
  typeof userNotificationRecordSchema
>;
