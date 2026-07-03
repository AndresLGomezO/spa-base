import type { ExpressionNode } from "@repo/hooks";

import {
  formatNodeInline,
  isSimpleNode,
} from "./format-expression-dsl-preview";

interface FormulaExpressionInteractivePreviewProps {
  readonly value: ExpressionNode;
  readonly catalogNames: ReadonlySet<string>;
  readonly onFormulaClick: (formulaName: string) => void;
}

function FormulaReference({
  name,
  catalogNames,
  onFormulaClick,
}: {
  readonly name: string;
  readonly catalogNames: ReadonlySet<string>;
  readonly onFormulaClick: (formulaName: string) => void;
}) {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return <span>?</span>;
  }

  if (!catalogNames.has(trimmed)) {
    return <span>{trimmed}</span>;
  }

  return (
    <button
      type="button"
      className="text-primary hover:text-primary/80 font-inherit cursor-pointer font-mono underline underline-offset-2"
      onClick={() => onFormulaClick(trimmed)}
    >
      {trimmed}
    </button>
  );
}

function InlineExpressionView({
  node,
  catalogNames,
  onFormulaClick,
}: {
  readonly node: ExpressionNode;
  readonly catalogNames: ReadonlySet<string>;
  readonly onFormulaClick: (formulaName: string) => void;
}) {
  switch (node.kind) {
    case "literal":
    case "field":
    case "var":
    case "input":
      return <>{formatNodeInline(node)}</>;
    case "unary":
      return (
        <>
          {node.op === "!" ? "!" : "-"}
          <InlineExpressionView
            node={node.operand}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
        </>
      );
    case "binary":
      return (
        <>
          <InlineExpressionView
            node={node.left}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
          {` ${node.op} `}
          <InlineExpressionView
            node={node.right}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
        </>
      );
    case "call":
      return (
        <>
          {node.fn}(
          {node.args.map((arg, index) => (
            <span key={index}>
              {index > 0 ? ", " : ""}
              <InlineExpressionView
                node={arg}
                catalogNames={catalogNames}
                onFormulaClick={onFormulaClick}
              />
            </span>
          ))}
          )
        </>
      );
    case "formula": {
      const entries = Object.entries(node.inputs);
      return (
        <>
          <FormulaReference
            name={node.name}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
          (
          {entries.map(([key, value], index) => (
            <span key={key}>
              {index > 0 ? ", " : ""}
              {key}:{" "}
              <InlineExpressionView
                node={value}
                catalogNames={catalogNames}
                onFormulaClick={onFormulaClick}
              />
            </span>
          ))}
          )
        </>
      );
    }
    default:
      return <>{formatNodeInline(node)}</>;
  }
}

