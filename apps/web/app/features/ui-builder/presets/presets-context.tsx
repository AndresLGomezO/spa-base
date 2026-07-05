import { createContext, useContext, useState, type ReactNode } from "react";

import type { PresetCatalogEntryId } from "./preset-catalog-entry";
import { usePresetsEditor } from "./use-presets-editor";

interface PresetsContextValue {
  readonly editor: ReturnType<typeof usePresetsEditor>;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly createModalOpen: boolean;
  readonly deleteTargetId: PresetCatalogEntryId | null;
  readonly openCreateModal: () => void;
  readonly closeCreateModal: () => void;
  readonly requestDelete: (id: PresetCatalogEntryId) => void;
  readonly closeDeleteConfirm: () => void;
}

const PresetsContext = createContext<PresetsContextValue | undefined>(
  undefined,
);

interface PresetsProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly children: ReactNode;
}

export function PresetsProvider({
  canCreate,
  canUpdate,
  canDelete,
  children,
}: PresetsProviderProps) {
  const editor = usePresetsEditor();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] =
    useState<PresetCatalogEntryId | null>(null);

  return (
    <PresetsContext.Provider
      value={{
        editor,
        canCreate,
        canUpdate,
        canDelete,
        createModalOpen,
        deleteTargetId,
        openCreateModal: () => setCreateModalOpen(true),
        closeCreateModal: () => setCreateModalOpen(false),
        requestDelete: setDeleteTargetId,
        closeDeleteConfirm: () => setDeleteTargetId(null),
      }}
    >
      {children}
    </PresetsContext.Provider>
  );
}

export function usePresets(): PresetsContextValue {
  const context = useContext(PresetsContext);
  if (!context) {
    throw new Error("usePresets must be used within PresetsProvider");
  }
  return context;
}
