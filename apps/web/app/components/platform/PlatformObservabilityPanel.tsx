import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Heading, Switch, Text, toast } from "@repo/ui";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import {
  getPlatformRuntimeSettings,
  updatePlatformRuntimeSettings,
  type PlatformRuntimeSettingsResponse,
} from "../../lib/admin-client";

function formatEnabledLabel(
  enabled: boolean,
  labels: { readonly on: string; readonly off: string },
): string {
  return enabled ? labels.on : labels.off;
}

function ObservabilityToggleRow({
  title,
  description,
  checked,
  effectiveLabel,
  envDefaultLabel,
  disabled,
  onChange,
}: {
  readonly title: string;
  readonly description: string;
  readonly checked: boolean;
  readonly effectiveLabel: string;
  readonly envDefaultLabel: string;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <Heading level={3}>{title}</Heading>
        <Text className="text-muted-foreground text-sm">{description}</Text>
        <Text className="text-muted-foreground text-xs">
          {effectiveLabel} · {envDefaultLabel}
        </Text>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        ariaLabelledBy={title}
      />
    </div>
  );
}

function resolveToggleValue(
  settings: PlatformRuntimeSettingsResponse["settings"],
  key:
    | "aiStepTraceEnabled"
    | "requestPerfTraceEnabled"
    | "seedHookObservabilityEnabled",
  effective: PlatformRuntimeSettingsResponse["effective"],
): boolean {
  const override = settings?.[key];
  if (override === true || override === false) {
    return override;
  }
  return effective[key];
}

export function PlatformObservabilityPanel() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["platform-runtime-settings"],
    queryFn: getPlatformRuntimeSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updatePlatformRuntimeSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["platform-runtime-settings"], data);
      toast.success(t("platform.observability.saveSuccess"));
    },
    onError: () => {
      toast.error(t("platform.observability.saveFailed"));
    },
  });

  if (settingsQuery.isLoading) {
    return <SettingsPanelSkeleton />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return <Alert>{t("platform.observability.loadFailed")}</Alert>;
  }

  const { settings, effective, envDefaults } = settingsQuery.data;
  const pending = updateMutation.isPending;
  const enabledLabels = {
    on: t("platform.observability.enabled"),
    off: t("platform.observability.disabled"),
  };

  const patchToggle = (
    key:
      | "aiStepTraceEnabled"
      | "requestPerfTraceEnabled"
      | "seedHookObservabilityEnabled",
    checked: boolean,
  ) => {
    updateMutation.mutate({ [key]: checked });
  };

  return (
    <div className="space-y-4">
      <ObservabilityToggleRow
        title={t("platform.observability.aiStepTrace.title")}
        description={t("platform.observability.aiStepTrace.description")}
        checked={resolveToggleValue(settings, "aiStepTraceEnabled", effective)}
        effectiveLabel={`${t("platform.observability.effective")}: ${formatEnabledLabel(
          effective.aiStepTraceEnabled,
          enabledLabels,
        )}`}
        envDefaultLabel={`${t("platform.observability.envDefaultLabel")}: ${formatEnabledLabel(
          envDefaults.aiStepTraceEnabled,
          enabledLabels,
        )}`}
        disabled={pending}
        onChange={(checked) => patchToggle("aiStepTraceEnabled", checked)}
      />

      <ObservabilityToggleRow
        title={t("platform.observability.requestPerfTrace.title")}
        description={t("platform.observability.requestPerfTrace.description")}
        checked={resolveToggleValue(
          settings,
          "requestPerfTraceEnabled",
          effective,
        )}
        effectiveLabel={`${t("platform.observability.effective")}: ${formatEnabledLabel(
          effective.requestPerfTraceEnabled,
          enabledLabels,
        )}`}
        envDefaultLabel={`${t("platform.observability.envDefaultLabel")}: ${formatEnabledLabel(
          envDefaults.requestPerfTraceEnabled,
          enabledLabels,
        )}`}
        disabled={pending}
        onChange={(checked) => patchToggle("requestPerfTraceEnabled", checked)}
      />

      <ObservabilityToggleRow
        title={t("platform.observability.seedHookObservability.title")}
        description={t(
          "platform.observability.seedHookObservability.description",
        )}
        checked={resolveToggleValue(
          settings,
          "seedHookObservabilityEnabled",
          effective,
        )}
        effectiveLabel={`${t("platform.observability.effective")}: ${formatEnabledLabel(
          effective.seedHookObservabilityEnabled,
          enabledLabels,
        )}`}
        envDefaultLabel={`${t("platform.observability.envDefaultLabel")}: ${formatEnabledLabel(
          envDefaults.seedHookObservabilityEnabled,
          enabledLabels,
        )}`}
        disabled={pending}
        onChange={(checked) =>
          patchToggle("seedHookObservabilityEnabled", checked)
        }
      />

      <Text className="text-muted-foreground text-sm">
        {t("platform.observability.viewLogsPrefix")}{" "}
        <Link className="text-primary underline" to="/debugger/ai-jobs">
          {t("nav.debuggerAiJobs")}
        </Link>
        {" · "}
        <Link
          className="text-primary underline"
          to="/debugger/request-performance"
        >
          {t("nav.debuggerRequestPerf")}
        </Link>
      </Text>
    </div>
  );
}
