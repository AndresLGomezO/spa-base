import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  readonly label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, id, ...props }, ref) {
    return (
      <label
        htmlFor={id}
        className={cn(
          "text-foreground inline-flex cursor-pointer items-center gap-2 text-sm",
          props.disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="border-border text-primary-600 focus:ring-primary-500 h-4 w-4 rounded"
          {...props}
        />
        {label ? <span>{label}</span> : null}
      </label>
    );
  },
);
