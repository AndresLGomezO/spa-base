import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import { FormDesignerFormPreviewBody } from "./FormDesignerFormPreviewBody";
import { useFormDesigner } from "./form-designer-context";

export function FormDesignerProductionPreviewBody({
  simulateMobileViewport = false,
}: {
  readonly simulateMobileViewport?: boolean;
} = {}) {
  return (
    <FormDesignerFormPreviewBody
      simulateMobileViewport={simulateMobileViewport}
    />
  );
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
