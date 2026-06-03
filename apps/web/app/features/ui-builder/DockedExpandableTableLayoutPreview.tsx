import { DockedLayoutPreview } from "./DockedLayoutPreview.js";
import {
  EntityExpandableTableLayoutPreview,
  type EntityExpandableTableLayoutPreviewProps,
} from "./EntityExpandableTableLayoutPreview.js";

interface DockedExpandableTableLayoutPreviewProps extends EntityExpandableTableLayoutPreviewProps {
  readonly enabled: boolean;
}

export function DockedExpandableTableLayoutPreview({
  enabled,
  ...previewProps
}: DockedExpandableTableLayoutPreviewProps) {
  return (
    <DockedLayoutPreview enabled={enabled}>
      <EntityExpandableTableLayoutPreview {...previewProps} />
    </DockedLayoutPreview>
  );
}
