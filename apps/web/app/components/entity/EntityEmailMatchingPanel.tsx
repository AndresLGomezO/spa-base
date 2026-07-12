import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, FieldLabel, Text, Textarea, toast } from "@repo/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  createEmailMatchBinding,
  deleteEmailMatchBinding,
  listEmailMatchBindings,
  patchEmailMatchBinding,
} from "../../lib/api-client";

function splitLines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function EntityEmailMatchingPanel(props: {
  readonly entityName: string;
  readonly recordId: string;
}) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [fromAddresses, setFromAddresses] = useState("");
  const [subjectPatterns, setSubjectPatterns] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");

  const bindingsQuery = useQuery({
    queryKey: ["gmail-bindings", props.entityName, props.recordId],
    queryFn: () =>
      listEmailMatchBindings({
        entityName: props.entityName,
        recordId: props.recordId,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createEmailMatchBinding({
        entityName: props.entityName,
        recordId: props.recordId,
        fromAddresses: splitLines(fromAddresses),
        subjectPatterns: splitLines(subjectPatterns),
        useAi,
        aiInstructions: aiInstructions.trim() || null,
      }),
    onSuccess: async () => {
      setFromAddresses("");
      setSubjectPatterns("");
      setAiInstructions("");
      setUseAi(false);
      await queryClient.invalidateQueries({
        queryKey: ["gmail-bindings", props.entityName, props.recordId],
      });
      toast.success(t("platform.email.bindingSaved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) =>
      patchEmailMatchBinding(input.id, { enabled: input.enabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["gmail-bindings", props.entityName, props.recordId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmailMatchBinding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["gmail-bindings", props.entityName, props.recordId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="space-y-3 border-t pt-4">
      <Text className="font-medium">
        {t("platform.email.recordPanelTitle")}
      </Text>
      <Text className="text-muted-foreground text-sm">
        {t("platform.email.recordPanelHint")}
      </Text>

      <div className="space-y-2">
        <FieldLabel>{t("platform.email.fromAddresses")}</FieldLabel>
        <Textarea
          value={fromAddresses}
          onChange={(event) => setFromAddresses(event.target.value)}
          placeholder="alerts@bank.com, @amex.com"
        />
        <FieldLabel>{t("platform.email.subjectPatterns")}</FieldLabel>
        <Textarea
          value={subjectPatterns}
          onChange={(event) => setSubjectPatterns(event.target.value)}
          placeholder="purchase, /pago\\s+#\\d+/"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useAi}
            onChange={(event) => setUseAi(event.target.checked)}
          />
          {t("platform.email.useAi")}
        </label>
        {useAi ? (
          <>
            <FieldLabel>{t("platform.email.aiInstructions")}</FieldLabel>
            <Textarea
              value={aiInstructions}
              onChange={(event) => setAiInstructions(event.target.value)}
            />
          </>
        ) : null}
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {t("platform.email.saveBinding")}
        </Button>
      </div>

      <ul className="space-y-2">
        {(bindingsQuery.data?.items ?? []).map((binding) => (
          <li
            key={binding.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
          >
            <Text className="text-sm">
              {binding.fromAddresses.join(", ") || "—"} ·{" "}
              {binding.enabled
                ? t("platform.email.enabled")
                : t("platform.email.disabled")}
            </Text>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toggleMutation.mutate({
                    id: binding.id,
                    enabled: !binding.enabled,
                  })
                }
              >
                {binding.enabled
                  ? t("platform.email.disable")
                  : t("platform.email.enable")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteMutation.mutate(binding.id)}
              >
                {t("platform.email.deleteBinding")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
