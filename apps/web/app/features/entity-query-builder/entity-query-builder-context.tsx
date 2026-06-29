import { createContext, useContext, useState, type ReactNode } from "react";

import { useEntityQueryBuilderEditor } from "./use-entity-query-builder-editor";

interface EntityQueryBuilderContextValue {
  readonly editor: ReturnType<typeof useEntityQueryBuilderEditor>;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly metadataEditId: string | null;
  readonly deleteTargetId: string | null;
  readonly requestMetadataEdit: (id: string) => void;
  readonly requestDelete: (id: string) => void;
  readonly closeMetadataEdit: () => void;
  readonly closeDeleteConfirm: () => void;
}

const EntityQueryBuilderContext = createContext<
  EntityQueryBuilderContextValue | undefined
>(undefined);

interface EntityQueryBuilderProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly children: ReactNode;
}

export function EntityQueryBuilderProvider({
  canCreate,
  canUpdate,
  canDelete,
  children,
}: EntityQueryBuilderProviderProps) {
  const editor = useEntityQueryBuilderEditor();
  const [metadataEditId, setMetadataEditId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <EntityQueryBuilderContext.Provider
      value={{
        editor,
        canCreate,
        canUpdate,
        canDelete,
        metadataEditId,
        deleteTargetId,
        requestMetadataEdit: setMetadataEditId,
        requestDelete: setDeleteTargetId,
        closeMetadataEdit: () => setMetadataEditId(null),
        closeDeleteConfirm: () => setDeleteTargetId(null),
      }}
    >
      {children}
    </EntityQueryBuilderContext.Provider>
  );
}

export function useEntityQueryBuilder(): EntityQueryBuilderContextValue {
  const context = useContext(EntityQueryBuilderContext);
  if (!context) {
    throw new Error(
      "useEntityQueryBuilder must be used within EntityQueryBuilderProvider",
    );
  }
  return context;
}
