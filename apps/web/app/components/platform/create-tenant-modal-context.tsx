import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CreateTenantModalContextValue {
  readonly open: boolean;
  readonly openCreateTenantModal: () => void;
  readonly closeCreateTenantModal: () => void;
}

const CreateTenantModalContext =
  createContext<CreateTenantModalContextValue | null>(null);

export function CreateTenantModalProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openCreateTenantModal = useCallback(() => {
    setOpen(true);
  }, []);

  const closeCreateTenantModal = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      open,
      openCreateTenantModal,
      closeCreateTenantModal,
    }),
    [closeCreateTenantModal, open, openCreateTenantModal],
  );

  return (
    <CreateTenantModalContext.Provider value={value}>
      {children}
    </CreateTenantModalContext.Provider>
  );
}

export function useCreateTenantModal(): CreateTenantModalContextValue {
  const context = useContext(CreateTenantModalContext);
  if (!context) {
    throw new Error(
      "useCreateTenantModal must be used within CreateTenantModalProvider",
    );
  }
  return context;
}
