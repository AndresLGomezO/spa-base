import { useEffect, useMemo, useState } from "react";
import {
  FieldError,
  FieldLabel,
  LayoutCard,
  SearchField,
  Text,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import {
  isJoinCollectionRelationField,
  type SerializableEntityDefinition,
} from "@repo/entities";
import type { EntityFieldSelectorComponentConfig } from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  getEntityLabel,
  type EntityCatalogEntry,
  type EntityName,
} from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { listEntity } from "../../lib/api-client";
import { RelationPickerSkeleton } from "../loading/RelationPickerSkeleton";
import { getEntityCardListGridClass } from "./entity-card-list-grid";
import {
  filterSelectorOptions,
  mapEnumValuesToOptions,
  mapRelationRecordsToOptions,
  normalizeSelectorValue,
  resolveSelectorImageFieldPath,
  toggleSelectorValue,
  type SelectorOption,
} from "./entity-field-selector-utils";
import { EntityFieldSelectorOptionImage } from "./EntityFieldSelectorOptionImage";

/** Caps list height inside wizard modals so options scroll without expanding the dialog. */
const ENTITY_FIELD_SELECTOR_WIZARD_LIST_MAX_HEIGHT =
  "min(28rem, calc(90vh - 14rem))";

interface EntityFieldSelectorProps {
  readonly entityName: EntityName;
  readonly config: EntityFieldSelectorComponentConfig;
  readonly value: unknown;
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly containerClassName?: string;
  readonly listScrollContained?: boolean;
  readonly onChange: (
    fieldName: string,
    value: unknown,
    displayRecord?: Record<string, unknown> | null,
  ) => void;
}

function selectionClassName(selected: boolean): string {
  return cn(
    "border-border w-full rounded-md border transition-colors",
    selected
      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
      : "hover:bg-muted/60",
  );
}

interface OptionItemProps {
  readonly option: SelectorOption;
  readonly selected: boolean;
  readonly readOnly: boolean;
  readonly layout: EntityFieldSelectorComponentConfig["layout"];
  readonly showImageColumn: boolean;
  readonly imageFieldPath: string | undefined;
  readonly targetDefinition: SerializableEntityDefinition | undefined;
  readonly getDefinition: (
    entityName: EntityName,
  ) => EntityCatalogEntry | undefined;
  readonly onSelect: (optionId: string) => void;
}

function SelectorListItem({
  option,
  selected,
  readOnly,
  layout,
  showImageColumn,
  imageFieldPath,
  targetDefinition,
  getDefinition,
  onSelect,
}: OptionItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={readOnly}
      className={cn(
        selectionClassName(selected),
        "flex shrink-0 items-center gap-3 px-3 text-start text-sm",
        layout === "list-with-logo" ? "h-16" : "h-11",
        readOnly && "cursor-default opacity-70",
      )}
      onClick={() => onSelect(option.id)}
    >
      {showImageColumn ? (
        <EntityFieldSelectorOptionImage
          record={option.record}
          imageFieldPath={imageFieldPath}
          targetDefinition={targetDefinition}
          getDefinition={getDefinition}
          className="shrink-0"
          imageSize={40}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
    </button>
  );
}

function SelectorMiniCard({
  option,
  selected,
  readOnly,
  showImage,
  imageFieldPath,
  targetDefinition,
  getDefinition,
  onSelect,
}: Omit<OptionItemProps, "layout"> & { readonly showImage: boolean }) {
  return (
    <LayoutCard
      interactive={!readOnly}
      role="option"
      aria-selected={selected}
      tabIndex={readOnly ? -1 : 0}
      className={cn(
        "w-full cursor-pointer p-3",
        "flex flex-col items-center justify-center gap-2 text-center",
        selected && "border-primary bg-primary/10 ring-1 ring-primary/30",
        readOnly && "cursor-default opacity-70",
      )}
      onClick={() => {
        if (!readOnly) {
          onSelect(option.id);
        }
      }}
      onKeyDown={(event) => {
        if (readOnly) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(option.id);
        }
      }}
    >
      {showImage ? (
        <div className="flex w-full items-center justify-center">
          <EntityFieldSelectorOptionImage
            record={option.record}
            imageFieldPath={imageFieldPath}
            targetDefinition={targetDefinition}
            getDefinition={getDefinition}
            imageSize={72}
          />
        </div>
      ) : (
        <div className="flex w-full items-center justify-center" />
      )}
      <Text className="line-clamp-2 w-full shrink-0 text-sm">
        {option.label}
      </Text>
    </LayoutCard>
  );
}

