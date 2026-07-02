import { Alert, BuilderPageShell, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import type { DebugEventSource } from "../../lib/api-client";
import { canAccessDebuggerSource } from "../../routing/debugger-nav";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { DebuggerDetailPanel } from "./DebuggerDetailPanel";
import { IndexProvisioningProcessList } from "./components/IndexProvisioningProcessList";
import { DebuggerListTreePanel } from "./DebuggerListTreePanel";
import { DebuggerProvider, useDebugger } from "./debugger-context";
import { debuggerSourceLabelKey } from "./debugger-source-config";

function DebuggerWorkbench({
  activeSource,
}: {
  readonly activeSource: DebugEventSource;
}) {
  const { loadError } = useDebugger();

  if (loadError) {
    return <Text className="text-destructive text-sm">{loadError}</Text>;
  }

  return (
    <div className={designerTreeTabRootClassName}>
      {activeSource === "indexProvision" ? (
        <div className="mb-4">
          <IndexProvisioningProcessList />
        </div>
      ) : null}
      <div className={designerTreeWorkbenchClassName}>
        <DebuggerListTreePanel />
        <div className={designerPreviewColumnClassName}>
          <DebuggerDetailPanel />
        </div>
      </div>
    </div>
  );
}

function DebuggerPageContent({
  activeSource,
}: {
  readonly activeSource: DebugEventSource;
}) {
  const { t } = useTranslation("common");
  const { isReady, tenantId, permissions, isSuperAdmin } = useAuth();
  const canReadSource = canAccessDebuggerSource(
    activeSource,
    permissions,
    isSuperAdmin,
  );

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canReadSource) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t(debuggerSourceLabelKey(activeSource))}</Heading>
        <Alert>{t("debugger.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t(debuggerSourceLabelKey(activeSource))}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <DebuggerProvider activeSource={activeSource}>
      <DebuggerWorkbench activeSource={activeSource} />
    </DebuggerProvider>
  );
}

export function DebuggerView({
  activeSource,
}: {
  readonly activeSource: DebugEventSource;
}) {
  const { t } = useTranslation("common");

  return (
    <BuilderPageShell
      title={t(debuggerSourceLabelKey(activeSource))}
      subtitle={t("debugger.description")}
      bodyScrollable={false}
    >
      <DebuggerPageContent activeSource={activeSource} />
    </BuilderPageShell>
  );
}
