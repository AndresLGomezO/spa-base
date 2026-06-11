import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import { FormDesignerFormPreviewBody } from "./FormDesignerFormPreviewBody";
import { useFormDesigner } from "./form-designer-context";

export function FormDesignerProductionPreviewBody() {
  return <FormDesignerFormPreviewBody />;
}

export function FormDesignerProductionPreviewContent() {
  const { previewBreakpoint } = useFormDesigner();

  return (
    <LayoutPreviewViewport
      breakpoint={previewBreakpoint}
      showFrame={false}
      className="h-full"
    >
      <FormDesignerProductionPreviewBody />
    </LayoutPreviewViewport>
  );
}
