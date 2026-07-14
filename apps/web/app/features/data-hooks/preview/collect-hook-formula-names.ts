import type {
  DataHookAction,
  DataHookCondition,
  DataHookConditionNode,
} from "@repo/hooks";
import { collectFormulaNames } from "@repo/hooks";

function uniqueFormulaNames(names: readonly string[]): readonly string[] {
  return [...new Set(names)];
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

export function collectFormulaNamesInCondition(
  node: DataHookConditionNode,
): readonly string[] {
  const names: string[] = [];
  walkConditionNodes(node, (leaf) => {
    if (leaf.value) {
      names.push(...collectFormulaNames(leaf.value));
    }
  });
  return uniqueFormulaNames(names);
}

export function collectFormulaNamesInAction(
  action: DataHookAction,
): readonly string[] {
  const names: string[] = [];

  switch (action.type) {
    case "setField":
      names.push(...collectFormulaNames(action.value));
      break;
    case "createRecord":
      for (const node of Object.values(action.data)) {
        names.push(...collectFormulaNames(node));
      }
      break;
    case "getOrCreateRecord":
      if (action.data) {
        for (const node of Object.values(action.data)) {
          names.push(...collectFormulaNames(node));
        }
      }
      break;
    case "matchRelatedRecord":
      names.push(...collectFormulaNames(action.haystack));
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
      if (action.body) {
        names.push(...collectFormulaNames(action.body));
      }
      break;
    default:
      break;
  }

  return uniqueFormulaNames(names);
}
