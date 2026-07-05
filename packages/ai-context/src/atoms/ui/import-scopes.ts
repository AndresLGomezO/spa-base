export const UI_IMPORT_SCOPES_ATOM_ID = "ui.import.scopes";

export function buildUiImportScopesAtom(): string {
  return `# Layout JSON import scopes

When pasting JSON in the builder, the validator applies a scope:

| Scope | Accepts | Use |
|-------|---------|-----|
| \`layout-document\` | Full \`UiLayoutDocument\` | Replace entire layout |
| \`column\` | \`ColumnNode\` | Legacy column import |
| \`component-row\` | Single \`ComponentRowNode\` | One row with component |
| \`insertable-row\` | \`ComponentRowNode\` or grid track row | Insert at selection |

Import normalizes legacy \`nested-layout\` to \`grid\` where possible. Field paths are validated against the entity definition for the active surface.
`;
}
