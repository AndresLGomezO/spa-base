import { createContext, useContext, useState, type ReactNode } from "react";

import { useCustomViewsEditor } from "./use-custom-views-editor";

interface CustomViewsContextValue {
  readonly editor: ReturnType<typeof useCustomViewsEditor>;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly deleteTargetId: string | null;
  readonly requestDelete: (id: string) => void;
  readonly closeDeleteConfirm: () => void;
}

const CustomViewsContext = createContext<CustomViewsContextValue | undefined>(
  undefined,
);

interface CustomViewsProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly children: ReactNode;
}

export function CustomViewsProvider({
  canCreate,
  canUpdate,
  canDelete,
  children,
}: CustomViewsProviderProps) {
  const editor = useCustomViewsEditor();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <CustomViewsContext.Provider
      value={{
        editor,
        canCreate,
        canUpdate,
        canDelete,
        deleteTargetId,
        requestDelete: setDeleteTargetId,
        closeDeleteConfirm: () => setDeleteTargetId(null),
      }}
    >
      {children}
    </CustomViewsContext.Provider>
  );
}

export function useCustomViews(): CustomViewsContextValue {
  const context = useContext(CustomViewsContext);
  if (!context) {
    throw new Error("useCustomViews must be used within CustomViewsProvider");
  }
  return context;
}
