import { useState } from "react";
import { useTranslation } from "react-i18next";

import { IconButton, Popover } from "@repo/ui";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function LoginSettings() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="top-start"
        title={t("login.settingsTitle")}
        trigger={
          <IconButton label={t("login.settingsTitle")}>
            <SettingsIcon />
          </IconButton>
        }
      >
        <LanguageSwitcher fullWidth />
        <ThemeToggle fullWidth />
      </Popover>
    </div>
  );
}
