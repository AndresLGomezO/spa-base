import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Clock,
  Hourglass,
  Info,
  Layers,
  Loader2,
  MinusCircle,
  Percent,
  Timer,
  Users,
  XCircle,
} from "lucide-react";

import { Card, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  DEBUGGER_CHART_CARD_CLASS,
  DEBUGGER_KPI_TILE_CLASS,
} from "../debugger-summary-motion";

export interface DebuggerKpiItem {
  readonly key: string;
  readonly label: string;
  readonly value: string | number;
}

const KPI_ICON_CONFIG: Record<
  string,
  {
    readonly icon: LucideIcon;
    readonly iconClass: string;
    readonly spin?: boolean;
  }
> = {
  total: {
    icon: Layers,
    iconClass: "bg-muted text-muted-foreground",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "bg-badge-success text-badge-success-foreground",
  },
  completed: {
    icon: CheckCircle2,
    iconClass: "bg-badge-success text-badge-success-foreground",
  },
  error: {
    icon: XCircle,
    iconClass: "bg-badge-danger text-badge-danger-foreground",
  },
  failed: {
    icon: XCircle,
    iconClass: "bg-badge-danger text-badge-danger-foreground",
  },
  errors: {
    icon: XCircle,
    iconClass: "bg-badge-danger text-badge-danger-foreground",
  },
  skipped: {
    icon: MinusCircle,
    iconClass: "bg-badge-default text-badge-default-foreground",
  },
  errorRate: {
    icon: Percent,
    iconClass: "bg-muted text-foreground",
  },
  avgDuration: {
    icon: Clock,
    iconClass: "bg-badge-info text-badge-info-foreground",
  },
  avgTotal: {
    icon: Timer,
    iconClass: "bg-badge-info text-badge-info-foreground",
  },
  avgHooks: {
    icon: Timer,
    iconClass: "bg-badge-info text-badge-info-foreground",
  },
  avgQuery: {
    icon: Timer,
    iconClass: "bg-badge-info text-badge-info-foreground",
  },
  running: {
    icon: Loader2,
    iconClass: "bg-badge-warning text-badge-warning-foreground",
    spin: true,
  },
  pending: {
    icon: Hourglass,
    iconClass: "bg-badge-warning text-badge-warning-foreground",
  },
  info: {
    icon: Info,
    iconClass: "bg-badge-info text-badge-info-foreground",
  },
  actors: {
    icon: Users,
    iconClass: "bg-muted text-muted-foreground",
  },
};

function resolveKpiIcon(key: string) {
  return (
    KPI_ICON_CONFIG[key] ?? {
      icon: Layers,
      iconClass: "bg-muted text-muted-foreground",
    }
  );
}

export function DebuggerKpiStrip({
  items,
}: {
  readonly items: readonly DebuggerKpiItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-wrap">
      {items.map((item) => {
        const { icon: Icon, iconClass, spin } = resolveKpiIcon(item.key);
        const numericValue =
          typeof item.value === "number" ? item.value : Number(item.value);
        const shouldSpin = spin === true && numericValue > 0;

        return (
          <Card
            key={item.key}
            className={cn(
              "min-w-0 p-3 xl:min-w-[9.5rem] xl:flex-1",
              DEBUGGER_CHART_CARD_CLASS,
              DEBUGGER_KPI_TILE_CLASS,
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                  iconClass,
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4",
                    shouldSpin && "animate-spin motion-reduce:animate-none",
                  )}
                />
              </span>
              <div className="min-w-0">
                <Text className="text-muted-foreground truncate text-[10px] font-medium uppercase tracking-wide">
                  {item.label}
                </Text>
                <Text className="text-lg font-semibold tabular-nums leading-tight">
                  {item.value}
                </Text>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
