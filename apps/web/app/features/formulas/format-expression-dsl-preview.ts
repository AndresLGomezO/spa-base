import type { ExpressionNode } from "@repo/hooks";

const INDENT = "  ";

function indent(level: number): string {
  return INDENT.repeat(level);
}

function formatLiteral(
  node: Extract<ExpressionNode, { kind: "literal" }>,
): string {
  if (Array.isArray(node.value)) {
    return JSON.stringify(node.value);
  }
  return JSON.stringify(node.value);
}

function formatField(node: Extract<ExpressionNode, { kind: "field" }>): string {
  if (node.source === "aggregate") {
    return `aggregate(${node.alias})`;
  }
  const prefix =
    node.source === "loaded"
      ? node.alias
      : node.source === "previous"
        ? "previous"
        : "current";
  return `${prefix}.${node.path}`;
}

export function isSimpleNode(node: ExpressionNode): boolean {
  switch (node.kind) {
    case "literal":
    case "field":
    case "var":
    case "input":
      return true;
    case "unary":
      return isSimpleNode(node.operand);
    case "binary":
      return isSimpleNode(node.left) && isSimpleNode(node.right);
    case "call":
      return node.args.every(isSimpleNode);
    case "formula":
      return Object.values(node.inputs).every(isSimpleNode);
    default:
      return false;
  }
}

export function summarizeExpressionNode(node: ExpressionNode): string {
  return formatNodeInline(node);
}

function formatNodeInline(node: ExpressionNode): string {
  switch (node.kind) {
    case "literal":
      return formatLiteral(node);
    case "field":
      return formatField(node);
    case "var":
      return node.name === "now" ? "now()" : node.name;
    case "input":
      return `input.${node.name}`;
    case "unary": {
      const operand = formatNodeInline(node.operand);
      const wrapped = isSimpleNode(node.operand) ? operand : `(${operand})`;
      return node.op === "!" ? `!${wrapped}` : `-${wrapped}`;
    }
    case "binary":
      return `${formatNodeInline(node.left)} ${node.op} ${formatNodeInline(node.right)}`;
    case "call":
      return `${node.fn}(${node.args.map((arg) => formatNodeInline(arg)).join(", ")})`;
    case "formula": {
      const entries = Object.entries(node.inputs);
      if (entries.length === 0) {
        return node.name.trim().length > 0 ? node.name : "?";
      }
      return `${node.name}(${entries.map(([key, value]) => `${key}: ${formatNodeInline(value)}`).join(", ")})`;
    }
    case "switch":
      return "[switch]";
    default:
      return "[expression]";
  }
}

function formatCallMultiline(
  node: Extract<ExpressionNode, { kind: "call" }>,
  level: number,
): string[] {
  const pad = indent(level);
  const argPad = indent(level + 1);
  const hasCompoundArg = node.args.some((arg) => !isSimpleNode(arg));

  if (!hasCompoundArg) {
    return [`${pad}${formatNodeInline(node)}`];
  }

  const lines = [`${pad}${node.fn}(`];
  for (let index = 0; index < node.args.length; index += 1) {
    const arg = node.args[index]!;
    const suffix = index < node.args.length - 1 ? "," : "";
    if (isSimpleNode(arg)) {
      lines.push(`${argPad}${formatNodeInline(arg)}${suffix}`);
    } else {
      const argLines = formatNode(arg, level + 1);
      for (let lineIndex = 0; lineIndex < argLines.length; lineIndex += 1) {
        const isLastLine = lineIndex === argLines.length - 1;
        lines.push(isLastLine ? `${argLines[lineIndex]}${suffix}` : argLines[lineIndex]!);
      }
    }
  }
  lines.push(`${pad})`);
  return lines;
}

