import { Search } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";

import { cn } from "@repo/theme/utils";
import { Input } from "@repo/ui";

const DEFAULT_DEBOUNCE_MS = 300;

interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly ariaLabel?: string;
  readonly debounceMs?: number;
  readonly className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  className,
}: SearchFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    isExternalUpdate.current = true;
    startTransition(() => setLocalValue(value));
  }, [value]);

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
        "relative w-full min-w-0 sm:max-w-md md:max-w-lg lg:max-w-xl",
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
        placeholder={placeholder}
        className="!pl-11 shadow-none"
        aria-label={ariaLabel ?? placeholder}
        data-testid="data-view-search"
      />
    </div>
  );
}
