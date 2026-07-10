import { LayoutStructurePanelBody } from "../ui-builder/LayoutStructurePanelBody";
import { MainViewDesignerComponentColumnPanel } from "./MainViewDesignerComponentColumnPanel";
import { MainViewDesignerComponentRowPanel } from "./MainViewDesignerComponentRowPanel";
import type { MainViewPanelSession } from "./main-view-designer-panel-session";
import { useMainViewDesigner } from "./main-view-designer-context";

interface MainViewStructurePanelBodyProps {
  readonly session: MainViewPanelSession;
}

export function MainViewStructurePanelBody({
  session,
}: MainViewStructurePanelBodyProps) {
  const { editor } = useMainViewDesigner();

  return (
    <LayoutStructurePanelBody layout={editor.layout} target={session.target}>
      {session.target.kind === "column" ? (
        <MainViewDesignerComponentColumnPanel
          columnRef={session.target.columnRef}
        />
      ) : (
        <MainViewDesignerComponentRowPanel rowRef={session.target.rowRef} />
      )}
    </LayoutStructurePanelBody>
  );
}