export function EntityFieldSelector({
  entityName,
  config,
  value,
  label,
  required,
  error,
  readOnly = false,
  containerClassName,
  listScrollContained = false,
  onChange,
}: EntityFieldSelectorProps) {
  const { t } = useTranslation();
  const definition = useEntityDefinition(entityName);
  const { getDefinition } = useEntityCatalog();
  const fieldName = config.fieldPath;
  const fieldMeta = definition.fields[fieldName];
  const [searchQuery, setSearchQuery] = useState("");
  const [relationOptions, setRelationOptions] = useState<
    readonly SelectorOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const multiSelect = useMemo(() => {
    if (!fieldMeta) {
      return false;
    }
    if (fieldMeta.type === "enum") {
      return fieldMeta.isArray === true;
    }
    if (fieldMeta.type === "relation") {
      return isJoinCollectionRelationField(fieldMeta);
    }
    return false;
  }, [fieldMeta]);

  const targetEntity =
    fieldMeta?.type === "relation" ? fieldMeta.relation?.target : undefined;
  const targetDefinition = targetEntity
    ? getDefinition(targetEntity as EntityName)
    : undefined;

  const imageFieldPath = useMemo(
    () =>
      resolveSelectorImageFieldPath(
        config,
        targetDefinition as SerializableEntityDefinition | undefined,
      ),
    [config, targetDefinition],
  );

  const showImages =
    Boolean(imageFieldPath) &&
    (config.layout === "list-with-logo" || config.layout === "mini-cards");

  useEffect(() => {
    if (fieldMeta?.type !== "relation" || !targetEntity) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      try {
        const result = await listEntity<Record<string, unknown>>(targetEntity, {
          limit: 100,
        });
        if (cancelled) {
          return;
        }
        setRelationOptions(
          mapRelationRecordsToOptions(result.items, targetDefinition),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fieldMeta?.type, targetEntity, targetDefinition]);

  const optionImageProps = {
    imageFieldPath,
    targetDefinition: targetDefinition as
      | SerializableEntityDefinition
      | undefined,
    getDefinition,
  };

  const options = useMemo(() => {
    if (fieldMeta?.type === "enum") {
      return mapEnumValuesToOptions(fieldMeta.enumValues);
    }
    if (fieldMeta?.type === "relation") {
      return relationOptions;
    }
    return [];
  }, [fieldMeta, relationOptions]);

  const filteredOptions = useMemo(
    () => filterSelectorOptions(options, searchQuery),
    [options, searchQuery],
  );

  const selectedIds = normalizeSelectorValue(value, multiSelect);
  const enableSearch = config.enableSearch !== false;

  const searchPlaceholder = useMemo(() => {
    if (fieldMeta?.type === "relation" && targetDefinition) {
      return t("entity.fieldSelector.searchEntityPlaceholder", {
        entityLabel: getEntityLabel(targetDefinition).toLowerCase(),
      });
    }
    return t("entity.fieldSelector.searchFieldPlaceholder", {
      fieldLabel: label || formatFieldLabel(fieldName, definition),
    });
  }, [definition, fieldMeta?.type, fieldName, label, t, targetDefinition]);

  function handleSelect(optionId: string) {
    if (readOnly) {
      return;
    }
    const nextValue = toggleSelectorValue(value, optionId, multiSelect);
    const option = options.find((entry) => entry.id === optionId);
    onChange(fieldName, nextValue, option?.record ?? null);
  }

  const gridClass =
    config.layout === "mini-cards"
      ? getEntityCardListGridClass(config.cardsPerRow)
      : undefined;

  if (!fieldMeta) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", containerClassName)}>
      <div className="flex shrink-0 flex-col gap-2">
        <FieldLabel required={required}>
          {label || formatFieldLabel(fieldName, definition)}
        </FieldLabel>

        {enableSearch ? (
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
            ariaLabel={searchPlaceholder}
            className="w-full max-w-none sm:max-w-none md:max-w-none lg:max-w-none"
          />
        ) : null}
      </div>

      <div
        className={cn(
          "w-full overscroll-contain",
          listScrollContained ? "overflow-y-auto" : undefined,
        )}
        style={
          listScrollContained
            ? { maxHeight: ENTITY_FIELD_SELECTOR_WIZARD_LIST_MAX_HEIGHT }
            : undefined
        }
        role="listbox"
        aria-multiselectable={multiSelect}
      >
        {isLoading ? (
          <RelationPickerSkeleton />
        ) : filteredOptions.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("entity.fieldSelector.noOptions")}
          </Text>
        ) : config.layout === "mini-cards" ? (
          <div className={cn("grid gap-3", gridClass)}>
            {filteredOptions.map((option) => (
              <SelectorMiniCard
                key={option.id}
                option={option}
                selected={selectedIds.includes(option.id)}
                readOnly={readOnly}
                showImage={showImages}
                showImageColumn={false}
                onSelect={handleSelect}
                {...optionImageProps}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredOptions.map((option) => (
              <SelectorListItem
                key={option.id}
                option={option}
                selected={selectedIds.includes(option.id)}
                readOnly={readOnly}
                layout={config.layout}
                showImageColumn={
                  config.layout === "list-with-logo" && showImages
                }
                onSelect={handleSelect}
                {...optionImageProps}
              />
            ))}
          </div>
        )}
      </div>

      {error ? <FieldError className="shrink-0">{error}</FieldError> : null}
    </div>
  );
}
