import type {
  LayoutTargetDraft,
  UiBuilderDraftWithLayoutTargets,
} from "./types.js";

export function formatLayoutPathKey(pathKey: string): string {
  return pathKey.replace(/@/g, " > ").replace(/:/g, ": ");
}

export function describeHierarchyContext(
  draft: UiBuilderDraftWithLayoutTargets,
  pathKey: string,
): string {
  const target = draft.layoutTargets[pathKey];
  const lines = [
    `- Path: ${formatLayoutPathKey(pathKey)}`,
    `- Label: ${target?.label ?? pathKey}`,
  ];

  const siblingKeys = Object.keys(draft.layoutTargets).filter((key) =>
    key.startsWith(pathKey.split("@")[0] ?? pathKey),
  );
  const completed = siblingKeys.filter((key) => {
    const t = draft.layoutTargets[key];
    return t?.skeleton && Object.keys(t.componentConfigs).length > 0;
  });
  if (completed.length > 0) {
    lines.push(
      `- Completed targets: ${completed.map(formatLayoutPathKey).join(", ")}`,
    );
  }

  return lines.join("\n");
}

export function getLayoutTargetLabel(pathKey: string): string {
  if (pathKey === "listItem") {
    return "Card list item layout";
  }
  if (pathKey === "plain.root") {
    return "Plain form root layout";
  }
  if (pathKey === "wizard.shell") {
    return "Wizard shell layout";
  }
  if (pathKey === "wizard.modalFooter") {
    return "Wizard modal footer layout";
  }
  const wizardStepMatch = pathKey.match(/^wizard\.steps\[(\d+)\]$/);
  if (wizardStepMatch) {
    return `Wizard step ${Number(wizardStepMatch[1]) + 1} layout`;
  }
  if (pathKey === "expandableTable.rowExpandLayout") {
    return "Expandable row detail layout";
  }
  const columnMatch = pathKey.match(
    /^expandableTable\.columns\[(\d+)\]\.cellLayout/,
  );
  if (columnMatch) {
    return `Grouped column ${Number(columnMatch[1]) + 1} cell layout`;
  }
  return formatLayoutPathKey(pathKey);
}

export function ensureLayoutTarget(
  draft: UiBuilderDraftWithLayoutTargets,
  pathKey: string,
): LayoutTargetDraft {
  const existing = draft.layoutTargets[pathKey];
  if (existing) {
    return existing;
  }
  return {
    pathKey,
    label: getLayoutTargetLabel(pathKey),
    componentConfigs: {},
  };
}

export function componentConfigKey(componentPath: string): string {
  return componentPath;
}
