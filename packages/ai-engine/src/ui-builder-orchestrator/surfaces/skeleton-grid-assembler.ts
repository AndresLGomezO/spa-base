import {
  createLayoutId,
  type ComponentRowNode,
  type RowNode,
} from "@repo/ui-builder-core";

import type { SkeletonComponentSpec } from "../types.js";

function readGridTracks(spec: SkeletonComponentSpec) {
  return spec.tracks ?? spec.columns ?? [];
}

export function isGridSkeletonSpec(spec: SkeletonComponentSpec): boolean {
  return spec.kind === "grid" || spec.kind === "nested-layout";
}

export function buildGridRowFromSkeleton(
  spec: SkeletonComponentSpec,
  buildInnerRows: (
    components: readonly SkeletonComponentSpec[],
    path: string,
  ) => RowNode[],
  path: string,
): ComponentRowNode {
  const tracks = readGridTracks(spec);
  const trackCount =
    tracks.length > 0
      ? tracks.length
      : Math.max(1, spec.trackCount ?? spec.columnCount ?? 1);

  const trackRows: ComponentRowNode[] = Array.from(
    { length: trackCount },
    (_, trackIndex) => {
      const track = tracks[trackIndex];
      return {
        type: "component",
        id: createLayoutId("row"),
        component: {
          kind: "container",
          rows: track
            ? buildInnerRows(track.components, `${path}/track${trackIndex}`)
            : [],
        },
      };
    },
  );

  return {
    type: "component",
    id: createLayoutId("row"),
    component: {
      kind: "grid",
      gridTemplateColumns: `repeat(${trackRows.length}, 1fr)`,
      rows: trackRows,
    },
    ...(spec.displayFrom ? { displayFrom: spec.displayFrom } : {}),
    ...(spec.displayTo ? { displayTo: spec.displayTo } : {}),
  };
}
