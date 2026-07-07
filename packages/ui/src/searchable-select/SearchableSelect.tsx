import {
  useCallback,
  useMemo,
  useState,
  type ChangeEventHandler,
  type ReactNode,
} from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@repo/theme/utils";

import {
  formControlFocusRingClassName,
  formControlFocusRingErrorClassName,
} from "../focus-ring/focus-ring-classes";
import { Input } from "../input/Input";
import { Popover } from "../popover/Popover";
import {
  createSyntheticSelectChangeEvent,
  filterOptionsByQuery,
  findOptionLabel,
  flattenSelectOptions,
  isGroupedOptions,
  parseSelectChildren,
  type SelectOption,
  type SelectOptionGroup,
  type SelectOptionsInput,
} from "../select/select-options.js";
import type { SelectSize } from "../select/Select.js";

const DEFAULT_SEARCH_PLACEHOLDER = "Search options…";
const DEFAULT_NO_RESULTS_LABEL = "No matching options";

const sizeClasses: Record<SelectSize, string> = {
  default: "h-auto min-h-10 px-3 py-2",
  sm: "h-8 min-h-8 px-2 py-1 md:h-9 md:min-h-9 md:px-3 md:py-1.5",
};

export interface SearchableSelectProps {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: ChangeEventHandler<HTMLSelectElement>;
  readonly options?: SelectOptionsInput;
  readonly children?: ReactNode;
  readonly disabled?: boolean;
  readonly hasError?: boolean;
  readonly selectSize?: SelectSize;
  readonly searchPlaceholder?: string;
  readonly noResultsLabel?: string;
  readonly className?: string;
  readonly id?: string;
  readonly "aria-label"?: string;
  readonly "data-testid"?: string;
}

function OptionButton({
  option,
  selected,
  onSelect,
}: {
  readonly option: SelectOption;
  readonly selected: boolean;
  readonly onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-sm",
        selected && "bg-muted font-medium",
      )}
      onClick={() => onSelect(option.value)}
    >
      {option.label}
    </button>
  );
}

function OptionsList({
  options,
  selectedValue,
  onSelect,
  noResultsLabel,
}: {
  readonly options: SelectOptionsInput;
  readonly selectedValue: string;
  readonly onSelect: (value: string) => void;
  readonly noResultsLabel: string;
}) {
  if (flattenSelectOptions(options).length === 0) {
    return (
      <p className="text-muted-foreground px-1 py-2 text-sm">
        {noResultsLabel}
      </p>
    );
  }

  if (isGroupedOptions(options)) {
    return (
      <>
        {options.map((group: SelectOptionGroup) => (
          <div key={group.label || "__ungrouped__"} className="py-1">
            {group.label ? (
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                {group.label}
              </p>
            ) : null}
            {group.options.map((option) => (
              <OptionButton
                key={`${group.label}-${option.value}`}
                option={option}
                selected={option.value === selectedValue}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {options.map((option) => (
        <OptionButton
          key={option.value}
          option={option}
          selected={option.value === selectedValue}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function SearchableSelect({
  value,
  defaultValue = "",
  onChange,
  options: optionsProp,
  children,
  disabled = false,
  hasError = false,
  selectSize = "default",
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  noResultsLabel = DEFAULT_NO_RESULTS_LABEL,
  className,
  id,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const selectedValue = value ?? uncontrolledValue;

  const parsedOptions = useMemo(
    () => optionsProp ?? parseSelectChildren(children),
    [children, optionsProp],
  );

  const filteredOptions = useMemo(
    () => filterOptionsByQuery(parsedOptions, searchTerm),
    [parsedOptions, searchTerm],
  );

  const displayValue = useMemo(
    () => findOptionLabel(parsedOptions, selectedValue),
    [parsedOptions, selectedValue],
  );

  const commitValue = useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setUncontrolledValue(nextValue);
      }

      onChange?.(createSyntheticSelectChangeEvent(nextValue));
      setOpen(false);
      setSearchTerm("");
    },
    [onChange, value],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchTerm("");
    }
  }, []);

  const triggerClassName = cn(
    "border-input-border bg-input-background text-foreground w-full max-w-full cursor-pointer rounded-md border text-sm shadow-sm transition-colors",
    formControlFocusRingClassName,
    "disabled:cursor-not-allowed disabled:opacity-60",
    "pr-9",
    sizeClasses[selectSize],
    hasError && "border-danger-500",
    hasError && formControlFocusRingErrorClassName,
    !displayValue && "text-muted-foreground",
    className,
  );

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottom-start"
      layer="elevated"
      fullWidth
      className="w-full"
      panelClassName="min-w-0"
      trigger={
        <div className="relative w-full">
          <Input
            id={id}
            readOnly
            disabled={disabled}
            hasError={hasError}
            value={displayValue}
            aria-label={ariaLabel}
            data-testid={dataTestId}
            className={triggerClassName}
            onClick={() => {
              if (!disabled) {
                setOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (disabled) {
                return;
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setOpen(true);
              }
            }}
          />
          <ChevronDown
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
          />
        </div>
      }
    >
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={searchPlaceholder}
          className="!pl-8 shadow-none"
          aria-label={searchPlaceholder}
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        <OptionsList
          options={filteredOptions}
          selectedValue={selectedValue}
          onSelect={commitValue}
          noResultsLabel={noResultsLabel}
        />
      </div>
    </Popover>
  );
}
