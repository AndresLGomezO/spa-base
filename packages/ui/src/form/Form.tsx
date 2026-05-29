import { type FormHTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  readonly children: ReactNode;
}

export function Form({ className, children, ...props }: FormProps) {
  return (
    <form className={cn("flex w-full flex-col gap-4", className)} {...props}>
      {children}
    </form>
  );
}
