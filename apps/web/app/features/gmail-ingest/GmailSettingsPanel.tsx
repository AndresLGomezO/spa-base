import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Heading, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import {
  disconnectGmail,
  getGmailStatus,
  listEmailMatchBindings,
  startGmailConnect,
  startGmailSync,
  deleteEmailMatchBinding,
} from "../../lib/api-client";

export function GmailSettingsPanel() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const gmailResult = searchParams.get("gmail");

  const statusQuery = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const bindingsQuery = useQuery({
    queryKey: ["gmail-bindings"],
    queryFn: () => listEmailMatchBindings(),
  });

  const connectMutation = useMutation({
    mutationFn: startGmailConnect,
    onSuccess: (data) => {
      window.location.href = data.authorizeUrl;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      toast.success(t("platform.email.disconnected"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncMutation = useMutation({
    mutationFn: startGmailSync,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      toast.success(t("platform.email.syncStarted", { jobId: data.jobId }));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteBindingMutation = useMutation({
    mutationFn: deleteEmailMatchBinding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gmail-bindings"] });
      toast.success(t("platform.email.bindingDeleted"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const status = statusQuery.data;
  const bindings = bindingsQuery.data?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Heading level={1}>{t("platform.email.title")}</Heading>
        <Text>{t("platform.email.description")}</Text>
        <Text className="text-muted-foreground text-sm">
          {t("platform.email.privacy")}
        </Text>
      </div>

      {gmailResult === "connected" ? (
        <Text className="text-sm">
          {t("platform.email.oauthResult.connected")}
        </Text>
      ) : null}
      {gmailResult === "error" ? (
        <Text className="text-sm">{t("platform.email.oauthResult.error")}</Text>
      ) : null}
      {gmailResult === "reauth_required" ? (
        <Text className="text-sm">
          {t("platform.email.oauthResult.reauth_required")}
        </Text>
      ) : null}

      <section className="space-y-3">
        <Heading level={2}>{t("platform.email.connection")}</Heading>
        {statusQuery.isLoading ? (
          <Text>{t("platform.email.loading")}</Text>
        ) : (
          <div className="space-y-2">
            <Text>
              {status?.connected
                ? t("platform.email.connectedAs", {
                    email: status.emailAddress ?? "",
                  })
                : t("platform.email.notConnected")}
            </Text>
            {status?.ingestWatermarkAt ? (
              <Text className="text-muted-foreground text-sm">
                {t("platform.email.lastCatchUp", {
                  at: status.ingestWatermarkAt,
                })}
              </Text>
            ) : status?.connected ? (
              <Text className="text-muted-foreground text-sm">
                {t("platform.email.noCatchUpYet")}
              </Text>
            ) : null}
            {status?.lastError ? (
              <Text className="text-destructive text-sm">
                {status.lastError}
              </Text>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!status?.connected ? (
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  {t("platform.email.connect")}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                  >
                    {t("platform.email.syncNow")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {t("platform.email.disconnect")}
                  </Button>
                </>
              )}
            </div>
            {status?.connected ? (
              <Text className="text-muted-foreground text-sm">
                {t("platform.email.syncNowHint")}
              </Text>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <Heading level={2}>{t("platform.email.bindings")}</Heading>
        <Text className="text-muted-foreground text-sm">
          {t("platform.email.bindingsHint")}
        </Text>
        {bindings.length === 0 ? (
          <Text>{t("platform.email.noBindings")}</Text>
        ) : (
          <ul className="space-y-2">
            {bindings.map((binding) => (
              <li
                key={binding.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b py-2"
              >
                <div className="space-y-1">
                  <Text className="font-medium">
                    {binding.entityName} / {binding.recordId}
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    {binding.fromAddresses.join(", ") ||
                      t("platform.email.noSenders")}
                    {binding.useAi ? ` · ${t("platform.email.aiEnabled")}` : ""}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteBindingMutation.mutate(binding.id)}
                  >
                    {t("platform.email.deleteBinding")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
