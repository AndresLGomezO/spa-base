import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { IconButton, Text, buttonSizes, buttonVariants } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";
import { DEBUGGER_MATCH_PATH } from "../../routing/debugger-nav";

const TIP_ROTATION_MS = 6_000;
const MINIMIZED_STORAGE_KEY = "index-provisioning-banner-minimized";

const INDEX_TIP_KEYS = [
  "indexes.tips.tip1",
  "indexes.tips.tip2",
  "indexes.tips.tip3",
  "indexes.tips.tip4",
] as const;

const DEBUGGER_INDEX_PROVISIONING_PATH = `${DEBUGGER_MATCH_PATH}/index-provisioning`;

function readMinimizedFromSession(): boolean {
  try {
    return sessionStorage.getItem(MINIMIZED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeMinimizedToSession(minimized: boolean): void {
  try {
    sessionStorage.setItem(MINIMIZED_STORAGE_KEY, minimized ? "true" : "false");
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function formatCollectionList(collections: readonly string[]): string {
  if (collections.length === 0) {
    return "";
  }
  if (collections.length <= 3) {
    return collections.join(", ");
  }
  return `${collections.slice(0, 3).join(", ")} +${collections.length - 3}`;
}

export function IndexProvisioningGlobalBanner() {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();
  const { phase, buildingCollections, errorCollections, totalCreatingCount } =
    useTenantIndexReadiness(Boolean(tenantId));
  const [minimized, setMinimized] = useState(readMinimizedFromSession);
  const [tipIndex, setTipIndex] = useState(0);
  const previousBuildingKeyRef = useRef<string>("");

  const buildingSessionKey = buildingCollections.join("|");
  const isBuilding = phase === "building";
  const isError = phase === "error";
  const isVisible = Boolean(tenantId) && (isBuilding || isError);

  const tipMessages = useMemo(() => INDEX_TIP_KEYS.map((key) => t(key)), [t]);
  const collectionList = formatCollectionList(
    isBuilding ? buildingCollections : errorCollections,
  );

  useEffect(() => {
    if (!isVisible || !isBuilding) {
      return;
    }
    if (
      previousBuildingKeyRef.current &&
      previousBuildingKeyRef.current !== buildingSessionKey
    ) {
      setMinimized(false);
      writeMinimizedToSession(false);
    }
    previousBuildingKeyRef.current = buildingSessionKey;
  }, [buildingSessionKey, isBuilding, isVisible]);

  useEffect(() => {
    if (!isVisible || !isBuilding || tipMessages.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % tipMessages.length);
    }, TIP_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [isBuilding, isVisible, tipMessages.length]);

  if (!isVisible) {
    return null;
  }

  function handleMinimize() {
    setMinimized(true);
    writeMinimizedToSession(true);
  }

  function handleExpand() {
    setMinimized(false);
    writeMinimizedToSession(false);
  }

  const title = isBuilding
    ? t("indexProvisioning.globalBanner.buildingTitle")
    : t("indexProvisioning.globalBanner.errorTitle");

  if (minimized) {
    return (
      <div
        className="border-border bg-background fixed bottom-4 right-4 z-[55] flex max-w-sm items-center gap-2 rounded-lg border px-3 py-2 shadow-lg"
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
      >
        {isBuilding ? (
          <Loader2
            className="text-primary size-4 shrink-0 animate-spin"
            aria-hidden
          />
        ) : (
          <AlertTriangle
            className="text-destructive size-4 shrink-0"
            aria-hidden
          />
        )}
        <Text className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </Text>
        <Link
          to={DEBUGGER_INDEX_PROVISIONING_PATH}
          className="text-primary shrink-0"
          aria-label={t("indexProvisioning.globalBanner.openDebugger")}
        >
          <ExternalLink className="size-4" aria-hidden />
        </Link>
        <IconButton
          label={t("indexProvisioning.globalBanner.expand")}
          onClick={handleExpand}
          className="size-7 shrink-0"
        >
          <ChevronUp className="size-4" aria-hidden />
        </IconButton>
      </div>
    );
  }

  return (
    <div
      className="border-border bg-background fixed bottom-4 right-4 z-[55] w-full max-w-sm rounded-lg border p-4 shadow-lg"
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {isBuilding ? (
            <Loader2 className="text-primary size-5 animate-spin" aria-hidden />
          ) : (
            <AlertTriangle className="text-destructive size-5" aria-hidden />
          )}
          {isBuilding ? (
            <Database
              className={cn(
                "text-muted-foreground absolute -bottom-1 -right-1 size-3 animate-pulse",
              )}
              aria-hidden
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Text className="font-medium">{title}</Text>
          {isBuilding ? (
            <>
              <Text className="text-muted-foreground text-sm">
                {t("indexProvisioning.globalBanner.buildingProgress", {
                  creating: totalCreatingCount,
                  collections: buildingCollections.length,
                  collectionList,
                })}
              </Text>
              {tipMessages.length > 0 ? (
                <Text className="text-muted-foreground text-sm italic">
                  {tipMessages[tipIndex]}
                </Text>
              ) : null}
            </>
          ) : (
            <Text className="text-muted-foreground text-sm">
              {t("indexProvisioning.globalBanner.errorSubtitle", {
                collectionList,
              })}
            </Text>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              to={DEBUGGER_INDEX_PROVISIONING_PATH}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-sm border border-transparent font-medium transition-colors",
                buttonVariants.outline,
                buttonSizes.sm,
              )}
            >
              {t("indexProvisioning.globalBanner.openDebugger")}
            </Link>
            <IconButton
              label={t("indexProvisioning.globalBanner.minimize")}
              onClick={handleMinimize}
              className="size-8"
            >
              <ChevronDown className="size-4" aria-hidden />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
