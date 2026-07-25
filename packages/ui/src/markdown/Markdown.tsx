import {
  Children,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@repo/theme/utils";

export type MarkdownBlockRenderer = (raw: string) => ReactNode;

export interface MarkdownProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Markdown source string to render. */
  readonly children: string;
  /**
   * Optional map of fenced-code language → renderer.
   * Keys match the language after `language-` (e.g. `chart-pie` for
   * ```chart-pie). Renderer failures or `null` omit the block silently.
   */
  readonly blockRenderers?: Readonly<Record<string, MarkdownBlockRenderer>>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Promote mid-paragraph fenced blocks (e.g. `…text. ```chart-pie`) into
 * CommonMark block fences so `blockRenderers` can match them.
 *
 * Closing fences must end the line (` ``` ` then newline/EOF). Otherwise a
 * following opener like ` ```chart-pie` is mistaken for the closer (same
 * leading backticks) and the language line gets split onto its own paragraph.
 */
export function ensureBlockRendererFences(
  markdown: string,
  languages: readonly string[],
): string {
  if (markdown.length === 0 || languages.length === 0) {
    return markdown;
  }
  const langAlt = languages.map(escapeRegExp).join("|");
  if (!langAlt) {
    return markdown;
  }
  // Open: ```lang\n … Close: \n``` at EOL (not ```lang of the next fence).
  const fence =
    "```(?:" + langAlt + ")\\r?\\n[\\s\\S]*?\\r?\\n```[ \\t]*(?=\\r?\\n|$)";
  let next = markdown.replace(
    new RegExp(`([^\\n])[ \\t]*(${fence})`, "g"),
    "$1\n\n$2",
  );
  next = next.replace(new RegExp(`(${fence})(?=\\S)`, "g"), "$1\n\n");
  return next.replace(/\n{3,}/g, "\n\n");
}

function extractFencedCode(
  children: ReactNode,
): { readonly language: string | null; readonly raw: string } | null {
  const nodes = Children.toArray(children);
  if (nodes.length !== 1 || !isValidElement(nodes[0])) {
    return null;
  }
  const props = nodes[0].props as {
    readonly className?: string;
    readonly children?: ReactNode;
  };
  const className = typeof props.className === "string" ? props.className : "";
  const match = /(?:^|\s)language-([\w-]+)(?:\s|$)/.exec(className);
  const language = match?.[1] ?? null;
  const raw = String(props.children ?? "").replace(/\n$/, "");
  return { language, raw };
}

function tryRenderBlock(
  language: string,
  raw: string,
  blockRenderers: Readonly<Record<string, MarkdownBlockRenderer>>,
): ReactNode | undefined {
  const renderer = blockRenderers[language];
  if (!renderer) {
    return undefined;
  }
  try {
    const node = renderer(raw);
    if (node == null) {
      return null;
    }
    return <div className="my-2">{node}</div>;
  } catch {
    return null;
  }
}

/**
 * App-wide Markdown interpreter (GFM: tables, lists, strikethrough, etc.).
 * Use for any field or content surface that stores Markdown.
 */
export function Markdown({
  children,
  className,
  blockRenderers,
  ...props
}: MarkdownProps) {
  const source =
    blockRenderers && Object.keys(blockRenderers).length > 0
      ? ensureBlockRendererFences(children, Object.keys(blockRenderers))
      : children;

  return (
    <div
      className={cn(
        "markdown text-foreground max-w-none space-y-3 text-sm leading-relaxed",
        className,
      )}
      {...props}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: heading }) => (
            <h1 className="text-foreground mt-5 text-lg font-semibold tracking-tight first:mt-0">
              {heading}
            </h1>
          ),
          h2: ({ children: heading }) => (
            <h2 className="text-foreground border-border/60 mt-5 border-b pb-1.5 text-base font-semibold tracking-tight first:mt-0">
              {heading}
            </h2>
          ),
          h3: ({ children: heading }) => (
            <h3 className="text-foreground/90 mt-4 text-sm font-semibold first:mt-0">
              {heading}
            </h3>
          ),
          p: ({ children: paragraph }) => (
            <p className="text-foreground/90">{paragraph}</p>
          ),
          blockquote: ({ children: quote }) => (
            <blockquote className="border-primary/40 bg-muted/40 text-foreground/90 my-1 rounded-r-md border-l-2 py-2 pl-3 pr-2 text-sm">
              {quote}
            </blockquote>
          ),
          ul: ({ children: list }) => (
            <ul className="list-disc space-y-1.5 pl-5">{list}</ul>
          ),
          ol: ({ children: list }) => (
            <ol className="list-decimal space-y-1.5 pl-5">{list}</ol>
          ),
          li: ({ children: item }) => (
            <li className="text-foreground/90 marker:text-muted-foreground">
              {item}
            </li>
          ),
          strong: ({ children: strong }) => (
            <strong className="text-foreground font-semibold">{strong}</strong>
          ),
          hr: () => <hr className="border-border/70 my-4" />,
          table: ({ children: table }) => (
            <div className="border-border bg-muted/20 my-1 overflow-x-auto rounded-md border">
              <table className="w-full border-collapse text-left text-sm">
                {table}
              </table>
            </div>
          ),
          thead: ({ children: thead }) => (
            <thead className="bg-muted/50 border-border border-b">
              {thead}
            </thead>
          ),
          th: ({ children: th }) => (
            <th className="text-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
              {th}
            </th>
          ),
          td: ({ children: td }) => (
            <td className="border-border/60 text-foreground/90 border-t px-3 py-2">
              {td}
            </td>
          ),
          code: ({
            className: codeClassName,
            children: code,
            ...codeProps
          }) => {
            const isBlock = Boolean(codeClassName);
            if (isBlock) {
              return (
                <code
                  className={cn(
                    "bg-transparent font-mono text-xs leading-relaxed",
                    codeClassName,
                  )}
                  {...codeProps}
                >
                  {code}
                </code>
              );
            }
            return (
              <code
                className="bg-muted rounded px-1 py-0.5 font-mono text-xs tracking-tight"
                {...codeProps}
              >
                {code}
              </code>
            );
          },
          pre: ({ children: preChildren }) => {
            if (blockRenderers) {
              const extracted = extractFencedCode(preChildren);
              if (extracted?.language) {
                const rendered = tryRenderBlock(
                  extracted.language,
                  extracted.raw,
                  blockRenderers,
                );
                if (rendered !== undefined) {
                  return rendered;
                }
              }
            }
            return (
              <pre className="border-border bg-muted/40 my-1 overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs leading-relaxed">
                {preChildren}
              </pre>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
