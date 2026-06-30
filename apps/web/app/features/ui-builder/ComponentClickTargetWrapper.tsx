import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import type { ResolvedComponentClickTarget } from "@repo/ui-builder-core";

import { useOptionalEntityFormModal } from "../../components/entity/entity-form-modal-context";
import {
  handleComponentClickTarget,
  isEntityFormModalClickTarget,
} from "./handle-component-click-target.js";

interface ComponentClickTargetWrapperProps {
  readonly target: ResolvedComponentClickTarget;
  readonly children: ReactNode;
}

export function ComponentClickTargetWrapper({
  target,
  children,
}: ComponentClickTargetWrapperProps) {
  const modalContext = useOptionalEntityFormModal();

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
