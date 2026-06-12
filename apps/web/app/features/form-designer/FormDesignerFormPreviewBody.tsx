import { Form } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type { RootColumnWrapper } from "@repo/ui-builder-renderer";

import { useFormDesigner } from "./form-designer-context";

interface FormDesignerFormPreviewBodyProps {
  readonly rootColumnWrapper?: RootColumnWrapper;
}

export function FormDesignerFormPreviewBody({
  rootColumnWrapper,
}: FormDesignerFormPreviewBodyProps) {
  const { editor, preview } = useFormDesigner();

  const layoutChromeActive = rootColumnWrapper != null;

  const rendererProps = {
    rootColumnWrapper,
    renderEmptyRootColumns: layoutChromeActive,
    stretchRootColumns: false,
  } as const;

  const formPreviewBody =
    editor.presentation === "wizard" ? (
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
    <div className="w-full">
      <Form className="flex w-full flex-col gap-0">{formPreviewBody}</Form>
    </div>
  );
}
