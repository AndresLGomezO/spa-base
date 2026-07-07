import { Search, X } from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@repo/theme/utils";

import { focusRingInsetClassName } from "../focus-ring/focus-ring-classes";

import { Input } from "../input/Input";

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_CLEAR_ARIA_LABEL = "Clear search";

export interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly ariaLabel?: string;
  readonly clearAriaLabel?: string;
  readonly debounceMs?: number;
  readonly className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  clearAriaLabel = DEFAULT_CLEAR_ARIA_LABEL,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  className,
}: SearchFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdate = useRef(false);
  const isFocusedRef = useRef(false);

  const showClearButton = localValue.length > 0;

  const handleClear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    isExternalUpdate.current = true;
    setLocalValue("");
    onChangeRef.current("");
  }, []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isFocusedRef.current) {
      return;
    }

    isExternalUpdate.current = true;
    startTransition(() => setLocalValue(value));
  }, [value]);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;

    if (localValue !== value) {
      isExternalUpdate.current = true;
      setLocalValue(value);
    }
  }, [localValue, value]);

  useEffect(() => {
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onChangeRef.current(localValue);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [debounceMs, localValue]);

  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-visible py-0.5 sm:max-w-md md:max-w-lg lg:max-w-xl",
        className,
      )}
    >
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="text"
        role="searchbox"
        value={localValue}
        onChange={(event) => {
          isExternalUpdate.current = false;
          setLocalValue(event.target.value);
        }}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn("!pl-11 shadow-none", showClearButton && "!pr-10")}
        aria-label={ariaLabel ?? placeholder}
        data-testid="data-view-search"
      />
      {showClearButton ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={clearAriaLabel}
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-hover/80 focus-visible:ring-focus/40 absolute top-1/2 right-2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
            focusRingInsetClassName,
          )}
          data-testid="data-view-search-clear"
        >
          <X className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
