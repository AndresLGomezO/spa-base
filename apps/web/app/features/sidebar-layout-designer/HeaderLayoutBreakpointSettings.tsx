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

export function HeaderLayoutBreakpointSettings() {
  const { t } = useTranslation("common");
  const { settings, setSettings, canSave } = useSidebarLayoutDesigner();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[10rem] flex-col gap-1 text-sm">
        <FieldLabel htmlFor="header-hamburger-breakpoint">
          {t("sidebarLayoutDesigner.hamburgerBreakpoint")}
        </FieldLabel>
        <Select
          id="header-hamburger-breakpoint"
          className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
          value={settings.hamburgerBreakpoint}
          disabled={!canSave}
          onChange={(event) => {
            setSettings({
              ...settings,
              hamburgerBreakpoint: event.target
                .value as ResponsiveGridBreakpoint,
            });
          }}
        >
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
