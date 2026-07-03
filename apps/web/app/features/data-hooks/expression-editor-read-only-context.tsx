import { createContext, useContext, type ReactNode } from "react";

const ExpressionEditorReadOnlyContext = createContext(false);

export function ExpressionEditorReadOnlyProvider({
  readOnly,
  children,
}: {
  readonly readOnly: boolean;
  readonly children: ReactNode;
}) {
  return (
    <ExpressionEditorReadOnlyContext.Provider value={readOnly}>
      {children}
    </ExpressionEditorReadOnlyContext.Provider>
  );
}

export function useExpressionEditorReadOnly(): boolean {
  return useContext(ExpressionEditorReadOnlyContext);
}
