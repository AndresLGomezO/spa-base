import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TenantBundleExportDocument } from "@repo/tenant-bundle/browser";

import {
  Alert,
  Button,
  FieldLabel,
  Input,
  JsonImportTriggerButton,
  JsonViewTriggerButton,
  Modal,
  Text,
  toast,
} from "@repo/ui";

import {
  getAdminTenant,
  importAdminTenantBundle,
  updateAdminTenant,
  type AdminTenant,
} from "../../lib/admin-client";
import { useJsonActionTriggerLabels } from "../json/json-action-trigger-labels";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import { IndexEnvironmentBlockedNotice } from "../index-provisioning/IndexEnvironmentBlockedNotice";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";
import { EditTenantNameModal } from "./EditTenantNameModal";
import { DeleteTenantModal } from "./DeleteTenantModal";
import { TenantAiLimitsEditor } from "./TenantAiLimitsEditor";
import { TenantBundleJsonImportDialog } from "./TenantBundleJsonImportDialog";
import { TenantBundleJsonViewDialog } from "./TenantBundleJsonViewDialog";
import { tenantBundleJsonLabels } from "./tenant-bundle-json-labels";

interface CurrentTenantPanelProps {
  readonly tenantId: string;
}

export function CurrentTenantPanel({ tenantId }: CurrentTenantPanelProps) {
  const { t } = useTranslation("common");
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingBundle, setPendingBundle] =
    useState<TenantBundleExportDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tenantDeleted, setTenantDeleted] = useState(false);
  const [defaultLocaleDraft, setDefaultLocaleDraft] = useState("en");
  const [isSavingLocale, setIsSavingLocale] = useState(false);

  const bundleLabels = useMemo(() => tenantBundleJsonLabels(t), [t]);
  const triggerLabels = useJsonActionTriggerLabels();
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextTenant = await getAdminTenant(tenantId);
      setTenant(nextTenant);
      setDefaultLocaleDraft(nextTenant.defaultLocale?.trim() || "en");
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("platform.currentTenant.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  async function handleToggleStatus() {
    if (!tenant) return;
    const nextStatus = tenant.status === "active" ? "suspended" : "active";
    setIsSaving(true);
    try {
      const updated = await updateAdminTenant(tenant.id, {
        status: nextStatus,
      });
      setTenant(updated);
      toast.success(
        nextStatus === "suspended"
          ? t("admin.tenants.suspendSuccess")
          : t("admin.tenants.activateSuccess"),
      );
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : t("admin.tenants.updateFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveDefaultLocale() {
    if (!tenant) return;
    const nextLocale = defaultLocaleDraft.trim().toLowerCase();
    if (!/^[a-z]{2}(-[a-z0-9]+)?$/i.test(nextLocale)) {
      toast.error(t("platform.currentTenant.defaultLocaleInvalid"));
      return;
    }
    setIsSavingLocale(true);
    try {
      const updated = await updateAdminTenant(tenant.id, {
        defaultLocale: nextLocale,
      });
      setTenant(updated);
      setDefaultLocaleDraft(updated.defaultLocale?.trim() || nextLocale);
      toast.success(t("platform.currentTenant.defaultLocaleSaved"));
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : t("admin.tenants.updateFailed"),
      );
    } finally {
      setIsSavingLocale(false);
    }
  }

  function handleImportApply(bundle: TenantBundleExportDocument) {
    setPendingBundle(bundle);
    setConfirmImportOpen(true);
  }

  async function handleConfirmImport() {
    if (!pendingBundle || !isEnvironmentReady) {
      return;
    }

    setIsImporting(true);
    try {
      await importAdminTenantBundle(tenantId, pendingBundle);
      await loadTenant();
      toast.success(bundleLabels.importSuccess);
      setConfirmImportOpen(false);
      setPendingBundle(null);
    } catch (importError) {
      toast.error(
        importError instanceof Error
          ? importError.message
          : bundleLabels.importFailed,
      );
    } finally {
      setIsImporting(false);
    }
  }

  if (isLoading) {
    return <SettingsPanelSkeleton />;
  }

  if (!tenant) {
    return (
      <Alert>
        {tenantDeleted
          ? t("platform.currentTenant.deleted")
          : t("platform.currentTenant.notFound")}
      </Alert>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted font-medium">{t("admin.tenants.name")}</dt>
          <dd className="flex items-center gap-3">
            <span>{tenant.name}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              {t("entity.edit")}
            </Button>
          </dd>
        </div>
        <div>
          <dt className="text-muted font-medium">{t("admin.tenants.id")}</dt>
          <dd>{tenant.id}</dd>
        </div>
        <div>
          <dt className="text-muted font-medium">
            {t("admin.tenants.status")}
          </dt>
          <dd>
            {tenant.status === "suspended"
              ? t("tenant.suspended")
              : t("admin.tenants.active")}
          </dd>
        </div>
        <div>
          <dt className="text-muted font-medium">
            {t("platform.currentTenant.createdAt")}
          </dt>
          <dd>{new Date(tenant.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted font-medium">
            {t("platform.currentTenant.defaultLocale")}
          </dt>
          <dd className="flex flex-wrap items-end gap-2">
            <div className="min-w-[8rem] space-y-1">
              <FieldLabel htmlFor="tenant-default-locale" className="sr-only">
                {t("platform.currentTenant.defaultLocale")}
              </FieldLabel>
              <Input
                id="tenant-default-locale"
                value={defaultLocaleDraft}
                onChange={(event) => setDefaultLocaleDraft(event.target.value)}
                placeholder="en"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                isSavingLocale ||
                defaultLocaleDraft.trim().toLowerCase() ===
                  (tenant.defaultLocale?.trim().toLowerCase() || "en")
              }
              onClick={() => void handleSaveDefaultLocale()}
            >
              {t("platform.currentTenant.saveDefaultLocale")}
            </Button>
          </dd>
          <Text className="text-muted-foreground mt-1 text-xs">
            {t("platform.currentTenant.defaultLocaleHint")}
          </Text>
        </div>
      </dl>

      <TenantAiLimitsEditor
        tenant={tenant}
        onSaved={(updated) => setTenant(updated)}
      />

      <section className="flex flex-col gap-3">
        <div className="space-y-1">
          <Text className="text-sm font-medium">
            {bundleLabels.sectionTitle}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {bundleLabels.sectionDescription}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <JsonViewTriggerButton
            labels={triggerLabels}
            onClick={() => setViewDialogOpen(true)}
          />
          <JsonImportTriggerButton
            labels={triggerLabels}
            disabled={!isEnvironmentReady}
            onClick={() => setImportDialogOpen(true)}
          />
        </div>
        {!isEnvironmentReady ? (
          <IndexEnvironmentBlockedNotice
            feature="import"
            buildingCollections={buildingCollections}
          />
        ) : null}
      </section>

      <Button
        type="button"
        variant="outline"
        disabled={isSaving}
        onClick={() => void handleToggleStatus()}
      >
        {tenant.status === "active"
          ? t("admin.tenants.suspend")
          : t("admin.tenants.activate")}
      </Button>

      <section className="border-destructive/30 flex flex-col gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Text className="text-destructive text-sm font-medium">
            {t("platform.currentTenant.dangerZoneTitle")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("platform.currentTenant.dangerZoneDescription")}
          </Text>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground self-start"
          onClick={() => setDeleteOpen(true)}
        >
          {t("platform.currentTenant.deleteTrigger")}
        </Button>
      </section>

      <EditTenantNameModal
        open={editOpen}
        tenant={tenant}
        onClose={() => setEditOpen(false)}
        onSaved={setTenant}
      />

      <TenantBundleJsonViewDialog
        tenantId={tenantId}
        labels={bundleLabels}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <TenantBundleJsonImportDialog
        labels={bundleLabels}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onApply={handleImportApply}
      />

      <DeleteTenantModal
        open={deleteOpen}
        tenant={tenant}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setTenantDeleted(true);
          setTenant(null);
        }}
      />

      <Modal
        open={confirmImportOpen}
        onClose={() => {
          if (isImporting) {
            return;
          }
          setConfirmImportOpen(false);
          setPendingBundle(null);
        }}
        title={bundleLabels.confirmTitle}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={() => {
                setConfirmImportOpen(false);
                setPendingBundle(null);
              }}
            >
              {bundleLabels.cancel}
            </Button>
            <Button
              type="button"
              disabled={isImporting}
              onClick={() => void handleConfirmImport()}
            >
              {bundleLabels.confirmAction}
            </Button>
          </>
        }
      >
        <Text className="text-muted-foreground text-sm">
          {bundleLabels.confirmDescription}
        </Text>
      </Modal>
    </div>
  );
}
