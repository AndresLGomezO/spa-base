import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Button } from "../button/Button";
import { FilterValueBadge } from "../filter-value-badge/FilterValueBadge";
import { Input } from "../input/Input";
import { Popover } from "../popover/Popover";

export interface SearchableMultiSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SearchableMultiSelectDropdownProps {
  readonly options: readonly SearchableMultiSelectOption[];
  readonly selected: readonly string[];
  readonly onChange: (selected: readonly string[]) => void;
  readonly placeholder: string;
  readonly selectedCountLabel: (count: number) => string;
  readonly searchPlaceholder: string;
  readonly noResultsLabel: string;
  readonly removeAriaLabel: (displayValue: string) => string;
  readonly disabled?: boolean;
  readonly ariaLabel?: string;
  readonly "data-testid"?: string;
}

export function SearchableMultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  selectedCountLabel,
  searchPlaceholder,
  noResultsLabel,
  removeAriaLabel,
  disabled = false,
  ariaLabel,
  "data-testid": dataTestId,
}: SearchableMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const availableOptions = useMemo(
    () => options.filter((option) => !selected.includes(option.value)),
    [options, selected],
  );

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return availableOptions;
    }

    return availableOptions.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [availableOptions, searchTerm]);

  const addOption = useCallback(
    (value: string) => {
      if (selected.includes(value)) {
        return;
      }

      onChange([...selected, value]);
      setSearchTerm("");
    },
    [onChange, selected],
  );

  const removeOption = useCallback(
    (value: string) => {
      onChange(selected.filter((item) => item !== value));
    },
    [onChange, selected],
  );

  const triggerLabel =
    selected.length === 0 ? placeholder : selectedCountLabel(selected.length);

  return (
    <div className="flex flex-col gap-2">
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-start"
        fullWidth
        className="w-full"
        panelClassName="w-full max-w-none"
        trigger={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel ?? placeholder}
            data-testid={dataTestId}
            className="w-full justify-between rounded-xl"
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        }
      >
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            className="!pl-8 shadow-none"
            aria-label={searchPlaceholder}
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">
              {noResultsLabel}
            </p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-sm"
                onClick={() => addOption(option.value)}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      </Popover>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => {
            const label =
              options.find((option) => option.value === value)?.label ?? value;

            return (
              <FilterValueBadge
                key={value}
                label={label}
                onRemove={() => removeOption(value)}
                removeAriaLabel={removeAriaLabel(label)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
