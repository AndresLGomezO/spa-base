import { Text } from "@repo/ui";

interface JsonImportErrorsProps {
  readonly errors: readonly {
    readonly path: string;
    readonly message: string;
  }[];
  readonly invalidLabel: string;
}

export function JsonImportErrors({
  errors,
  invalidLabel,
}: JsonImportErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <Text className="text-destructive text-sm">{invalidLabel}</Text>
      <ul className="text-destructive max-h-40 list-disc overflow-auto pl-5 text-sm">
        {errors.map((error) => (
          <li key={`${error.path}:${error.message}`}>
            {error.path}: {error.message}
          </li>
        ))}
      </ul>
    </>
  );
}
