import {
  uiLayoutDocumentSchema,
  type ResponsiveGridBreakpoint,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

export const TENANT_SIDEBAR_LAYOUTS_COLLECTION = "tenant_sidebar_layouts";

export const DEFAULT_SIDEBAR_HAMBURGER_BREAKPOINT =
  "md" as const satisfies ResponsiveGridBreakpoint;

const responsiveGridBreakpointSchema = z.enum(["base", "sm", "md", "lg", "xl"]);

export const tenantSidebarLayoutSettingsSchema = z
  .object({
    autoCollapseBreakpoint: responsiveGridBreakpointSchema
      .nullable()
      .optional(),
    hamburgerBreakpoint: responsiveGridBreakpointSchema.default(
      DEFAULT_SIDEBAR_HAMBURGER_BREAKPOINT,
    ),
  })
  .strict();

export type TenantSidebarLayoutSettings = {
  readonly autoCollapseBreakpoint?: ResponsiveGridBreakpoint | null;
  readonly hamburgerBreakpoint: ResponsiveGridBreakpoint;
};

export interface TenantSidebarLayoutRecord {
  readonly tenantId: string;
  readonly sidebarLayout: UiLayoutDocument;
  readonly headerLayout: UiLayoutDocument;
  readonly footerLayout: UiLayoutDocument;
  readonly settings: TenantSidebarLayoutSettings;
  readonly updatedAt: string;
}

export const tenantSidebarLayoutRecordSchema = z
  .object({
    tenantId: z.string().trim().min(1),
    sidebarLayout: uiLayoutDocumentSchema,
    headerLayout: uiLayoutDocumentSchema,
    footerLayout: uiLayoutDocumentSchema,
    settings: tenantSidebarLayoutSettingsSchema,
    updatedAt: z.string().datetime(),
  })
  .strict();

export const putTenantSidebarLayoutInputSchema = z
  .object({
    sidebarLayout: uiLayoutDocumentSchema,
    headerLayout: uiLayoutDocumentSchema,
    footerLayout: uiLayoutDocumentSchema,
    settings: tenantSidebarLayoutSettingsSchema,
  })
  .strict();

export type PutTenantSidebarLayoutInput = z.infer<
  typeof putTenantSidebarLayoutInputSchema
>;
