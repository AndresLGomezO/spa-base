import { LayoutStructurePanelBody } from "../ui-builder/LayoutStructurePanelBody";
import { DetailViewDesignerComponentColumnPanel } from "./DetailViewDesignerComponentColumnPanel";
import { DetailViewDesignerComponentRowPanel } from "./DetailViewDesignerComponentRowPanel";
import type { DetailViewPanelSession } from "./detail-view-designer-panel-session";
import { useDetailViewDesigner } from "./detail-view-designer-context";

interface DetailViewStructurePanelBodyProps {
  readonly session: DetailViewPanelSession;
}

export function DetailViewStructurePanelBody({
  session,
}: DetailViewStructurePanelBodyProps) {
  const { editor } = useDetailViewDesigner();

  return (
    <LayoutStructurePanelBody layout={editor.layout} target={session.target}>
      {session.target.kind === "column" ? (
        <DetailViewDesignerComponentColumnPanel
          columnRef={session.target.columnRef}
        />
      ) : (
        <DetailViewDesignerComponentRowPanel rowRef={session.target.rowRef} />
      )}
    </LayoutStructurePanelBody>
  );
}
