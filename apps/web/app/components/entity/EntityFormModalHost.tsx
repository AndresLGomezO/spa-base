import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  resolveEffectiveFormModalContentPadding,
  resolveFormModalChrome,
  resolveFormModalFooterLayout,
  resolveFormModalHasLayoutActions,
  resolveFormPresentation,
  resolveFormUsesModalBuilderFooter,
} from "@repo/entities";
import { Button } from "@repo/ui";

import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { DesignedEntityFormModal } from "../forms/DesignedEntityFormModal";
import { EntityForm, ENTITY_FORM_ID } from "./EntityForm";
import { RequireEntityPermission } from "./RequireEntityPermission";
import { useEntityFormModal } from "./entity-form-modal-context";

export function EntityFormModalHost() {
  const { request, session, closeEntityFormModal } = useEntityFormModal();

  if (!request) {
    return null;
  }

  return (
    <EntityFormModalHostInner
      key={`${request.entityName}-${request.mode}-${request.recordId ?? "create"}-${session}`}
      request={request}
      onClose={closeEntityFormModal}
    />
  );
}

function EntityFormModalHostInner({
  request,
  onClose,
}: {
  readonly request: NonNullable<
    ReturnType<typeof useEntityFormModal>["request"]
  >;
  readonly onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(request.entityName);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [formModalFooter, setFormModalFooter] = useState<ReactNode>(null);

  const formModalChrome = useMemo(
    () => resolveFormModalChrome(definition),
    [definition],
  );
  const formModalContentPadding = useMemo(
    () => resolveEffectiveFormModalContentPadding(formModalChrome),
    [formModalChrome],
  );
  const formModalScrollable = useMemo(
    () =>
      resolveFormPresentation(definition) !== "wizard" &&
      formModalContentPadding !== "none",
    [definition, formModalContentPadding],
  );
  const formModalFooterLayout = useMemo(
    () => resolveFormModalFooterLayout(definition),
    [definition],
  );
  const useDesignedFormModalFooter = useMemo(
    () =>
      resolveFormUsesModalBuilderFooter(definition) &&
      (formModalFooterLayout != null ||
        resolveFormModalHasLayoutActions(definition)),
    [definition, formModalFooterLayout],
  );
  const isWizardFormModal = useMemo(
    () => resolveFormPresentation(definition) === "wizard",
    [definition],
  );

  const handleClose = useCallback(() => {
    setIsFormSubmitting(false);
    onClose();
  }, [onClose]);

  const formModalTitle = useMemo(() => {
    const entity = getEntityLabel(definition);
    return request.mode === "create"
      ? t("entity.createTitle", { entity })
      : t("entity.editTitle", { entity });
  }, [definition, request.mode, t]);

  const legacyFormModalFooter = (
    <div className="flex gap-2">
      <Button type="button" variant="outline" onClick={handleClose}>
        {t("entity.cancel")}
      </Button>
      <Button type="submit" form={ENTITY_FORM_ID} loading={isFormSubmitting}>
        {t("entity.save")}
      </Button>
    </div>
  );

  const formModalFooterSlot = useDesignedFormModalFooter
    ? (formModalFooter ?? (
        <div className="min-h-10 w-full shrink-0" aria-hidden />
      ))
    : legacyFormModalFooter;

  const formModalSharedProps = {
    modalActionPlacement: useDesignedFormModalFooter
      ? ("footer" as const)
      : ("inline" as const),
    modalFooterLayout: formModalFooterLayout,
    onFooterChange: useDesignedFormModalFooter ? setFormModalFooter : undefined,
    hideActions: !useDesignedFormModalFooter,
    onSubmittingChange: setIsFormSubmitting,
    onCancel: handleClose,
    onSuccess: handleClose,
  };

  return (
    <DesignedEntityFormModal
      open
      onClose={handleClose}
      title={formModalTitle}
      forms={definition.ui.forms}
      scrollable={formModalScrollable}
      showHeader={formModalChrome.showHeader}
      showCloseButton={formModalChrome.showHeader}
      contentPadding={formModalContentPadding}
      footer={formModalFooterSlot}
    >
      <div
        className={
          isWizardFormModal
            ? "flex min-h-0 w-full min-w-0 flex-1 flex-col"
            : "w-full"
        }
      >
        {request.mode === "create" ? (
          <RequireEntityPermission
            entityName={request.entityName}
            action="create"
          >
            <EntityForm
              entityName={request.entityName}
              mode="create"
              createPrefill={request.createPrefill}
              {...formModalSharedProps}
            />
          </RequireEntityPermission>
        ) : (
          <RequireEntityPermission
            entityName={request.entityName}
            action="update"
          >
            <EntityForm
              entityName={request.entityName}
              mode="edit"
              recordId={request.recordId ?? ""}
              {...formModalSharedProps}
            />
          </RequireEntityPermission>
        )}
      </div>
    </DesignedEntityFormModal>
  );
}
