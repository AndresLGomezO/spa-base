import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, Text, toast } from "@repo/ui";

import {
  clearLocalPushRegistration,
  getPushPermissionState,
  isPushConfigured,
  requestPushPermissionAndRegisterToken,
  resolvePushRegistrationState,
  type PushPermissionState,
  type PushRegistrationState,
} from "../../lib/firebase-messaging";

function statusLabel(
  state: PushRegistrationState | "loading",
  permission: PushPermissionState,
  configured: boolean,
  labels: {
    loading: string;
    on: string;
    off: string;
    denied: string;
    unsupported: string;
    missingVapid: string;
  },
): string {
  if (!configured) {
    return labels.missingVapid;
  }
  if (state === "loading") {
    return labels.loading;
  }
  if (state === "denied" || permission === "denied") {
    return labels.denied;
  }
  if (state === "unsupported") {
    return labels.unsupported;
  }
  if (state === "on") {
    return labels.on;
  }
  return labels.off;
}

export function BrowserPushNotificationsSetting() {
  const { t } = useTranslation("common");
  const labelId = useId();
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [configured, setConfigured] = useState(true);
  const [state, setState] = useState<PushRegistrationState | "loading">(
    "loading",
  );
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setConfigured(isPushConfigured());
    setPermission(getPushPermissionState());
    const next = await resolvePushRegistrationState();
    setPermission(getPushPermissionState());
    setState(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onToggle = useCallback(
    async (checked: boolean) => {
      setBusy(true);
      try {
        if (checked) {
          const result = await requestPushPermissionAndRegisterToken();
          setPermission(getPushPermissionState());

          if (result.status === "registered") {
            setState("on");
            toast.success(t("accountSettings.general.pushEnabledSuccess"));
            return;
          }
          if (result.status === "denied") {
            setState("denied");
            toast.info(t("accountSettings.general.pushDeniedHint"));
            return;
          }
          if (result.status === "unsupported") {
            if (result.reason === "no_service_worker") {
              // Transient until SW activates — keep toggle retryable.
              setState("off");
              toast.info(t("accountSettings.general.pushUnsupportedNoSw"));
              return;
            }
            setState("unsupported");
            toast.info(t("accountSettings.general.pushUnsupported"));
            return;
          }
          toast.error(result.message);
          await refresh();
          return;
        }

        const result = await clearLocalPushRegistration();
        if (result.status === "error") {
          toast.error(result.message);
          await refresh();
          return;
        }
        setState("off");
        toast.success(t("accountSettings.general.pushDisabledSuccess"));
      } finally {
        setBusy(false);
      }
    },
    [refresh, t],
  );

  const checked = state === "on";
  const switchDisabled =
    busy ||
    state === "loading" ||
    !configured ||
    state === "unsupported" ||
    state === "denied" ||
    permission === "denied";

  const showDeniedHint = state === "denied" || permission === "denied";

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <Text id={labelId} className="font-medium">
          {t("accountSettings.general.pushLabel")}
        </Text>
        <Text variant="caption">{t("accountSettings.general.pushHint")}</Text>
        <Text variant="caption" className="text-muted-foreground">
          {statusLabel(state, permission, configured, {
            loading: t("accountSettings.general.pushStatusLoading"),
            on: t("accountSettings.general.pushStatusRegistered"),
            off: t("accountSettings.general.pushStatusDefault"),
            denied: t("accountSettings.general.pushStatusDenied"),
            unsupported: t("accountSettings.general.pushUnsupported"),
            missingVapid: t(
              "accountSettings.general.pushUnsupportedMissingVapid",
            ),
          })}
        </Text>
        {showDeniedHint ? (
          <Text variant="caption" className="text-muted-foreground">
            {t("accountSettings.general.pushDeniedHint")}
          </Text>
        ) : null}
      </div>
      <div className="flex w-full justify-end sm:w-56">
        <Switch
          checked={checked}
          disabled={switchDisabled}
          ariaLabelledBy={labelId}
          onChange={(next) => {
            void onToggle(next);
          }}
        />
      </div>
    </div>
  );
}
