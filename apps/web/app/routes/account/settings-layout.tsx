import { NavLink, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Heading, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { isActivePathMatch } from "@repo/ui-builder-core";

import {
  ACCOUNT_SETTINGS_NAV,
  isAccountSettingsNavGroup,
} from "../../features/account-settings/account-settings-nav";

function navItemClassName(active: boolean): string {
  return cn(
    "block rounded-md px-3 py-2 text-sm transition-colors",
    active
      ? "bg-muted text-foreground font-medium"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );
}

export default function AccountSettingsLayout() {
  const { t } = useTranslation("common");
  const location = useLocation();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-0">
      <aside className="border-border bg-background w-56 shrink-0 border-r px-3 py-6 sm:w-60">
        <Heading level={1} className="mb-4 px-3 text-xl">
          {t("accountSettings.title")}
        </Heading>
        <nav aria-label={t("accountSettings.title")} className="space-y-4">
          {ACCOUNT_SETTINGS_NAV.map((item) => {
            if (isAccountSettingsNavGroup(item)) {
              return (
                <div key={item.id} className="space-y-1">
                  <Text
                    variant="muted"
                    className="px-3 text-xs font-medium tracking-wide uppercase"
                  >
                    {t(item.labelKey)}
                  </Text>
                  <ul className="space-y-0.5">
                    {item.children.map((child) => {
                      const active = isActivePathMatch(
                        location.pathname,
                        child.to,
                      );
                      return (
                        <li key={child.id}>
                          <NavLink
                            to={child.to}
                            className={navItemClassName(active)}
                          >
                            {t(child.labelKey)}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            }

            const active = isActivePathMatch(location.pathname, item.to);
            return (
              <NavLink
                key={item.id}
                to={item.to}
                className={navItemClassName(active)}
              >
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto px-6 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
