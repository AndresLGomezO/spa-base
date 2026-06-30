import type { ReactNode } from "react";
import { Link } from "react-router";

import type { ResolvedComponentClickTarget } from "./resolve-component-click-target.js";

export function wrapComponentClickTarget(
  target: ResolvedComponentClickTarget,
  children: ReactNode,
): ReactNode {
  if (target.external || target.openInNewTab) {
    return (
      <a
        href={target.href}
        target={target.openInNewTab ? "_blank" : undefined}
        rel={target.openInNewTab ? "noopener noreferrer" : undefined}
        className="contents"
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={target.href} state={target.state} className="contents">
      {children}
    </Link>
  );
}
