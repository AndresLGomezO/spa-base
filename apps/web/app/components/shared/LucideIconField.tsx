import { FieldLabel, Input, Text } from "@repo/ui";

import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";

interface LucideIconFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly onChange: (value: string) => void;
}

export function LucideIconField({
  id,
  label,
  hint,
  value,
  placeholder = "Folder",
  disabled = false,
  onChange,
}: LucideIconFieldProps) {
  const PreviewIcon = resolveLucideIcon(value);

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <PreviewIcon className="size-5 shrink-0" aria-hidden />
      </div>
      <Text className="text-muted-foreground mt-1 text-sm">{hint}</Text>
    </div>
  );
}
