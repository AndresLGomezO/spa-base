export function toQualifiedViewFilterColumnId(
  entityName: string,
  fieldName: string,
): string {
  return `${entityName}.${fieldName}`;
}
