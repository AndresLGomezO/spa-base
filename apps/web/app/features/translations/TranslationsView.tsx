import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import {
  Alert,
  Button,
  FieldLabel,
  FilterPanel,
  FilterPanelBody,
  Heading,
  Input,
  Modal,
  PageLoader,
  SearchField,
  SearchableMultiSelectDropdown,
  Text,
  Textarea,
  toast,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import {
  createLocalePacksCatalogEnvelope,
  parseLocalePacksCatalogJson,
} from "@repo/locale-packs/browser";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import {
  createLocalePack,
  listLocalePacks,
  reconcileLocalePacksRequest,
  importLocalePacksCatalog,
  updateLocalePack,
  type LocalePackRecord,
} from "../../lib/api-client";
import { localePacksQueryKey } from "../../i18n/TenantLocalePacksProvider";
import { LOCALE_LABELS } from "../../i18n/constants";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import {
  collectSegmentOptions,
  keyMatchesSegmentPath,
  keyWithoutRootPrefix,
  pruneSegmentPath,
  setSegmentPathAtDepth,
  splitKeySegments,
  visibleSegmentFilterDepths,
} from "./key-path-filters";

type CompletenessFilter = "all" | "missing" | "complete";
type SortMode = "key" | "prefix" | "completeness";

type LocaleDiffSummary = {
  readonly toAdd: readonly string[];
  readonly toRemove: readonly string[];
  readonly toKeep: readonly string[];
};

function groupPrefix(key: string): string {
  return splitKeySegments(key)[0] ?? key;
}

function localeDisplayName(locale: string): string {
  if (locale in LOCALE_LABELS) {
    return LOCALE_LABELS[locale as keyof typeof LOCALE_LABELS];
  }
  try {
    const name = new Intl.DisplayNames(undefined, { type: "language" }).of(
      locale,
    );
    return name ?? locale;
  } catch {
    return locale;
  }
}

function isFilled(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function LocaleStatusChip({
  locale,
  filled,
  isDefault,
  absent,
}: {
  readonly locale: string;
  readonly filled: boolean;
  readonly isDefault?: boolean;
  readonly absent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase",
        absent
          ? "bg-muted text-muted-foreground"
          : filled
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "bg-destructive/15 text-destructive",
        isDefault && "ring-1 ring-border",
      )}
      title={localeDisplayName(locale)}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          absent
            ? "bg-muted-foreground"
            : filled
              ? "bg-emerald-500"
              : "bg-destructive",
        )}
      />
      {locale}
    </span>
  );
}

