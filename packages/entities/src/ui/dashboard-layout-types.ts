import {
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

export const TENANT_DASHBOARD_LAYOUTS_COLLECTION = "tenant_dashboard_layouts";

export interface DashboardSectionDefinition {
  readonly id: string;
  readonly name: string;
  readonly layout: UiLayoutDocument;
}

export const dashboardSectionDefinitionSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    layout: uiLayoutDocumentSchema,
  })
  .strict();

export const dashboardSectionsSchema = z.array(
  dashboardSectionDefinitionSchema,
);

export interface TenantDashboardLayoutRecord {
  readonly tenantId: string;
  readonly dashboardSections: readonly DashboardSectionDefinition[];
  readonly dashboardLayout: UiLayoutDocument;
  readonly updatedAt: string;
}

export const tenantDashboardLayoutRecordSchema = z
  .object({
    tenantId: z.string().trim().min(1),
    dashboardSections: dashboardSectionsSchema,
    dashboardLayout: uiLayoutDocumentSchema,
    updatedAt: z.string().datetime(),
  })
  .strict();

export const putTenantDashboardLayoutInputSchema = z
  .object({
    dashboardSections: dashboardSectionsSchema,
    dashboardLayout: uiLayoutDocumentSchema,
  })
  .strict();

export type PutTenantDashboardLayoutInput = z.infer<
  typeof putTenantDashboardLayoutInputSchema
>;
