import { Form } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type { RootColumnWrapper } from "@repo/ui-builder-renderer";
import { cn } from "@repo/theme/utils";

import { useFormDesigner } from "./form-designer-context";

interface FormDesignerFormPreviewBodyProps {
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly simulateMobileViewport?: boolean;
}

export function FormDesignerFormPreviewBody({
  rootColumnWrapper,
  simulateMobileViewport = false,
}: FormDesignerFormPreviewBodyProps) {
  const { editor, preview } = useFormDesigner();

  const layoutChromeActive = rootColumnWrapper != null;
  const isWizard = editor.presentation === "wizard";
  const useProductionMobileLayout = simulateMobileViewport && isWizard;

  const rendererProps = {
    rootColumnWrapper,
    renderEmptyRootColumns: layoutChromeActive,
    stretchRootColumns: useProductionMobileLayout,
  } as const;

  const formPreviewBody = isWizard ? (
    <RecursiveLayoutRenderer
      layout={editor.wizard.shellLayout}
      context={preview.wizardPreviewContext}
      {...rendererProps}
    />
  ) : (
    <RecursiveLayoutRenderer
      layout={editor.plainLayout}
      context={preview.plainPreviewContext}
      {...rendererProps}
    />
  );

  return (
    <div
      className={cn(
        useProductionMobileLayout
          ? "flex min-h-0 w-full min-w-0 flex-1 flex-col"
          : "w-full",
      )}
    >
      <Form
        className={cn(
          "flex w-full flex-col gap-0",
          useProductionMobileLayout && "h-full min-h-0 min-w-0 flex-1 flex-col",
        )}
      >
        {formPreviewBody}
      </Form>
    </div>
  );
}
