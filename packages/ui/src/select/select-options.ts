import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectOptionGroup {
  readonly label: string;
  readonly options: readonly SelectOption[];
}

export type SelectOptionsInput =
  | readonly SelectOption[]
  | readonly SelectOptionGroup[];

export function isGroupedOptions(
  options: SelectOptionsInput,
): options is readonly SelectOptionGroup[] {
  return options.length > 0 && "options" in options[0]!;
}

export function flattenSelectOptions(
  options: SelectOptionsInput,
): readonly SelectOption[] {
  if (isGroupedOptions(options)) {
    return options.flatMap((group) => group.options);
  }

  return options;
}

function parseOptionElement(
  element: ReactElement<{ value?: string; children?: ReactNode }>,
): SelectOption {
  return {
    value: String(element.props.value ?? ""),
    label: String(element.props.children ?? element.props.value ?? ""),
  };
}

function parseOptGroupElement(
  element: ReactElement<{ label?: string; children?: ReactNode }>,
): SelectOptionGroup {
  const options: SelectOption[] = [];

  for (const child of Children.toArray(element.props.children)) {
    if (isValidElement(child) && child.type === "option") {
      options.push(
        parseOptionElement(
          child as ReactElement<{ value?: string; children?: ReactNode }>,
        ),
      );
    }
  }

  return {
    label: String(element.props.label ?? ""),
    options,
  };
}

export function parseSelectChildren(children: ReactNode): SelectOptionsInput {
  const groups: SelectOptionGroup[] = [];
  const flat: SelectOption[] = [];
  let hasGroups = false;

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) {
      continue;
    }

    if (child.type === "optgroup") {
      hasGroups = true;
      groups.push(
        parseOptGroupElement(
          child as ReactElement<{ label?: string; children?: ReactNode }>,
        ),
      );
      continue;
    }

    if (child.type === "option") {
      flat.push(
        parseOptionElement(
          child as ReactElement<{ value?: string; children?: ReactNode }>,
        ),
      );
    }
  }

  if (hasGroups) {
    if (flat.length > 0) {
      return [{ label: "", options: flat }, ...groups];
    }

    return groups;
  }

  return flat;
}

export function filterOptionsByQuery(
  options: SelectOptionsInput,
  query: string,
): SelectOptionsInput {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }

  if (isGroupedOptions(options)) {
    return options
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          option.label.toLowerCase().includes(normalized),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }

  return options.filter((option) =>
    option.label.toLowerCase().includes(normalized),
  );
}

export function findOptionLabel(
  options: SelectOptionsInput,
  value: string,
): string {
  const match = flattenSelectOptions(options).find(
    (option) => option.value === value,
  );

  return match?.label ?? value;
}

export function createSyntheticSelectChangeEvent(
  value: string,
): React.ChangeEvent<HTMLSelectElement> {
  return {
    target: { value } as HTMLSelectElement,
    currentTarget: { value } as HTMLSelectElement,
  } as React.ChangeEvent<HTMLSelectElement>;
}
