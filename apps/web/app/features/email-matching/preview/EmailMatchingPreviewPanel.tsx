import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  bindingMatchesMessage,
  extractBodyFields,
  matchesFromAddress,
  matchesTextPattern,
} from "@repo/gmail-ingest/browser";
import { Button, FieldLabel, Text, Textarea } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { ItemListDesignerTreePanelShell } from "../../item-list-designer/ItemListDesignerTreePanelShell";
import {
  designerPreviewPanelBodyFillClassName,
  designerTreePanelShellClassName,
} from "../../ui-builder/designer-tree-workbench-classes";
import {
  bindingDisplayName,
  extractorsToPayload,
  splitLines,
} from "../email-matching-draft";
import { useEmailMatching } from "../email-matching-context";
import { EmailMatchingDefinitionSummaryContent } from "./EmailMatchingDefinitionSummaryContent";
import { EmailMatchingHooksSummaryContent } from "./EmailMatchingHooksSummaryContent";

type PreviewTab = "overview" | "details" | "advanced" | "hooks" | "preview";

const controlClassName =
  "border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm";

export function EmailMatchingPreviewPanel() {
  const { t } = useTranslation("common");
  const { editor } = useEmailMatching();
  const [tab, setTab] = useState<PreviewTab>("overview");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const binding = editor.selectedBinding;
  const draft = editor.draft;

  const matchPreview = useMemo(() => {
    if (!draft) {
      return null;
    }
    const fromAddresses = splitLines(draft.fromAddresses);
    const subjectPatterns = splitLines(draft.subjectPatterns);
    const bodyPatterns = splitLines(draft.bodyPatterns);
    const bindingSlice = {
      fromAddresses,
      subjectPatterns,
      bodyPatterns,
      enabled: draft.enabled,
    };
    const message = {
      from,
      subject,
      snippet: body.slice(0, 200),
      bodyText: body,
    };
    const matches = bindingMatchesMessage(bindingSlice, message);
    const fromHits = fromAddresses.map((address) => ({
      address,
      hit: matchesFromAddress(from, address),
    }));
    const subjectHits = subjectPatterns.map((pattern) => ({
      pattern,
      hit: matchesTextPattern(subject, pattern),
    }));
    const bodyHaystack = `${message.snippet}\n${body}`;
    const bodyHits = bodyPatterns.map((pattern) => ({
      pattern,
      hit: matchesTextPattern(bodyHaystack, pattern),
    }));
    const extractors = (
      extractorsToPayload(draft.bodyFieldExtractors) ?? []
    ).map((extractor) => ({
      field: extractor.field,
      label: extractor.label ?? "",
      pattern: extractor.pattern,
      captureGroup: extractor.captureGroup,
      transform: extractor.transform,
      valueMap: extractor.valueMap,
      literal: extractor.literal,
      sufficientForRelevance: extractor.sufficientForRelevance,
    }));
    const extracted = extractBodyFields(body, extractors);
    return { matches, fromHits, subjectHits, bodyHits, extracted };
  }, [body, draft, from, subject]);

  const collapsedContent = binding ? (
    <Text className="text-muted-foreground break-words text-xs font-medium">
      {bindingDisplayName(binding)}
    </Text>
  ) : null;

  return (
    <ItemListDesignerTreePanelShell
      title={t("emailMatchingWorkbench.preview.panelTitle")}
      expandLabel={t("emailMatchingWorkbench.preview.expandPanel")}
      collapseLabel={t("emailMatchingWorkbench.preview.collapsePanel")}
      expandedClassName={cn(
        designerTreePanelShellClassName,
        "w-[32rem] shrink-0 min-w-0",
      )}
      collapsedClassName={designerTreePanelShellClassName}
      expandedBodyClassName="flex w-full min-w-0 flex-col overflow-x-hidden"
      collapsedContent={collapsedContent}
    >
      {!binding || !draft ? (
        <Text className="text-muted-foreground px-2 py-3 text-sm">
          {t("emailMatchingWorkbench.preview.empty")}
        </Text>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 px-1 py-1">
          <div className="min-w-0 px-1">
            <Text className="text-foreground text-base font-semibold">
              {draft.name.trim() || bindingDisplayName(binding)}
            </Text>
            {draft.description ? (
              <Text className="text-muted-foreground text-xs">
                {draft.description}
              </Text>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-1 px-1">
            {(
              [
                "overview",
                "details",
                "advanced",
                "hooks",
                "preview",
              ] as const
            ).map((entry) => (
              <Button
                key={entry}
                type="button"
                size="sm"
                variant={tab === entry ? "primary" : "outline"}
                onClick={() => setTab(entry)}
              >
                {entry === "preview" || entry === "hooks"
                  ? t(`emailMatchingWorkbench.preview.tabs.${entry}`)
                  : t(`dataHooks.preview.tabs.${entry}`)}
              </Button>
            ))}
          </div>

          <div className={designerPreviewPanelBodyFillClassName}>
            {tab === "overview" || tab === "details" || tab === "advanced" ? (
              <EmailMatchingDefinitionSummaryContent
                binding={binding}
                draft={draft}
                mode={tab}
              />
            ) : null}

            {tab === "hooks" ? (
              <EmailMatchingHooksSummaryContent binding={binding} />
            ) : null}

            {tab === "preview" ? (
              <div className="space-y-4">
                <div className="border-border bg-card space-y-3 rounded-lg border p-3 shadow-sm">
                  <div className="space-y-1">
                    <FieldLabel htmlFor="email-matching-preview-from">
                      {t("emailMatchingWorkbench.preview.live.from")}
                    </FieldLabel>
                    <input
                      id="email-matching-preview-from"
                      className={controlClassName}
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                      placeholder="sender@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="email-matching-preview-subject">
                      {t("emailMatchingWorkbench.preview.live.subject")}
                    </FieldLabel>
                    <input
                      id="email-matching-preview-subject"
                      className={controlClassName}
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="email-matching-preview-body">
                      {t("emailMatchingWorkbench.preview.live.body")}
                    </FieldLabel>
                    <Textarea
                      id="email-matching-preview-body"
                      className={cn(controlClassName, "min-h-[120px]")}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                    />
                  </div>
                </div>

                {matchPreview ? (
                  <div
                    className={cn(
                      "space-y-3 rounded-lg border p-3 text-sm shadow-sm",
                      !draft.enabled
                        ? "border-border bg-muted/30"
                        : matchPreview.matches
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-rose-500/40 bg-rose-500/5",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          !draft.enabled
                            ? "bg-muted text-muted-foreground"
                            : matchPreview.matches
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-rose-500/20 text-rose-700 dark:text-rose-400",
                        )}
                      >
                        <span
                          className={cn(
                            "size-3 rounded-full",
                            !draft.enabled
                              ? "bg-muted-foreground/60"
                              : matchPreview.matches
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                                : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
                          )}
                        />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Text
                          className={cn(
                            "font-semibold",
                            !draft.enabled
                              ? "text-muted-foreground"
                              : matchPreview.matches
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400",
                          )}
                        >
                          {!draft.enabled
                            ? t(
                                "emailMatchingWorkbench.preview.live.statusDisabled",
                              )
                            : matchPreview.matches
                              ? t(
                                  "emailMatchingWorkbench.preview.live.statusMatch",
                                )
                              : t(
                                  "emailMatchingWorkbench.preview.live.statusMiss",
                                )}
                        </Text>
                        <Text className="text-muted-foreground text-xs">
                          {matchPreview.matches
                            ? t("emailMatchingWorkbench.preview.live.matches")
                            : t("emailMatchingWorkbench.preview.live.noMatch")}
                        </Text>
                        {!draft.enabled ? (
                          <Text className="text-muted-foreground text-xs">
                            {t(
                              "emailMatchingWorkbench.preview.live.disabledHint",
                            )}
                          </Text>
                        ) : null}
                        {draft.useAi ? (
                          <Text className="text-muted-foreground text-xs">
                            {t(
                              "emailMatchingWorkbench.preview.live.aiNotSimulated",
                            )}
                          </Text>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
                          !draft.enabled
                            ? "bg-muted text-muted-foreground"
                            : matchPreview.matches
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-400",
                        )}
                      >
                        {!draft.enabled
                          ? t("emailMatchingWorkbench.list.statusDisabled")
                          : matchPreview.matches
                            ? t(
                                "emailMatchingWorkbench.preview.live.badgeMatch",
                              )
                            : t(
                                "emailMatchingWorkbench.preview.live.badgeMiss",
                              )}
                      </span>
                    </div>

                    <RuleHits
                      title={t("platform.email.fromAddresses")}
                      items={matchPreview.fromHits.map((item) => ({
                        label: item.address,
                        hit: item.hit,
                      }))}
                    />
                    <RuleHits
                      title={t("platform.email.subjectPatterns")}
                      items={matchPreview.subjectHits.map((item) => ({
                        label: item.pattern,
                        hit: item.hit,
                      }))}
                    />
                    <RuleHits
                      title={t("platform.email.bodyPatterns")}
                      items={matchPreview.bodyHits.map((item) => ({
                        label: item.pattern,
                        hit: item.hit,
                      }))}
                    />

                    <div className="space-y-1">
                      <Text className="font-medium">
                        {t("emailMatchingWorkbench.preview.live.extracted")}
                      </Text>
                      {Object.keys(matchPreview.extracted.fields).length ===
                      0 ? (
                        <Text className="text-muted-foreground text-xs">
                          {t(
                            "emailMatchingWorkbench.preview.live.noExtracted",
                          )}
                        </Text>
                      ) : (
                        <ul className="space-y-1">
                          {Object.entries(matchPreview.extracted.fields).map(
                            ([field, value]) => (
                              <li
                                key={field}
                                className="text-foreground flex items-start gap-2 text-xs"
                              >
                                <span className="text-primary mt-0.5">✓</span>
                                <span className="min-w-0 break-all">
                                  <span className="font-medium">{field}</span>
                                  {": "}
                                  <span className="text-muted-foreground">
                                    {String(value)}
                                  </span>
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </ItemListDesignerTreePanelShell>
  );
}

function RuleHits({
  title,
  items,
}: {
  readonly title: string;
  readonly items: readonly { readonly label: string; readonly hit: boolean }[];
}) {
  const { t } = useTranslation("common");
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-1">
      <Text className="font-medium">{title}</Text>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-start justify-between gap-2 text-xs"
          >
            <span className="flex min-w-0 items-start gap-2 break-all">
              <span
                aria-hidden
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  item.hit ? "bg-emerald-500" : "bg-rose-500/70",
                )}
              />
              {item.label}
            </span>
            <span
              className={cn(
                "shrink-0 font-medium",
                item.hit
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-700 dark:text-rose-400",
              )}
            >
              {item.hit
                ? t("emailMatchingWorkbench.preview.live.hit")
                : t("emailMatchingWorkbench.preview.live.miss")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
