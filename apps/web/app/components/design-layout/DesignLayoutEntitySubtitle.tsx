import { Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import { getCurrentDesignLayoutTargetValue } from "./design-layout-target";
import type { DesignLayoutEntityKind } from "./design-layout-kind";
import { useDesignLayoutTargetOptions } from "./use-design-layout-target-options";

interface DesignLayoutEntitySubtitleProps {
  readonly kind: DesignLayoutEntityKind;
  readonly entityName: EntityName;
  readonly customViewId?: string;
  readonly onTargetChange: (encodedValue: string) => void;
  readonly disabled?: boolean;
}

export function DesignLayoutEntitySubtitle({
  kind,
  entityName,
  customViewId,
  onTargetChange,
  disabled = false,
}: DesignLayoutEntitySubtitleProps) {
  const { t } = useTranslation("common");
  const { optionGroups, isLoading, hasCustomViewOptions } =
    useDesignLayoutTargetOptions(kind);

  const labelKey = hasCustomViewOptions
    ? "designLayout.targetLabel"
    : "designLayout.entityLabel";
  const selectedValue = getCurrentDesignLayoutTargetValue(
    entityName,
    customViewId,
  );
  const totalOptions = optionGroups.reduce(
    (count, group) => count + group.options.length,
    0,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Text className="text-muted-foreground shrink-0 text-sm">
        {t(labelKey)}
      </Text>
      <Select
        selectSize="sm"
        className="min-w-[10rem]"
        value={selectedValue}
        disabled={disabled || isLoading || totalOptions === 0}
        onChange={(event) => onTargetChange(event.target.value)}
        aria-label={t(labelKey)}
      >
        {optionGroups.map((group) => (
          <optgroup key={group.labelKey} label={t(group.labelKey)}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </div>
  );
}
