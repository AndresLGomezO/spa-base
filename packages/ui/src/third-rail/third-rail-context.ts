import { createContext, type ReactNode } from "react";

import type { ThirdRailWidthConfig } from "./third-rail-widths";

export interface OpenThirdRailOptions {
  readonly title: string;
  readonly subtitle?: string;
  readonly body: ReactNode;
  readonly footer?: ReactNode;
  /** Default true — push layout; false = overlay */
  readonly resizeContent?: boolean;
  readonly widths?: ThirdRailWidthConfig;
  readonly closeLabel?: string;
  readonly headerActions?: ReactNode;
  /** Visual tone; `ai` applies spark/gradient chrome for AI-authored panels. */
  readonly tone?: "default" | "ai";
  /** Return false to keep the rail open (e.g. unsaved-changes guard). */
  readonly onClose?: () => void | boolean;
}

export interface ThirdRailContextValue {
  readonly isOpen: boolean;
  readonly options: OpenThirdRailOptions | null;
  readonly open: (options: OpenThirdRailOptions) => void;
  readonly close: () => void;
  readonly update: (patch: Partial<OpenThirdRailOptions>) => void;
}

export const ThirdRailContext = createContext<ThirdRailContextValue | null>(
  null,
);
