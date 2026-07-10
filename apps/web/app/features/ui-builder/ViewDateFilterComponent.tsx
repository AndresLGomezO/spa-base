import type { ViewDateFilterComponentConfig } from "@repo/ui-builder-core";
import {
  interactiveSearchFieldClass,
  stylesIncludeVisualChrome,
} from "@repo/ui-builder-core";
import { ResponsiveStyleTag } from "@repo/ui-builder-renderer";
import { useTranslation } from "react-i18next";

import { cn } from "@repo/theme/utils";

import { useLayoutInteractivePresentation } from "../../components/entity/LayoutInteractiveShell";
import { useOptionalViewFilterPageState } from "./view-filter-page-context";
import { ViewFilterDateField } from "./ViewFilterDateField";
import {
  resolveViewFilterDateLabel,
  viewFilterDateLabelAlignClassName,
  viewFilterDateLabelColorClassName,
} from "./resolve-view-filter-date-label";

interface ViewDateFilterComponentProps {
  readonly config: ViewDateFilterComponentConfig;
}

export function ViewDateFilterComponent({
  config,
}: ViewDateFilterComponentProps) {
  const pageState = useOptionalViewFilterPageState();
  const { t, i18n } = useTranslation("common");
  const presentation = useLayoutInteractivePresentation(config.styles);
  const customChrome = stylesIncludeVisualChrome(config.styles);
  const inputClassName = cn(
    presentation.valueClassName,
    !customChrome && interactiveSearchFieldClass(),
  );

  if (!pageState?.dateFilter.config) {
    return null;
  }

  const dateFilterConfig = pageState.dateFilter.config;
  const resolvedDateLabel = resolveViewFilterDateLabel(
    config,
    t("viewFilterComponents.dateFilterLabel"),
  );

  const datePicker = (
    <div
      className="w-auto shrink-0 overflow-visible py-0.5"
      data-testid="view-date-filter-field"
    >
      <ViewFilterDateField
        granularity={dateFilterConfig.granularity}
        value={pageState.dateFilter.value}
        onChange={pageState.dateFilter.setValue}
        isExplicit={pageState.dateFilter.isExplicit}
        locale={i18n.language}
        inputClassName={inputClassName}
        inputStyle={presentation.valueStyle}
      />
    </div>
  );

  const dateLabel = resolvedDateLabel.show ? (
    <span
      className={cn(
        "text-xs font-medium",
        viewFilterDateLabelColorClassName(resolvedDateLabel.color),
        viewFilterDateLabelAlignClassName(resolvedDateLabel.align),
        resolvedDateLabel.bold && "font-bold",
        resolvedDateLabel.thin && "font-light",
        resolvedDateLabel.italic && "italic",
        resolvedDateLabel.underline && "underline",
        !resolvedDateLabel.bold && !resolvedDateLabel.thin && "font-medium",
      )}
    >
      {resolvedDateLabel.text}
    </span>
  ) : null;

  const dateField = dateLabel ? (
    <label className="inline-flex w-auto flex-col gap-1">
      {resolvedDateLabel.position === "below" ? (
        <>
          {datePicker}
          {dateLabel}
        </>
      ) : (
        <>
          {dateLabel}
          {datePicker}
        </>
      )}
    </label>
  ) : (
    datePicker
  );

  return (
    <div
      className={cn("w-fit max-w-full shrink-0", presentation.className)}
      style={presentation.style}
    >
      <ResponsiveStyleTag cssText={presentation.cssText} />
      {dateField}
    </div>
  );
}