function ExpressionNodeView({
  node,
  depth,
  catalogNames,
  onFormulaClick,
}: {
  readonly node: ExpressionNode;
  readonly depth: number;
  readonly catalogNames: ReadonlySet<string>;
  readonly onFormulaClick: (formulaName: string) => void;
}) {
  const pad = depth > 0 ? { paddingLeft: `${depth * 1}rem` } : undefined;

  switch (node.kind) {
    case "literal":
    case "field":
    case "var":
    case "input":
      return (
        <div style={pad} className="font-mono text-xs whitespace-pre-wrap">
          {formatNodeInline(node)}
        </div>
      );
    case "unary": {
      if (isSimpleNode(node.operand)) {
        return (
          <div style={pad} className="font-mono text-xs whitespace-pre-wrap">
            <InlineExpressionView
              node={node}
              catalogNames={catalogNames}
              onFormulaClick={onFormulaClick}
            />
          </div>
        );
      }
      const op = node.op === "!" ? "!" : "-";
      return (
        <div style={pad} className="font-mono text-xs">
          <div>{op}(</div>
          <ExpressionNodeView
            node={node.operand}
            depth={depth + 1}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
          <div>)</div>
        </div>
      );
    }
    case "binary": {
      if (isSimpleNode(node.left) && isSimpleNode(node.right)) {
        return (
          <div style={pad} className="font-mono text-xs whitespace-pre-wrap">
            <InlineExpressionView
              node={node}
              catalogNames={catalogNames}
              onFormulaClick={onFormulaClick}
            />
          </div>
        );
      }
      return (
        <div style={pad} className="font-mono text-xs">
          <ExpressionNodeView
            node={node.left}
            depth={depth + 1}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
          <div style={{ paddingLeft: `${(depth + 1) * 1}rem` }}>{node.op}</div>
          <ExpressionNodeView
            node={node.right}
            depth={depth + 1}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
        </div>
      );
    }
    case "call": {
      const hasCompoundArg = node.args.some((arg) => !isSimpleNode(arg));
      if (!hasCompoundArg) {
        return (
          <div style={pad} className="font-mono text-xs whitespace-pre-wrap">
            <InlineExpressionView
              node={node}
              catalogNames={catalogNames}
              onFormulaClick={onFormulaClick}
            />
          </div>
        );
      }
      return (
        <div style={pad} className="font-mono text-xs">
          <div>{node.fn}(</div>
          {node.args.map((arg, index) => (
            <div key={index}>
              <ExpressionNodeView
                node={arg}
                depth={depth + 1}
                catalogNames={catalogNames}
                onFormulaClick={onFormulaClick}
              />
              {index < node.args.length - 1 ? "," : null}
            </div>
          ))}
          <div>)</div>
        </div>
      );
    }
    case "formula": {
      const entries = Object.entries(node.inputs);
      if (entries.length === 0) {
        return (
          <div style={pad} className="font-mono text-xs">
            <FormulaReference
              name={node.name}
              catalogNames={catalogNames}
              onFormulaClick={onFormulaClick}
            />
          </div>
        );
      }

      const hasCompoundInput = entries.some(
        ([, value]) => !isSimpleNode(value),
      );
      if (!hasCompoundInput) {
        return (
          <div style={pad} className="font-mono text-xs whitespace-pre-wrap">
            <InlineExpressionView
              node={node}
              catalogNames={catalogNames}
              onFormulaClick={onFormulaClick}
            />
          </div>
        );
      }

      return (
        <div style={pad} className="font-mono text-xs">
          <div>
            <FormulaReference
              name={node.name}
              catalogNames={catalogNames}
              onFormulaClick={onFormulaClick}
            />
            (
          </div>
          {entries.map(([key, value], index) => (
            <div key={key}>
              <div style={{ paddingLeft: `${(depth + 1) * 1}rem` }}>
                {key}:{" "}
                {isSimpleNode(value) ? (
                  <InlineExpressionView
                    node={value}
                    catalogNames={catalogNames}
                    onFormulaClick={onFormulaClick}
                  />
                ) : (
                  <ExpressionNodeView
                    node={value}
                    depth={depth + 1}
                    catalogNames={catalogNames}
                    onFormulaClick={onFormulaClick}
                  />
                )}
                {index < entries.length - 1 ? "," : null}
              </div>
            </div>
          ))}
          <div>)</div>
        </div>
      );
    }
    case "switch":
      return (
        <div style={pad} className="font-mono text-xs">
          <div>
            switch{" "}
            <InlineExpressionView
              node={node.input}
              catalogNames={catalogNames}
              onFormulaClick={onFormulaClick}
            />{" "}
            {"{"}
          </div>
          {node.cases.map((entry, index) => (
            <div key={index}>
              <div style={{ paddingLeft: `${(depth + 1) * 1}rem` }}>
                when{" "}
                <InlineExpressionView
                  node={entry.when}
                  catalogNames={catalogNames}
                  onFormulaClick={onFormulaClick}
                />
                :
              </div>
              <ExpressionNodeView
                node={entry.then}
                depth={depth + 2}
                catalogNames={catalogNames}
                onFormulaClick={onFormulaClick}
              />
            </div>
          ))}
          <div style={{ paddingLeft: `${(depth + 1) * 1}rem` }}>default:</div>
          <ExpressionNodeView
            node={node.default}
            depth={depth + 2}
            catalogNames={catalogNames}
            onFormulaClick={onFormulaClick}
          />
          <div>{"}"}</div>
        </div>
      );
    default:
      return (
        <div style={pad} className="font-mono text-xs whitespace-pre-wrap">
          [expression]
        </div>
      );
  }
}

export function FormulaExpressionInteractivePreview({
  value,
  catalogNames,
  onFormulaClick,
}: FormulaExpressionInteractivePreviewProps) {
  return (
    <div className="bg-muted max-h-64 overflow-auto rounded-md p-3">
      <ExpressionNodeView
        node={value}
        depth={0}
        catalogNames={catalogNames}
        onFormulaClick={onFormulaClick}
      />
    </div>
  );
}
