import type {
  DataHookConditionCombinator,
  DataHookConditionGroup,
  DataHookConditionLeaf,
  DataHookConditionNode,
} from "@repo/hooks";

export type DataHookConditionPath = readonly number[];

export function createEmptyConditionLeaf(field = ""): DataHookConditionLeaf {
  return {
    type: "condition",
    field,
    operator: "==",
    value: { kind: "literal", value: "" },
  };
}

export function createEmptyConditionGroup(
  combinator: DataHookConditionCombinator = "and",
): DataHookConditionGroup {
  return {
    type: "group",
    combinator,
    children: [],
  };
}

export function createDefaultConditionRoot(field = ""): DataHookConditionGroup {
  return {
    type: "group",
    combinator: "and",
    children: [createEmptyConditionLeaf(field)],
  };
}

function updateNodeAtPathInternal(
  root: DataHookConditionNode,
  path: DataHookConditionPath,
  updater: (node: DataHookConditionNode) => DataHookConditionNode,
): DataHookConditionNode {
  if (path.length === 0) {
    return updater(root);
  }

  if (root.type !== "group") {
    return root;
  }

  const [head, ...rest] = path;
  const children = [...root.children];
  const child = children[head];
  if (!child) {
    return root;
  }
  children[head] = updateNodeAtPathInternal(child, rest, updater);
  return { ...root, children };
}

export function updateNodeAtPath(
  root: DataHookConditionNode,
  path: DataHookConditionPath,
  updater: (node: DataHookConditionNode) => DataHookConditionNode,
): DataHookConditionNode {
  return updateNodeAtPathInternal(root, path, updater);
}

export function updateLeafAtPath(
  root: DataHookConditionNode,
  path: DataHookConditionPath,
  patch: Partial<DataHookConditionLeaf>,
): DataHookConditionNode {
  return updateNodeAtPath(root, path, (node) => {
    if (node.type !== "condition") {
      return node;
    }
    return { ...node, ...patch };
  });
}

export function removeNodeAtPath(
  root: DataHookConditionNode,
  path: DataHookConditionPath,
): DataHookConditionNode {
  if (path.length === 0) {
    return root;
  }

  if (root.type !== "group") {
    return root;
  }

  if (path.length === 1) {
    const index = path[0];
    if (index === undefined) {
      return root;
    }
    return {
      ...root,
      children: root.children.filter((_, childIndex) => childIndex !== index),
    };
  }

  const [head, ...rest] = path;
  const children = [...root.children];
  const child = children[head];
  if (!child) {
    return root;
  }
  children[head] = removeNodeAtPath(child, rest);
  return { ...root, children };
}

export function addChildAtPath(
  root: DataHookConditionNode,
  groupPath: DataHookConditionPath,
  child: DataHookConditionNode,
): DataHookConditionNode {
  return updateNodeAtPath(root, groupPath, (node) => {
    if (node.type !== "group") {
      return node;
    }
    return {
      ...node,
      children: [...node.children, child],
    };
  });
}

export function pathKey(path: DataHookConditionPath): string {
  return path.length === 0 ? "root" : path.join(".");
}
