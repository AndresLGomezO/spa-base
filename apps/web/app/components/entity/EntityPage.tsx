import { useCallback, useMemo, useState } from "react";
import type { QueryConfig } from "@repo/query-engine";
import { resolveActiveView } from "@repo/ui-builder";
import { Alert, Button, Heading, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { EntityCardView } from "./EntityCardView";
import { EntityTable } from "./EntityTable";

interface EntityPageProps {
  readonly entityName: EntityName;
}

export function EntityPage({ entityName }: EntityPageProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const activeView = useMemo(() => resolveActiveView(definition), [definition]);
  const [queryConfig, setQueryConfig] = useState<QueryConfig>(() => ({
    pagination: { limit: 20 },
  }));
  const entityState = useEntity(entityName, { queryConfig });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleQueryConfigChange = useCallback((nextConfig: QueryConfig) => {
    setQueryConfig(nextConfig);
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const deleted = await entityState.remove(deleteId);
    if (deleted) {
      setSuccessMessage(t("entity.deleteSuccess"));
    }
    setDeleteId(null);
  };

  const listViewProps = {
    entityName,
    entityState,
    onQueryConfigChange: handleQueryConfigChange,
    onRequestDelete: permissions.canDelete ? setDeleteId : undefined,
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Heading level={1}>{getEntityLabel(definition)}</Heading>
        {permissions.canCreate ? (
          <Link to={`/app/${entityName}/new`}>
            <Button type="button">{t("entity.create")}</Button>
          </Link>
        ) : null}
      </div>

      {successMessage ? (
        <Alert className="border-success-200 bg-success-50 text-success-800 dark:border-success-800 dark:bg-success-950/40 dark:text-success-300">
          {successMessage}
        </Alert>
      ) : null}

      {activeView.type === "card" ? (
        <EntityCardView {...listViewProps} />
      ) : (
        <EntityTable {...listViewProps} />
      )}

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title={t("entity.confirmDeleteTitle")}
      >
        <Text>{t("entity.confirmDelete")}</Text>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            loading={entityState.isSubmitting}
            onClick={() => void handleDelete()}
          >
            {t("entity.delete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteId(null)}
          >
            {t("entity.cancel")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
