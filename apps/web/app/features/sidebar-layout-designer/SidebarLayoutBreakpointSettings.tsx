import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";
import { FieldLabel } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useTranslation } from "react-i18next";

import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";

const BREAKPOINTS: readonly ResponsiveGridBreakpoint[] = [
  "base",
  "sm",
  "md",
  "lg",
  "xl",
];

export function SidebarLayoutBreakpointSettings() {
  const { t } = useTranslation("common");
  const { settings, setSettings, canSave } = useSidebarLayoutDesigner();

  const autoCollapseValue =
    settings.autoCollapseBreakpoint == null
      ? "none"
      : settings.autoCollapseBreakpoint;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[10rem] flex-col gap-1 text-sm">
        <FieldLabel htmlFor="sidebar-auto-collapse-breakpoint">
          {t("sidebarLayoutDesigner.autoCollapseBreakpoint")}
        </FieldLabel>
        <Select
          id="sidebar-auto-collapse-breakpoint"
          className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
          value={autoCollapseValue}
          disabled={!canSave}
          onChange={(event) => {
            const value = event.target.value;
            setSettings({
              ...settings,
              autoCollapseBreakpoint:
                value === "none" ? null : (value as ResponsiveGridBreakpoint),
            });
          }}
        >
          <option value="none">{t("sidebarLayoutDesigner.none")}</option>
          {BREAKPOINTS.map((breakpoint) => (
            <option key={breakpoint} value={breakpoint}>
              {breakpoint}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
