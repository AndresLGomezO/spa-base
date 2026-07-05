import { cn } from "@repo/theme/utils";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { PresetSourceFilter } from "./preset-catalog-entry";
import {
  PRESET_SOURCE_BADGE_CLASS,
  presetSourceLabelKey,
} from "./preset-list-styles";

export function PresetListBadge({
  source,
  size = "default",
}: {
  readonly source: PresetSourceFilter;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        PRESET_SOURCE_BADGE_CLASS[source],
        size === "compact"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-0.5 text-xs",
      )}
    >
      <Text as="span" className="text-inherit">
        {t(presetSourceLabelKey(source))}
      </Text>
    </span>
  );
}
