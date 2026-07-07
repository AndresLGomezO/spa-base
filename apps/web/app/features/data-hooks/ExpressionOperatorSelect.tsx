import { cn } from "@repo/theme/utils";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import { expressionOperatorSelectClassName } from "./expression-editor-shared";

interface ExpressionOperatorSelectProps<T extends string> {
  readonly value: T;
  readonly options: readonly T[];
  readonly getLabel: (value: T) => string;
  readonly getSymbol?: (value: T) => string;
  readonly disabled?: boolean;
  readonly onChange: (value: T) => void;
  readonly className?: string;
  readonly ariaLabel: string;
}

export function ExpressionOperatorSelect<T extends string>({
  value,
  options,
  getLabel,
  getSymbol = (operator) => operator,
  disabled,
  onChange,
  className,
  ariaLabel,
}: ExpressionOperatorSelectProps<T>) {
  return (
    <div className="relative inline-flex shrink-0">
      <Select
        selectSize="sm"
        className={cn(
          expressionOperatorSelectClassName,
          "text-transparent",
          className,
        )}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((operator) => (
          <option key={operator} value={operator}>
            {getLabel(operator)}
          </option>
        ))}
      </Select>
      <span
        aria-hidden
        className="text-foreground pointer-events-none absolute inset-y-0 left-0 right-6 flex items-center justify-center font-mono text-sm leading-none"
      >
        {getSymbol(value)}
      </span>
    </div>
  );
}
