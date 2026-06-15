import { describe, expect, it } from "vitest";
import { createEmptyLayout } from "@repo/ui-builder-core";

import {
  areLayoutSnapshotsEqual,
  areSectionsSnapshotsEqual,
  readLayoutSnapshot,
  readSectionsSnapshot,
} from "./dashboard-layout-designer-snapshots";
import { createDefaultDashboardSection } from "../ui-builder/create-default-dashboard-section";
import { createDefaultDashboardLayout } from "../ui-builder/create-default-dashboard-layout";

describe("dashboard layout designer snapshots", () => {
  it("detects section snapshot changes", () => {
    const left = readSectionsSnapshot({
      dashboardSections: [createDefaultDashboardSection("Overview")],
    });

    const right = readSectionsSnapshot({
      dashboardSections: [
        {
          ...left.dashboardSections[0]!,
          name: "Updated",
        },
      ],
    });

    expect(areSectionsSnapshotsEqual(left, left)).toBe(true);
    expect(areSectionsSnapshotsEqual(left, right)).toBe(false);
  });

  it("detects layout snapshot changes", () => {
    const left = readLayoutSnapshot({
      dashboardLayout: createDefaultDashboardLayout(),
    });

    const right = readLayoutSnapshot({
      dashboardLayout: createEmptyLayout(2),
    });

    expect(areLayoutSnapshotsEqual(left, left)).toBe(true);
    expect(areLayoutSnapshotsEqual(left, right)).toBe(false);
  });
});
