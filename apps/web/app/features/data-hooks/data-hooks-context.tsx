import { createContext, useContext, useState, type ReactNode } from "react";

import { useDataHooksEditor } from "./use-data-hooks-editor";

interface DataHooksContextValue {
  readonly editor: ReturnType<typeof useDataHooksEditor>;
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

const DataHooksContext = createContext<DataHooksContextValue | undefined>(
  undefined,
);

interface DataHooksProviderProps {
  readonly scopeEntity?: string;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly children: ReactNode;
}

export function DataHooksProvider({
  scopeEntity,
  canCreate,
  canUpdate,
  canDelete,
  children,
}: DataHooksProviderProps) {
  const editor = useDataHooksEditor(scopeEntity);
  const [metadataEditId, setMetadataEditId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <DataHooksContext.Provider
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
    </DataHooksContext.Provider>
  );
}

export function useDataHooks(): DataHooksContextValue {
  const context = useContext(DataHooksContext);
  if (!context) {
    throw new Error("useDataHooks must be used within DataHooksProvider");
  }
  return context;
}
