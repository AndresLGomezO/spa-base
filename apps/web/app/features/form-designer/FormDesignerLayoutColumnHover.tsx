import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface FormDesignerLayoutColumnHoverContextValue {
  readonly hoveredColumnIndex: number | null;
  readonly setHoveredColumnIndex: (columnIndex: number | null) => void;
}

const FormDesignerLayoutColumnHoverContext =
  createContext<FormDesignerLayoutColumnHoverContextValue | null>(null);

export function FormDesignerLayoutColumnHoverProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState<number | null>(
    null,
  );

  const value = useMemo(
    () => ({
      hoveredColumnIndex,
      setHoveredColumnIndex,
    }),
    [hoveredColumnIndex],
  );

  return (
    <FormDesignerLayoutColumnHoverContext.Provider value={value}>
      {children}
    </FormDesignerLayoutColumnHoverContext.Provider>
  );
}

export function useFormDesignerLayoutColumnHover(): FormDesignerLayoutColumnHoverContextValue | null {
  return useContext(FormDesignerLayoutColumnHoverContext);
}
