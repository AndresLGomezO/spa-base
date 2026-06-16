/** Inset rings stay inside the control box and are not clipped by row overflow. */
export const focusRingInsetClassName =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-offset-0";

export const formControlFocusRingClassName = `${focusRingInsetClassName} focus-visible:ring-input-focus`;

export const formControlFocusRingErrorClassName =
  "focus-visible:ring-danger-500";
