import type { FieldUIConfig } from "@repo/entities";

export function sortFieldsByUiOrder(
  fieldNames: readonly string[],
  fields?: Readonly<Record<string, FieldUIConfig>>,
): readonly string[] {
  return fieldNames
    .map((name, index) => ({
      name,
      index,
      order: fields?.[name]?.order,
    }))
    .sort((left, right) => {
      const leftOrder = left.order ?? left.index;
      const rightOrder = right.order ?? right.index;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.index - right.index;
    })
    .map(({ name }) => name);
}
