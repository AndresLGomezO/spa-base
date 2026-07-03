import {
  collectFormulaNames,
  type DataHookCondition,
  type DataHookConditionNode,
  type DataHookDefinition,
} from "@repo/hooks";
import { getPlatformFormulaNames } from "@repo/formula-definitions/runtime";
import type {
  TenantBundleExportDocument,
  TenantBundleImportError,
} from "@repo/tenant-bundle";

export function validateTenantBundleFormulaReferences(
  bundle: TenantBundleExportDocument,
): readonly TenantBundleImportError[] {
  const errors: TenantBundleImportError[] = [];
  const formulaNames = new Set<string>(getPlatformFormulaNames());
  for (const formula of bundle.formulaDefinitions) {
    if (formula.enabled) {
      formulaNames.add(formula.name);
    }
  }

  for (const hook of bundle.hooks) {
    errors.push(...validateHookFormulaReferences(hook, formulaNames));
  }

  return errors;
}

function validateHookFormulaReferences(
  hook: DataHookDefinition,
  formulaNames: ReadonlySet<string>,
): readonly TenantBundleImportError[] {
  const errors: TenantBundleImportError[] = [];

  if (hook.condition) {
    for (const name of collectFormulaNamesInCondition(hook.condition)) {
      if (!formulaNames.has(name)) {
        errors.push({
          path: `hooks.${hook.id}.condition`,
          message: `Unknown formula "${name}".`,
        });
      }
    }
  }

  for (const name of collectFormulaNamesInHookActions(hook)) {
    if (!formulaNames.has(name)) {
      errors.push({
        path: `hooks.${hook.id}.actions`,
        message: `Unknown formula "${name}".`,
      });
    }
  }

  return errors;
}

function collectFormulaNamesInCondition(
  node: DataHookConditionNode,
): readonly string[] {
  const names: string[] = [];
  walkConditionNodes(node, (leaf) => {
    if (leaf.value) {
      names.push(...collectFormulaNames(leaf.value));
    }
  });
  return names;
}

function walkConditionNodes(
  node: DataHookConditionNode,
  visitLeaf: (leaf: DataHookCondition) => void,
): void {
  if (node.type === "condition") {
    visitLeaf(node);
    return;
  }
  for (const child of node.children) {
    walkConditionNodes(child, visitLeaf);
  }
}

function collectFormulaNamesInHookActions(
  hook: DataHookDefinition,
): readonly string[] {
  const names: string[] = [];
  for (const action of hook.actions) {
    switch (action.type) {
      case "setField":
        names.push(...collectFormulaNames(action.value));
        break;
      case "createRecord":
        for (const node of Object.values(action.data)) {
          names.push(...collectFormulaNames(node));
        }
        break;
      case "createRecords":
        names.push(...collectFormulaNames(action.count));
        if (action.startIndex) {
          names.push(...collectFormulaNames(action.startIndex));
        }
        for (const node of Object.values(action.data)) {
          names.push(...collectFormulaNames(node));
        }
        break;
      case "updateMatching":
        for (const node of Object.values(action.set)) {
          names.push(...collectFormulaNames(node));
        }
        break;
      case "deleteRecord":
      case "getRecord":
        names.push(...collectFormulaNames(action.id));
        break;
      case "sendNotification":
        names.push(...collectFormulaNames(action.message));
        break;
      case "callWebhook":
        names.push(...collectFormulaNames(action.url));
        break;
      default:
        break;
    }
  }
  return names;
}
