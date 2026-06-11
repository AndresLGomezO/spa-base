import { useContext } from "react";

import {
  ThirdRailContext,
  type OpenThirdRailOptions,
  type ThirdRailContextValue,
} from "./third-rail-context";

export type { OpenThirdRailOptions, ThirdRailContextValue };

export function useThirdRail(): ThirdRailContextValue {
  const context = useContext(ThirdRailContext);
  if (!context) {
    throw new Error("useThirdRail must be used within ThirdRailProvider");
  }

  return context;
}
