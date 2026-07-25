import { createContext, useContext, useState, type ReactNode } from "react";

import { useUserAiContextEditor } from "./use-user-ai-context-editor";

interface UserAiContextContextValue {
  readonly editor: ReturnType<typeof useUserAiContextEditor>;
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

const UserAiContextContext = createContext<
  UserAiContextContextValue | undefined
>(undefined);

interface UserAiContextProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly children: ReactNode;
}

export function UserAiContextProvider({
  canCreate,
  canUpdate,
  canDelete,
  children,
}: UserAiContextProviderProps) {
  const editor = useUserAiContextEditor();
  const [metadataEditId, setMetadataEditId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <UserAiContextContext.Provider
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
    </UserAiContextContext.Provider>
  );
}

export function useUserAiContext(): UserAiContextContextValue {
  const context = useContext(UserAiContextContext);
  if (!context) {
    throw new Error(
      "useUserAiContext must be used within UserAiContextProvider",
    );
  }
  return context;
}
