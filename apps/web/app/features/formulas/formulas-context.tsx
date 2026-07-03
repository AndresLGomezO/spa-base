import { createContext, useContext, useState, type ReactNode } from "react";

import { useFormulasEditor } from "./use-formulas-editor";

interface FormulasContextValue {
  readonly editor: ReturnType<typeof useFormulasEditor>;
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

const FormulasContext = createContext<FormulasContextValue | undefined>(
  undefined,
);

interface FormulasProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly children: ReactNode;
}

export function FormulasProvider({
  canCreate,
  canUpdate,
  canDelete,
  children,
}: FormulasProviderProps) {
  const editor = useFormulasEditor();
  const [metadataEditId, setMetadataEditId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <FormulasContext.Provider
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
    </FormulasContext.Provider>
  );
}

export function useFormulas(): FormulasContextValue {
  const context = useContext(FormulasContext);
  if (!context) {
    throw new Error("useFormulas must be used within FormulasProvider");
  }
  return context;
}
