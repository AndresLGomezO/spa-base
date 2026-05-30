import { FieldLabel } from "@repo/ui";

export function RoleSelect(props: {
  readonly id: string;
  readonly label: string;
  readonly roles: readonly string[];
  readonly value: readonly string[];
  readonly onChange: (roles: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <select
        id={props.id}
        multiple
        className="border-border min-h-28 rounded-md border px-3 py-2"
        value={[...props.value]}
        onChange={(event) => {
          const values = Array.from(event.target.selectedOptions).map(
            (option) => option.value,
          );
          props.onChange(values);
        }}
      >
        {props.roles.map((roleName) => (
          <option key={roleName} value={roleName}>
            {roleName}
          </option>
        ))}
      </select>
    </div>
  );
}
