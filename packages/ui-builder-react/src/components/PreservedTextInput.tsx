import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type ReactElement,
} from "react";
import { Input, type InputProps } from "@repo/ui";

export type PreservedTextInputProps = Omit<InputProps, "value" | "onChange"> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

/**
 * Text input that keeps a local draft while focused so upstream re-renders
 * do not reset caret position in designer third-rail panels.
 */
export function PreservedTextInput({
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: PreservedTextInputProps): ReactElement {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [value]);

  return (
    <Input
      {...props}
      value={draft}
      onFocus={(event: FocusEvent<HTMLInputElement>) => {
        focusedRef.current = true;
        setDraft(value);
        onFocus?.(event);
      }}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        focusedRef.current = false;
        setDraft(value);
        onBlur?.(event);
      }}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        setDraft(next);
        onChange(next);
      }}
    />
  );
}
