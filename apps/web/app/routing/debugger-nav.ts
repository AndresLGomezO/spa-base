import {
  Bot,
  Database,
  Gauge,
  Mail,
  ScrollText,
  Shield,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { hasPermission } from "@repo/rbac";

import type { NavLinkConfig } from "../components/sidebar/nav-config";
import type { DebugEventSource } from "../lib/api-client";
import {
  DEBUGGER_SOURCE_ORDER,
  DEBUGGER_SOURCE_ROUTE_SLUGS,
} from "../features/debugger/debugger-source-config";

export const DEBUGGER_MATCH_PATH = "/debugger";

const DEBUGGER_SOURCE_NAV_IDS: Record<DebugEventSource, string> = {
  ai: "debugger-ai-jobs",
  hookExecution: "debugger-hook-executions",
  hookLog: "debugger-hook-logs",
  audit: "debugger-audit",
  requestPerf: "debugger-request-performance",
  indexProvision: "debugger-index-provisioning",
  emailIngest: "debugger-email-ingest",
};

const DEBUGGER_SOURCE_NAV_LABEL_KEYS: Record<
  DebugEventSource,
  NavLinkConfig["labelKey"]
> = {
  ai: "debuggerAiJobs",
  hookExecution: "debuggerHookExecutions",
  hookLog: "debuggerHookLogs",
  audit: "debuggerAudit",
  requestPerf: "debuggerRequestPerf",
  indexProvision: "debuggerIndexProvision",
  emailIngest: "debuggerEmailIngest",
};

const DEBUGGER_SOURCE_ICONS: Record<DebugEventSource, LucideIcon> = {
  ai: Bot,
  hookExecution: Workflow,
  hookLog: ScrollText,
  audit: Shield,
  requestPerf: Gauge,
  indexProvision: Database,
  emailIngest: Mail,
};

export function canAccessDebuggerSource(
  source: DebugEventSource,
  permissions: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  if (hasPermission("debug.read", permissions, { isSuperAdmin })) {
    return true;
  }

  switch (source) {
    case "ai":
      return (
        hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.chat.read", permissions, { isSuperAdmin })
      );
    case "hookExecution":
    case "hookLog":
    case "emailIngest":
      return hasPermission("hook.read", permissions, { isSuperAdmin });
    case "audit":
    case "requestPerf":
    case "indexProvision":
      return false;
    default:
      return false;
  }
}

function buildDebuggerNavItem(source: DebugEventSource): NavLinkConfig {
  const slug = DEBUGGER_SOURCE_ROUTE_SLUGS[source];
  return {
    id: DEBUGGER_SOURCE_NAV_IDS[source],
    labelKey: DEBUGGER_SOURCE_NAV_LABEL_KEYS[source],
    to: `${DEBUGGER_MATCH_PATH}/${slug}`,
    matchPath: `${DEBUGGER_MATCH_PATH}/${slug}`,
    icon: DEBUGGER_SOURCE_ICONS[source],
  };
}

export function buildAccessibleDebuggerNavLinks(
  permissions: readonly string[],
  isSuperAdmin: boolean,
): NavLinkConfig[] {
  return DEBUGGER_SOURCE_ORDER.filter((source) =>
    canAccessDebuggerSource(source, permissions, isSuperAdmin),
  ).map(buildDebuggerNavItem);
}

export function resolveDefaultDebuggerRoute(
  permissions: readonly string[],
  isSuperAdmin: boolean,
): string {
  const links = buildAccessibleDebuggerNavLinks(permissions, isSuperAdmin);
  return links[0]?.to ?? `${DEBUGGER_MATCH_PATH}/ai-jobs`;
}