export function TranslationsView({
  canUpdate,
}: {
  readonly canUpdate: boolean;
}) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();

  const packsQuery = useQuery({
    queryKey: localePacksQueryKey,
    queryFn: async () => listLocalePacks(),
  });

  const packs = useMemo(
    () => packsQuery.data?.items ?? [],
    [packsQuery.data?.items],
  );
  const defaultLocale = packsQuery.data?.defaultLocale?.trim() || "en";

  const packByLocale = useMemo(() => {
    const map = new Map<string, LocalePackRecord>();
    for (const pack of packs) map.set(pack.locale, pack);
    return map;
  }, [packs]);

  const allLocales = useMemo(() => {
    const set = new Set<string>([defaultLocale, ...packs.map((p) => p.locale)]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [packs, defaultLocale]);

  const mirrorLocales = useMemo(
    () => allLocales.filter((locale) => locale !== defaultLocale),
    [allLocales, defaultLocale],
  );

  /** Locales used only for missing/complete list filtering (not detail editors). */
  const [statusLocales, setStatusLocales] = useState<string[]>([]);
  useEffect(() => {
    setStatusLocales((current) => {
      const next = current.filter((locale) => mirrorLocales.includes(locale));
      return next;
    });
  }, [mirrorLocales]);

  const defaultPack = packByLocale.get(defaultLocale) ?? null;
  const keys = useMemo(() => {
    const fromDefault = Object.keys(defaultPack?.messages ?? {});
    if (fromDefault.length > 0) {
      return fromDefault.sort((a, b) => a.localeCompare(b));
    }
    const union = new Set<string>();
    for (const pack of packs) {
      for (const key of Object.keys(pack.messages)) union.add(key);
    }
    return [...union].sort((a, b) => a.localeCompare(b));
  }, [defaultPack, packs]);

  const [search, setSearch] = useState("");
  const [completeness, setCompleteness] = useState<CompletenessFilter>("all");
  const [segmentPath, setSegmentPath] = useState<string[][]>([]);
  const [sort, setSort] = useState<SortMode>("key");
  const [onlyRecentDiff, setOnlyRecentDiff] = useState(false);
  const [lastDiff, setLastDiff] = useState<Readonly<
    Record<string, LocaleDiffSummary>
  > | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [importText, setImportText] = useState("");
  const [addLocaleOpen, setAddLocaleOpen] = useState(false);
  const [newLocaleCode, setNewLocaleCode] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSegmentPath((current) => pruneSegmentPath(keys, current));
  }, [keys]);

  const visibleSegmentDepths = useMemo(
    () => visibleSegmentFilterDepths(segmentPath),
    [segmentPath],
  );

  const recentDiffKeys = useMemo(() => {
    if (!lastDiff) return new Set<string>();
    const set = new Set<string>();
    for (const diff of Object.values(lastDiff)) {
      for (const key of diff.toAdd) set.add(key);
      for (const key of diff.toRemove) set.add(key);
    }
    return set;
  }, [lastDiff]);

  const rowStats = useMemo(() => {
    return keys.map((key) => {
      const defaultValue = defaultPack?.messages[key] ?? "";
      const statusScope =
        statusLocales.length > 0 ? statusLocales : mirrorLocales;
      let filledCount = 0;
      let total = 0;
      for (const locale of statusScope) {
        total += 1;
        if (isFilled(packByLocale.get(locale)?.messages[key])) filledCount += 1;
      }
      return {
        key,
        prefix: groupPrefix(key),
        displayKey: keyWithoutRootPrefix(key),
        defaultValue,
        filledCount,
        total,
        complete: total === 0 || filledCount === total,
        missing: total > 0 && filledCount < total,
      };
    });
  }, [keys, defaultPack, statusLocales, mirrorLocales, packByLocale]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = rowStats;
    if (q) {
      rows = rows.filter(
        (row) =>
          row.key.toLowerCase().includes(q) ||
          row.displayKey.toLowerCase().includes(q) ||
          row.defaultValue.toLowerCase().includes(q),
      );
    }
    if (segmentPath.some((level) => level.length > 0)) {
      rows = rows.filter((row) => keyMatchesSegmentPath(row.key, segmentPath));
    }
    if (completeness === "missing") {
      rows = rows.filter((row) => row.missing);
    } else if (completeness === "complete") {
      rows = rows.filter((row) => row.complete);
    }
    if (onlyRecentDiff && lastDiff) {
      rows = rows.filter((row) => recentDiffKeys.has(row.key));
    }

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sort === "prefix") {
        const byPrefix = a.prefix.localeCompare(b.prefix);
        return byPrefix !== 0 ? byPrefix : a.key.localeCompare(b.key);
      }
      if (sort === "completeness") {
        const aScore = a.total === 0 ? 1 : a.filledCount / a.total;
        const bScore = b.total === 0 ? 1 : b.filledCount / b.total;
        if (aScore !== bScore) return aScore - bScore;
      }
      return a.key.localeCompare(b.key);
    });
    return sorted;
  }, [
    rowStats,
    search,
    segmentPath,
    completeness,
    onlyRecentDiff,
    lastDiff,
    recentDiffKeys,
    sort,
  ]);

  const selectKey = useCallback(
    (key: string) => {
      setSelectedKey(key);
      const next: Record<string, string> = {};
      for (const locale of mirrorLocales) {
        next[locale] = packByLocale.get(locale)?.messages[key] ?? "";
      }
      setDrafts(next);
    },
    [mirrorLocales, packByLocale],
  );

  useEffect(() => {
    if (selectedKey) selectKey(selectedKey);
    // Re-hydrate drafts when packs / available mirrors change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally sync on pack/mirror changes
  }, [packs, mirrorLocales, defaultLocale]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: localePacksQueryKey });
  }, [queryClient]);

  const reconcileMutation = useMutation({
    mutationFn: async (ensureLocales?: readonly string[]) =>
      reconcileLocalePacksRequest({ ensureLocales }),
    onSuccess: async (result) => {
      setLastDiff(result.perLocale);
      await invalidate();
      toast.success(
        t("translations.reconcileSuccess", {
          added: result.counts.added,
          removed: result.counts.removed,
          kept: result.counts.kept,
          keys: result.harvestedKeyCount,
        }),
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("translations.reconcileFailed"),
      );
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedKey) throw new Error("No key selected");
      const updates: Promise<LocalePackRecord>[] = [];
      for (const [locale, value] of Object.entries(drafts)) {
        const pack = packByLocale.get(locale);
        if (!pack) continue;
        const current = pack.messages[selectedKey] ?? "";
        if (current === value) continue;
        updates.push(
          updateLocalePack(pack.id, {
            messages: { ...pack.messages, [selectedKey]: value },
          }),
        );
      }
      if (updates.length === 0) return [];
      return Promise.all(updates);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(t("translations.saved"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("translations.saveFailed"),
      );
    },
  });

  const addLocaleMutation = useMutation({
    mutationFn: async (locale: string) => {
      await createLocalePack({ locale, messages: {} });
      return reconcileLocalePacksRequest({ ensureLocales: [locale] });
    },
    onSuccess: async (result) => {
      setLastDiff(result.perLocale);
      setAddLocaleOpen(false);
      setNewLocaleCode("");
      await invalidate();
      toast.success(t("translations.addLocaleSuccess"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("translations.addLocaleFailed"),
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: async (text: string) => {
      const parsed = parseLocalePacksCatalogJson(text);
      if (!parsed.ok) {
        throw new Error(parsed.errors.map((e) => e.message).join("; "));
      }
      return importLocalePacksCatalog(parsed.data);
    },
    onSuccess: async () => {
      await invalidate();
      setImportText("");
      toast.success(t("translations.importSuccess"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("translations.importFailed"),
      );
    },
  });

  const exportCatalog = useCallback(() => {
    if (packs.length === 0) return;
    const envelope = createLocalePacksCatalogEnvelope(
      packs as LocalePackRecord[],
    );
    const blob = new Blob([`${JSON.stringify(envelope, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "locale-packs-catalog.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [packs]);

  const segmentFilterDepths = useMemo(() => {
    return visibleSegmentDepths.filter((depth) => {
      const options = collectSegmentOptions(keys, segmentPath, depth);
      return depth === 0 || options.length > 0;
    });
  }, [visibleSegmentDepths, keys, segmentPath]);

  const clearSegmentAndOtherFilters = useCallback(() => {
    setCompleteness("all");
    setStatusLocales([]);
    setSegmentPath([]);
    setOnlyRecentDiff(false);
  }, []);

  const mirrorLocaleOptions = useMemo(
    () =>
      mirrorLocales.map((locale) => ({
        value: locale,
        label: `${locale} · ${localeDisplayName(locale)}`,
      })),
    [mirrorLocales],
  );

  const multiselectLabels = {
    placeholder: t("translations.multiselectPlaceholder"),
    selectedCountLabel: (count: number) =>
      t("translations.multiselectSelectedCount", { count }),
    searchPlaceholder: t("translations.multiselectSearchPlaceholder"),
    noResultsLabel: t("translations.multiselectNoResults"),
    removeAriaLabel: (label: string) =>
      t("translations.removeBadge", { label }),
  };

  if (packsQuery.isLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (packsQuery.isError) {
    return (
      <div className="space-y-3 p-macro">
        <Alert>{t("translations.loadFailed")}</Alert>
      </div>
    );
  }

  const selectedDefault = selectedKey
    ? (defaultPack?.messages[selectedKey] ?? "")
    : "";

  const dirty =
    selectedKey != null &&
    Object.entries(drafts).some(([locale, value]) => {
      const pack = packByLocale.get(locale);
      return (pack?.messages[selectedKey] ?? "") !== value;
    });

  const newLocaleNormalized = newLocaleCode.trim().toLowerCase();
  const newLocaleValid = /^[a-z]{2}(-[a-z0-9]+)?$/i.test(newLocaleNormalized);
  const newLocaleExists = allLocales.includes(newLocaleNormalized);

  const filterBody = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyRecentDiff}
            disabled={!lastDiff}
            onChange={(event) => setOnlyRecentDiff(event.target.checked)}
          />
          {t("translations.filterRecentDiff")}
        </label>
      </div>
      {segmentFilterDepths.map((depth) => {
        const options = collectSegmentOptions(keys, segmentPath, depth).map(
          (segment) => ({ value: segment, label: segment }),
        );
        const selected = segmentPath[depth] ?? [];
        const label =
          depth === 0
            ? t("translations.filterPrefix")
            : t("translations.filterSegmentLevel", { level: depth + 1 });
        return (
          <div
            key={`segment-depth-${depth}`}
            className="space-y-2 sm:col-span-2"
          >
            <Text className="text-muted-foreground text-xs font-medium">
              {label}
            </Text>
            <SearchableMultiSelectDropdown
              options={options}
              selected={selected}
              onChange={(next) =>
                setSegmentPath(
                  setSegmentPathAtDepth(keys, segmentPath, depth, next),
                )
              }
              ariaLabel={label}
              {...multiselectLabels}
            />
          </div>
        );
      })}
    </div>
  );

  const segmentBadges = segmentPath.flatMap((selected, depth) =>
    selected.map((segment) => ({
      id: `seg:${depth}:${segment}`,
      label:
        depth === 0
          ? segment
          : t("translations.filterSegmentBadge", {
              level: depth + 1,
              segment,
            }),
      onRemove: () =>
        setSegmentPath(
          setSegmentPathAtDepth(
            keys,
            segmentPath,
            depth,
            selected.filter((item) => item !== segment),
          ),
        ),
    })),
  );

  const statusLocaleBadges = statusLocales.map((locale) => ({
    id: `status-locale:${locale}`,
    label: t("translations.filterStatusLocaleBadge", { locale }),
    onRemove: () =>
      setStatusLocales((current) => current.filter((item) => item !== locale)),
  }));

  const scopeSection = (
    <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={t("translations.filterPlaceholder")}
        ariaLabel={t("translations.filter")}
        clearAriaLabel={t("translations.searchClear")}
        className="max-w-none min-w-0 w-full"
      />
      <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("translations.filterStatusLocales")}
          </Text>
          <SearchableMultiSelectDropdown
            options={mirrorLocaleOptions}
            selected={statusLocales}
            onChange={(selected) => setStatusLocales([...selected])}
            ariaLabel={t("translations.filterStatusLocales")}
            {...multiselectLabels}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("translations.filterCompleteness")}
          </Text>
          <Select
            selectSize="sm"
            className="w-full"
            value={completeness}
            onChange={(event) =>
              setCompleteness(event.target.value as CompletenessFilter)
            }
            aria-label={t("translations.filterCompleteness")}
          >
            <option value="all">{t("translations.filterAll")}</option>
            <option value="missing">{t("translations.filterMissing")}</option>
            <option value="complete">{t("translations.filterComplete")}</option>
          </Select>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-nowrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <FilterPanel
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeBadges={[
              ...statusLocaleBadges,
              ...(completeness !== "all"
                ? [
                    {
                      id: "completeness",
                      label: t(
                        completeness === "missing"
                          ? "translations.filterMissing"
                          : "translations.filterComplete",
                      ),
                      onRemove: () => setCompleteness("all"),
                    },
                  ]
                : []),
              ...segmentBadges,
              ...(onlyRecentDiff
                ? [
                    {
                      id: "recent",
                      label: t("translations.filterRecentDiff"),
                      onRemove: () => setOnlyRecentDiff(false),
                    },
                  ]
                : []),
            ]}
            triggerLabel={t("translations.filter")}
            clearAllLabel={t("translations.clearFilters")}
            removeAriaLabel={(label) =>
              t("translations.removeBadge", { label })
            }
            onClearAll={clearSegmentAndOtherFilters}
            badgesBelowToolbar
            renderBody={false}
            compact
            toolbarFillWidth
            manageDismiss={false}
            sibling={
              <div className="w-auto shrink-0 py-0.5">
                <label className="inline-flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {t("translations.sort")}
                  </span>
                  <Select
                    selectSize="sm"
                    className="w-auto min-w-[9rem]"
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as SortMode)
                    }
                    aria-label={t("translations.sort")}
                  >
                    <option value="key">{t("translations.sortKey")}</option>
                    <option value="prefix">
                      {t("translations.sortPrefix")}
                    </option>
                    <option value="completeness">
                      {t("translations.sortCompleteness")}
                    </option>
                  </Select>
                </label>
              </div>
            }
          >
            {filterBody}
          </FilterPanel>
        </div>
      </div>
      <FilterPanelBody
        open={filtersOpen}
        onClearAll={clearSegmentAndOtherFilters}
        clearAllLabel={t("translations.clearFilters")}
        disabled={
          completeness === "all" &&
          statusLocales.length === 0 &&
          segmentPath.every((level) => level.length === 0) &&
          !onlyRecentDiff
        }
      >
        {filterBody}
      </FilterPanelBody>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-macro">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Heading level={1}>{t("translations.title")}</Heading>
          <Text className="text-muted-foreground text-sm">
            {t("translations.description")}
          </Text>
          <Text className="text-muted-foreground text-xs">
            {t("translations.defaultLocaleLabel", {
              locale: `${defaultLocale} · ${localeDisplayName(defaultLocale)}`,
            })}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canUpdate || reconcileMutation.isPending}
            onClick={() =>
              reconcileMutation.mutate(
                mirrorLocales.length > 0 ? mirrorLocales : undefined,
              )
            }
          >
            <RefreshCw
              aria-hidden
              className={cn(
                "mr-2 size-3.5",
                reconcileMutation.isPending && "animate-spin",
              )}
            />
            {t("translations.reconcile")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canUpdate}
            onClick={() => setAddLocaleOpen(true)}
          >
            {t("translations.addLocale")}
          </Button>
          <Button type="button" variant="outline" onClick={exportCatalog}>
            {t("translations.export")}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <ItemListDesignerTreePanelShell
          title={t("translations.keysTitle")}
          expandLabel={t("translations.expandPanel")}
          collapseLabel={t("translations.collapsePanel")}
          expandedClassName={cn(
            designerTreePanelShellClassName,
            "w-full max-w-[420px]",
          )}
          collapsedClassName={designerTreePanelShellClassName}
          expandedBodyClassName="w-full min-w-0 overflow-x-hidden"
          collapsedContent={
            <button
              type="button"
              className="text-muted-foreground px-2 py-1.5 text-xs"
              onClick={() => reconcileMutation.mutate(undefined)}
              disabled={!canUpdate || reconcileMutation.isPending}
            >
              <RefreshCw
                aria-hidden
                className={cn(
                  "size-3.5",
                  reconcileMutation.isPending && "animate-spin",
                )}
              />
            </button>
          }
          scopeSection={scopeSection}
        >
          <div className="relative flex w-full min-w-0 flex-col gap-2 py-1">
            {filteredRows.length === 0 ? (
              <Text className="text-muted-foreground px-2 py-3 text-sm">
                {keys.length === 0
                  ? t("translations.empty")
                  : t("translations.emptyFiltered")}
              </Text>
            ) : (
              <ul className="space-y-1.5 px-1" role="tree">
                {filteredRows.map((row) => {
                  const selected = selectedKey === row.key;
                  return (
                    <li key={row.key}>
                      <button
                        type="button"
                        role="treeitem"
                        aria-selected={selected}
                        className={cn(
                          "hover:bg-muted/70 flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-md border-l-2 px-2 py-1.5 text-left transition-colors",
                          selected
                            ? "bg-muted border-primary"
                            : "border-transparent",
                          row.missing
                            ? "border-l-destructive/60"
                            : "border-l-emerald-500/60",
                        )}
                        onClick={() => selectKey(row.key)}
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Text className="text-muted-foreground text-[10px] uppercase">
                            {row.prefix}
                          </Text>
                          {mirrorLocales.map((locale) => (
                            <LocaleStatusChip
                              key={locale}
                              locale={locale}
                              absent={!packByLocale.has(locale)}
                              filled={isFilled(
                                packByLocale.get(locale)?.messages[row.key],
                              )}
                            />
                          ))}
                        </div>
                        <Text className="truncate font-mono text-xs">
                          {row.displayKey}
                        </Text>
                        {row.defaultValue ? (
                          <Text className="text-muted-foreground line-clamp-1 text-[11px]">
                            {row.defaultValue}
                          </Text>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ItemListDesignerTreePanelShell>

        <div className="border-border flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border p-4 shadow-sm">
          {selectedKey ? (
            <>
              <div className="space-y-1">
                <Text className="font-mono text-xs">{selectedKey}</Text>
                <div className="flex flex-wrap gap-1.5">
                  <LocaleStatusChip
                    locale={defaultLocale}
                    filled={isFilled(selectedDefault)}
                    isDefault
                  />
                  {mirrorLocales.map((locale) => (
                    <LocaleStatusChip
                      key={locale}
                      locale={locale}
                      absent={!packByLocale.has(locale)}
                      filled={isFilled(drafts[locale])}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <FieldLabel>
                  {t("translations.defaultValue", {
                    locale: defaultLocale,
                  })}
                </FieldLabel>
                <Textarea value={selectedDefault} readOnly rows={3} />
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {mirrorLocales.map((locale) => (
                  <div key={locale} className="space-y-1">
                    <FieldLabel>
                      {t("translations.translationFor", {
                        locale: `${locale} · ${localeDisplayName(locale)}`,
                      })}
                    </FieldLabel>
                    <Textarea
                      value={drafts[locale] ?? ""}
                      rows={3}
                      disabled={!canUpdate || !packByLocale.has(locale)}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [locale]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                {mirrorLocales.length === 0 ? (
                  <Text className="text-muted-foreground text-sm">
                    {t("translations.noMirrorLocales")}
                  </Text>
                ) : null}
              </div>
              <div>
                <Button
                  type="button"
                  disabled={!canUpdate || !dirty || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {t("translations.save")}
                </Button>
              </div>
            </>
          ) : (
            <Text className="text-muted-foreground text-sm">
              {t("translations.selectKey")}
            </Text>
          )}

          <div className="border-border mt-auto space-y-2 border-t pt-3">
            <FieldLabel htmlFor="translations-import">
              {t("translations.importLabel")}
            </FieldLabel>
            <Textarea
              id="translations-import"
              value={importText}
              rows={4}
              disabled={!canUpdate}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={t("translations.importPlaceholder")}
            />
            <Button
              type="button"
              variant="outline"
              disabled={
                !canUpdate || !importText.trim() || importMutation.isPending
              }
              onClick={() => importMutation.mutate(importText)}
            >
              {t("translations.import")}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={addLocaleOpen}
        onClose={() => setAddLocaleOpen(false)}
        title={t("translations.addLocaleTitle")}
      >
        <div className="space-y-3 p-1">
          <Text className="text-muted-foreground text-sm">
            {t("translations.addLocaleDescription")}
          </Text>
          <div className="space-y-1">
            <FieldLabel htmlFor="new-locale-code">
              {t("translations.addLocaleCode")}
            </FieldLabel>
            <Input
              id="new-locale-code"
              value={newLocaleCode}
              onChange={(event) => setNewLocaleCode(event.target.value)}
              placeholder="es"
            />
            {newLocaleNormalized ? (
              <Text className="text-muted-foreground text-xs">
                {localeDisplayName(newLocaleNormalized)}
              </Text>
            ) : null}
            {newLocaleExists ? (
              <Alert>{t("translations.addLocaleExists")}</Alert>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddLocaleOpen(false)}
            >
              {t("translations.cancel")}
            </Button>
            <Button
              type="button"
              disabled={
                !canUpdate ||
                !newLocaleValid ||
                newLocaleExists ||
                addLocaleMutation.isPending
              }
              onClick={() => addLocaleMutation.mutate(newLocaleNormalized)}
            >
              {t("translations.addLocaleConfirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
