import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Alert, Heading, Text } from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  listEntityDefinitions,
  listHooks,
  listRoles,
} from "../../lib/api-client";

interface OverviewCounts {
  readonly definitions: number;
  readonly roles: number;
  readonly hooks: number;
}

function hasControlPlaneAccess(
  permissions: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) {
    return true;
  }
  return (
    permissions.includes("entityDefinition.read") ||
    permissions.includes("role.read") ||
    permissions.includes("hook.read")
  );
}

export function AdminOverview() {
  const { t } = useTranslation("common");
  const { tenantId, permissions, isSuperAdmin } = useAuth();
  const { items: entities } = useEntityCatalog();
  const [counts, setCounts] = useState<OverviewCounts>({
    definitions: 0,
    roles: 0,
    hooks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canReadDefinitions =
    isSuperAdmin || permissions.includes("entityDefinition.read");
  const canReadRoles = isSuperAdmin || permissions.includes("role.read");
  const canReadHooks = isSuperAdmin || permissions.includes("hook.read");

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      if (!tenantId) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const [definitionsResult, rolesResult, hooksResult] = await Promise.all(
          [
            canReadDefinitions
              ? listEntityDefinitions({ tenantId })
              : Promise.resolve({ items: [] }),
            canReadRoles
              ? listRoles({ tenantId })
              : Promise.resolve({ items: [] }),
            canReadHooks
              ? listHooks({ tenantId })
              : Promise.resolve({ items: [] }),
          ],
        );

        if (!cancelled) {
          setCounts({
            definitions: definitionsResult.items.length,
            roles: rolesResult.items.length,
            hooks: hooksResult.items.length,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("home.loadFailed"),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [canReadDefinitions, canReadHooks, canReadRoles, t, tenantId]);

  const quickLinks = useMemo(() => {
    const links: { readonly to: string; readonly label: string }[] = [];
    if (canReadDefinitions) {
      links.push({
        to: "/settings/data-models",
        label: t("home.manageDataModels"),
      });
    }
    if (canReadHooks) {
      links.push({
        to: "/settings/hooks",
        label: t("home.manageHooks"),
      });
    }
    if (canReadRoles) {
      links.push({
        to: "/settings/roles",
        label: t("home.manageRoles"),
      });
    }
    return links;
  }, [canReadDefinitions, canReadHooks, canReadRoles, t]);

  if (isLoading) {
    return <Text>{t("loading")}</Text>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Heading level={1}>{t("home.overviewTitle")}</Heading>
        <Text>{t("home.overviewDescription")}</Text>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <section className="space-y-3">
        <Heading level={2}>{t("home.countsTitle")}</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-border rounded-lg border p-4">
            <Text className="text-muted-foreground text-sm">
              {t("home.entitiesCount")}
            </Text>
            <Text className="text-2xl font-semibold">{entities.length}</Text>
          </div>
          {canReadDefinitions ? (
            <div className="border-border rounded-lg border p-4">
              <Text className="text-muted-foreground text-sm">
                {t("home.definitionsCount")}
              </Text>
              <Text className="text-2xl font-semibold">
                {counts.definitions}
              </Text>
            </div>
          ) : null}
          {canReadRoles ? (
            <div className="border-border rounded-lg border p-4">
              <Text className="text-muted-foreground text-sm">
                {t("home.rolesCount")}
              </Text>
              <Text className="text-2xl font-semibold">{counts.roles}</Text>
            </div>
          ) : null}
          {canReadHooks ? (
            <div className="border-border rounded-lg border p-4">
              <Text className="text-muted-foreground text-sm">
                {t("home.hooksCount")}
              </Text>
              <Text className="text-2xl font-semibold">{counts.hooks}</Text>
            </div>
          ) : null}
        </div>
      </section>

      {quickLinks.length > 0 ? (
        <section className="space-y-3">
          <Heading level={2}>{t("home.quickLinksTitle")}</Heading>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-primary underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export { hasControlPlaneAccess };
