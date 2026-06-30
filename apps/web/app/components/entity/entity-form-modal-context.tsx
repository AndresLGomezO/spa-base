import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { EntityName } from "../../entities/entity-catalog";

export interface EntityFormModalRequest {
  readonly entityName: EntityName;
  readonly mode: "create" | "edit";
  readonly recordId?: string;
  readonly createPrefill?: Readonly<Record<string, string>>;
  readonly onClose?: () => void;
}

interface EntityFormModalContextValue {
  readonly request: EntityFormModalRequest | null;
  readonly session: number;
  readonly openEntityFormModal: (request: EntityFormModalRequest) => void;
  readonly closeEntityFormModal: () => void;
}

const EntityFormModalContext =
  createContext<EntityFormModalContextValue | null>(null);

export function EntityFormModalProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [request, setRequest] = useState<EntityFormModalRequest | null>(null);
  const [session, setSession] = useState(0);

  const openEntityFormModal = useCallback((next: EntityFormModalRequest) => {
    setSession((value) => value + 1);
    setRequest(next);
  }, []);

  const closeEntityFormModal = useCallback(() => {
    setRequest((current) => {
      current?.onClose?.();
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({
      request,
      session,
      openEntityFormModal,
      closeEntityFormModal,
    }),
    [closeEntityFormModal, openEntityFormModal, request, session],
  );

  return (
    <EntityFormModalContext.Provider value={value}>
      {children}
    </EntityFormModalContext.Provider>
  );
}

export function useEntityFormModal(): EntityFormModalContextValue {
  const context = useContext(EntityFormModalContext);
  if (!context) {
    throw new Error(
      "useEntityFormModal must be used within EntityFormModalProvider",
    );
  }
  return context;
}

export function useOptionalEntityFormModal(): EntityFormModalContextValue | null {
  return useContext(EntityFormModalContext);
}
