import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, FieldLabel, Form, Input, Text, toast } from "@repo/ui";

import {
  deleteAdminTenant,
  getTenantDeletionJob,
  type AdminTenant,
  type TenantDeletionJob,
} from "../../lib/admin-client";
import { FormModal } from "../forms/FormModal";

interface DeleteTenantModalProps {
  readonly open: boolean;
  readonly tenant: AdminTenant;
  readonly onClose: () => void;
  readonly onDeleted: () => void;
}

const TERMINAL_JOB_STATUSES = new Set(["completed", "failed"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function pollTenantDeletionJob(
  jobId: string,
  onUpdate: (job: TenantDeletionJob) => void,
): Promise<TenantDeletionJob> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const job = await getTenantDeletionJob(jobId);
    onUpdate(job);
    if (TERMINAL_JOB_STATUSES.has(job.status)) {
      return job;
    }
    await sleep(2_000);
  }
  throw new Error("Tenant deletion is taking longer than expected.");
}

export function DeleteTenantModal({
  open,
  tenant,
  onClose,
  onDeleted,
}: DeleteTenantModalProps) {
  const { t } = useTranslation("common");
  const [confirmTenantId, setConfirmTenantId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeJob, setActiveJob] = useState<TenantDeletionJob | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmTenantId("");
      setActiveJob(null);
    }
  }, [open]);

  const canSubmit =
    confirmTenantId.trim() === tenant.id && !isDeleting && activeJob === null;

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsDeleting(true);
    try {
      const { jobId } = await deleteAdminTenant(tenant.id, {
        confirmTenantId: confirmTenantId.trim(),
      });
      const finalJob = await pollTenantDeletionJob(jobId, setActiveJob);
      if (finalJob.status === "failed") {
        throw new Error(
          finalJob.error ?? t("platform.currentTenant.deleteFailed"),
        );
      }
      toast.success(t("platform.currentTenant.deleteSuccess"));
      onDeleted();
      onClose();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : t("platform.currentTenant.deleteFailed"),
      );
    } finally {
      setIsDeleting(false);
      setActiveJob(null);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={() => {
        if (isDeleting) {
          return;
        }
        onClose();
      }}
      title={t("platform.currentTenant.deleteTitle")}
      size="md"
      scrollable={false}
    >
      <Form className="grid gap-4" onSubmit={(event) => void handleDelete(event)}>
        <Alert>{t("platform.currentTenant.deleteWarning")}</Alert>
        <Text className="text-muted-foreground text-sm">
          {t("platform.currentTenant.deleteDescription")}
        </Text>
        <FieldLabel htmlFor="confirm-tenant-id">
          {t("platform.currentTenant.deleteConfirmLabel", {
            tenantId: tenant.id,
          })}
        </FieldLabel>
        <Input
          id="confirm-tenant-id"
          value={confirmTenantId}
          disabled={isDeleting}
          onChange={(event) => setConfirmTenantId(event.target.value)}
          placeholder={tenant.id}
          autoComplete="off"
        />
        {activeJob ? (
          <Text className="text-muted-foreground text-sm">
            {t("platform.currentTenant.deleteProgress", {
              status: activeJob.status,
              docsCopied: activeJob.progress.docsCopied,
              docsDeleted: activeJob.progress.docsDeleted,
            })}
          </Text>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={onClose}
          >
            {t("entity.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            disabled={!canSubmit}
          >
            {isDeleting
              ? t("platform.currentTenant.deleteInProgress")
              : t("platform.currentTenant.deleteConfirmAction")}
          </Button>
        </div>
      </Form>
    </FormModal>
  );
}
