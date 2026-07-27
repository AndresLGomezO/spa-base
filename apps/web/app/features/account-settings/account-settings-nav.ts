type AccountSettingsNavLabelKey =
  | "accountSettings.nav.general"
  | "accountSettings.nav.profile"
  | "accountSettings.nav.tenants"
  | "accountSettings.nav.notifications"
  | "accountSettings.nav.integrations"
  | "accountSettings.nav.email";

interface AccountSettingsNavLeaf {
  readonly id: string;
  readonly labelKey: AccountSettingsNavLabelKey;
  readonly to: string;
}

interface AccountSettingsNavGroup {
  readonly id: string;
  readonly labelKey: AccountSettingsNavLabelKey;
  readonly children: readonly AccountSettingsNavLeaf[];
}

type AccountSettingsNavItem = AccountSettingsNavLeaf | AccountSettingsNavGroup;

export function isAccountSettingsNavGroup(
  item: AccountSettingsNavItem,
): item is AccountSettingsNavGroup {
  return "children" in item;
}

export const ACCOUNT_SETTINGS_BASE = "/account/settings";

export const ACCOUNT_SETTINGS_NAV: readonly AccountSettingsNavItem[] = [
  {
    id: "general",
    labelKey: "accountSettings.nav.general",
    to: `${ACCOUNT_SETTINGS_BASE}/general`,
  },
  {
    id: "profile",
    labelKey: "accountSettings.nav.profile",
    to: `${ACCOUNT_SETTINGS_BASE}/profile`,
  },
  {
    id: "tenants",
    labelKey: "accountSettings.nav.tenants",
    to: `${ACCOUNT_SETTINGS_BASE}/tenants`,
  },
  {
    id: "notifications",
    labelKey: "accountSettings.nav.notifications",
    to: `${ACCOUNT_SETTINGS_BASE}/notifications`,
  },
  {
    id: "integrations",
    labelKey: "accountSettings.nav.integrations",
    children: [
      {
        id: "email",
        labelKey: "accountSettings.nav.email",
        to: `${ACCOUNT_SETTINGS_BASE}/integrations/email`,
      },
    ],
  },
];
