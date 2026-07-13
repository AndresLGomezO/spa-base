import { createContext, useContext, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import type { ResolvedComponentClickTarget } from "@repo/ui-builder-core";

import { useOptionalEntityFormModal } from "../../components/entity/entity-form-modal-context";
import {
  handleComponentClickTarget,
  isEntityFormModalClickTarget,
} from "./handle-component-click-target.js";

/** Styles relation field values without affecting labels or non-relation click targets. */
const RELATION_LINK_WRAPPER_CLASS =
  "contents cursor-pointer [&_[data-card-field-value]]:text-primary [&_[data-card-field-value]]:underline-offset-4 hover:[&_[data-card-field-value]]:underline";

const InsideComponentClickLinkContext = createContext(false);

interface ComponentClickTargetWrapperProps {
  readonly target: ResolvedComponentClickTarget;
  readonly children: ReactNode;
  readonly linkAppearance?: boolean;
}

export function ComponentClickTargetWrapper({
  target,
  children,
  linkAppearance = false,
}: ComponentClickTargetWrapperProps) {
  const modalContext = useOptionalEntityFormModal();
  const insideAncestorLink = useContext(InsideComponentClickLinkContext);
  const linkWrapperClassName = linkAppearance
    ? RELATION_LINK_WRAPPER_CLASS
    : "contents";

  // Nested <a>/<Link> is invalid HTML and breaks hydration; keep the outer link only.
  if (insideAncestorLink) {
    return children;
  }

  if (isEntityFormModalClickTarget(target)) {
    return (
      <div
        role="link"
        tabIndex={0}
        className="contents cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          handleComponentClickTarget(target, {
            openEntityFormModal: modalContext?.openEntityFormModal,
          });
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          handleComponentClickTarget(target, {
            openEntityFormModal: modalContext?.openEntityFormModal,
          });
        }}
      >
        {children}
      </div>
    );
  }

  if (target.external || target.openInNewTab) {
    return (
      <InsideComponentClickLinkContext.Provider value={true}>
        <a
          href={target.href}
          target={target.openInNewTab ? "_blank" : undefined}
          rel={target.openInNewTab ? "noopener noreferrer" : undefined}
          className={linkWrapperClassName}
        >
          {children}
        </a>
      </InsideComponentClickLinkContext.Provider>
    );
  }

  return (
    <InsideComponentClickLinkContext.Provider value={true}>
      <Link
        to={target.href}
        state={target.state}
        className={linkWrapperClassName}
      >
        {children}
      </Link>
    </InsideComponentClickLinkContext.Provider>
  );
}

export function useNavigateComponentClick():
  | ((target: ResolvedComponentClickTarget) => void)
  | undefined {
  const navigate = useNavigate();
  const modalContext = useOptionalEntityFormModal();

  if (!modalContext && !navigate) {
    return undefined;
  }

  return (target) => {
    handleComponentClickTarget(target, {
      navigate,
      openEntityFormModal: modalContext?.openEntityFormModal,
    });
  };
}
