import type { ViewSearchComponentConfig } from "@repo/ui-builder-core";
import {
  interactiveSearchFieldClass,
  stylesIncludeVisualChrome,
} from "@repo/ui-builder-core";
import { SearchField } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { cn } from "@repo/theme/utils";

import { LayoutInteractiveShell } from "../../components/entity/LayoutInteractiveShell";
import { useOptionalViewFilterPageState } from "./view-filter-page-context";

interface ViewSearchComponentProps {
  readonly config: ViewSearchComponentConfig;
}

export function ViewSearchComponent({ config }: ViewSearchComponentProps) {
  const pageState = useOptionalViewFilterPageState();
  const { t } = useTranslation("common");

  if (!pageState) {
    return null;
  }

  const placeholder =
    config.placeholder?.trim() || t("dataView.searchPlaceholder");
  const customChrome = stylesIncludeVisualChrome(config.styles);

  return (
    <LayoutInteractiveShell styles={config.styles} label={config.label}>
      {(presentation) => (
        <SearchField
          value={pageState.search}
          onChange={pageState.setSearch}
          placeholder={placeholder}
          ariaLabel={placeholder}
          clearAriaLabel={t("dataView.searchClear")}
          className="max-w-none min-w-0 w-full"
          inputClassName={cn(
            presentation.valueClassName,
            !customChrome && interactiveSearchFieldClass(),
          )}
          inputStyle={presentation.valueStyle}
        />
      )}
    </LayoutInteractiveShell>
  );
}