function formatFormulaMultiline(
  node: Extract<ExpressionNode, { kind: "formula" }>,
  level: number,
): string[] {
  const pad = indent(level);
  const entries = Object.entries(node.inputs);
  if (entries.length === 0) {
    return [`${pad}${node.name.trim().length > 0 ? node.name : "?"}`];
  }

  const hasCompoundInput = entries.some(([, value]) => !isSimpleNode(value));
  if (!hasCompoundInput) {
    return [`${pad}${formatNodeInline(node)}`];
  }

  const lines = [`${pad}${node.name}(`];
  for (let index = 0; index < entries.length; index += 1) {
    const [key, value] = entries[index]!;
    const suffix = index < entries.length - 1 ? "," : "";
    const label = `${key}: `;
    if (isSimpleNode(value)) {
      lines.push(`${indent(level + 1)}${label}${formatNodeInline(value)}${suffix}`);
    } else {
      const valueLines = formatNode(value, level + 1);
      lines.push(`${indent(level + 1)}${label}${valueLines[0]!.trimStart()}`);
      for (let lineIndex = 1; lineIndex < valueLines.length; lineIndex += 1) {
        const line = valueLines[lineIndex]!;
        lines.push(
          lineIndex === valueLines.length - 1 ? `${line}${suffix}` : line,
        );
      }
    }
  }
  lines.push(`${pad})`);
  return lines;
}

function formatBinaryMultiline(
  node: Extract<ExpressionNode, { kind: "binary" }>,
  level: number,
): string[] {
  const pad = indent(level);
  if (isSimpleNode(node.left) && isSimpleNode(node.right)) {
    return [`${pad}${formatNodeInline(node)}`];
  }

  const leftLines = isSimpleNode(node.left)
    ? [`${indent(level + 1)}${formatNodeInline(node.left)}`]
    : formatNode(node.left, level + 1);
  const rightLines = isSimpleNode(node.right)
    ? [`${indent(level + 1)}${formatNodeInline(node.right)}`]
    : formatNode(node.right, level + 1);

  return [
    ...leftLines,
    `${pad}  ${node.op}`,
    ...rightLines,
  ];
}

function formatSwitch(
  node: Extract<ExpressionNode, { kind: "switch" }>,
  level: number,
): string[] {
  const pad = indent(level);
  const branchPad = indent(level + 1);
  const bodyPad = indent(level + 2);
  const lines = [`${pad}switch ${formatNodeInline(node.input)} {`];

  for (const entry of node.cases) {
    lines.push(`${branchPad}when ${formatNodeInline(entry.when)}:`);
    const thenLines = formatNode(entry.then, level + 2);
    if (thenLines.length === 1) {
      lines.push(`${bodyPad}${thenLines[0]!.trimStart()}`);
    } else {
      lines.push(...thenLines);
    }
  }

  lines.push(`${branchPad}default:`);
  const defaultLines = formatNode(node.default, level + 2);
  if (defaultLines.length === 1) {
    lines.push(`${bodyPad}${defaultLines[0]!.trimStart()}`);
  } else {
    lines.push(...defaultLines);
  }
  lines.push(`${pad}}`);
  return lines;
}

function formatNode(node: ExpressionNode, level = 0): string[] {
  const pad = indent(level);

  switch (node.kind) {
    case "literal":
    case "field":
    case "var":
    case "input":
      return [`${pad}${formatNodeInline(node)}`];
    case "unary": {
      if (isSimpleNode(node.operand)) {
        return [`${pad}${formatNodeInline(node)}`];
      }
      const operandLines = formatNode(node.operand, level);
      const op = node.op === "!" ? "!" : "-";
      return [`${pad}${op}(`, ...operandLines, `${pad})`];
    }
    case "binary":
      return formatBinaryMultiline(node, level);
    case "call":
      return formatCallMultiline(node, level);
    case "formula":
      return formatFormulaMultiline(node, level);
    case "switch":
      return formatSwitch(node, level);
    default:
      return [`${pad}[expression]`];
  }
}

export function formatExpressionDsl(node: ExpressionNode): string {
  return formatNode(node, 0).join("\n");
}
