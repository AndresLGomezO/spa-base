import { createContext, useContext, useState, type ReactNode } from "react";

import { useEmailMatchingEditor } from "./use-email-matching-editor";

interface EmailMatchingContextValue {
  readonly editor: ReturnType<typeof useEmailMatchingEditor>;
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

const EmailMatchingContext = createContext<
  EmailMatchingContextValue | undefined
>(undefined);

interface EmailMatchingProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly children: ReactNode;
}

export function EmailMatchingProvider({
  canCreate,
  canUpdate,
  canDelete,
  children,
}: EmailMatchingProviderProps) {
  const editor = useEmailMatchingEditor();
  const [metadataEditId, setMetadataEditId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <EmailMatchingContext.Provider
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
    </EmailMatchingContext.Provider>
  );
}

export function useEmailMatching(): EmailMatchingContextValue {
  const context = useContext(EmailMatchingContext);
  if (!context) {
    throw new Error(
      "useEmailMatching must be used within EmailMatchingProvider",
    );
  }
  return context;
}
