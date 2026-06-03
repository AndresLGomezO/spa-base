import {
  EntityCardListLayoutPreview,
  type EntityCardListLayoutPreviewProps,
} from "./EntityCardListLayoutPreview.js";
import { DockedLayoutPreview } from "./DockedLayoutPreview.js";

interface DockedCardLayoutPreviewProps extends EntityCardListLayoutPreviewProps {
  readonly enabled: boolean;
}

export function DockedCardLayoutPreview({
  enabled,
  ...previewProps
}: DockedCardLayoutPreviewProps) {
  return (
    <DockedLayoutPreview enabled={enabled}>
      <EntityCardListLayoutPreview {...previewProps} />
    </DockedLayoutPreview>
  );
}
