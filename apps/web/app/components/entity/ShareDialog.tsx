import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import {
  grantEntityShare,
  listEntityShares,
  listTenantUsers,
  revokeEntityShare,
  type EntityShareEntry,
} from "../../lib/api-client";

interface ShareDialogProps {
  readonly entityName: EntityName;
  readonly recordId: string;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function ShareDialog({
  entityName,
  recordId,
  open,
  onClose,
}: ShareDialogProps) {
  const { t } = useTranslation("common");
  const [shares, setShares] = useState<readonly EntityShareEntry[]>([]);
  const [members, setMembers] = useState<
    readonly {
      readonly uid: string;
      readonly email: string | null;
      readonly displayName: string | null;
    }[]
  >([]);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("read");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listEntityShares(entityName, recordId);
      setShares(result.shares);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("entity.shareLoadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [entityName, recordId, t]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadShares();
  }, [loadShares, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await listTenantUsers({
            search: search.trim() || undefined,
          });
          if (!cancelled) {
            setMembers(result.members);
          }
        } catch {
          if (!cancelled) {
            setMembers([]);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search]);

  const memberOptions = useMemo(() => {
    const sharedUserIds = new Set(shares.map((share) => share.userId));
    return members.filter((member) => !sharedUserIds.has(member.uid));
  }, [members, shares]);

  const handleGrant = async () => {
    if (!selectedUserId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await grantEntityShare(entityName, recordId, {
        userId: selectedUserId,
        permission,
      });
      setShares(result.shares);
      setSelectedUserId("");
      setPermission("read");
      toast.success(t("entity.shareGranted"));
    } catch (grantError) {
      setError(
        grantError instanceof Error
          ? grantError.message
          : t("entity.shareGrantFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await revokeEntityShare(entityName, recordId, userId);
      setShares(result.shares);
      toast.success(t("entity.shareRevoked"));
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : t("entity.shareRevokeFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("entity.shareTitle")}
      size="md"
    >
      <div className="flex flex-col gap-4">
        {error ? <Alert>{error}</Alert> : null}

        <div className="flex flex-col gap-2">
          <Text>{t("entity.shareCurrent")}</Text>
          {isLoading ? (
            <Text>{t("table.loading")}</Text>
          ) : shares.length === 0 ? (
            <Text>{t("entity.shareEmpty")}</Text>
          ) : (
            <ul className="flex flex-col gap-2">
              {shares.map((share) => {
                const member = members.find(
                  (entry) => entry.uid === share.userId,
                );
                const label =
                  member?.displayName ?? member?.email ?? share.userId;

                return (
                  <li
                    key={share.userId}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div>
                      <Text>{label}</Text>
                      <Text className="text-muted-foreground text-sm">
                        {t(`entity.sharePermission.${share.permission}`)}
                      </Text>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      loading={isSubmitting}
                      onClick={() => void handleRevoke(share.userId)}
                    >
                      {t("entity.shareRemove")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t pt-4">
          <Text>{t("entity.shareAdd")}</Text>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("entity.shareSearchPlaceholder")}
          />
          <select
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="">{t("entity.shareSelectUser")}</option>
            {memberOptions.map((member) => (
              <option key={member.uid} value={member.uid}>
                {member.displayName ?? member.email ?? member.uid}
              </option>
            ))}
          </select>
          <select
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
            value={permission}
            onChange={(event) =>
              setPermission(event.target.value === "write" ? "write" : "read")
            }
          >
            <option value="read">{t("entity.sharePermission.read")}</option>
            <option value="write">{t("entity.sharePermission.write")}</option>
          </select>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!selectedUserId}
            onClick={() => void handleGrant()}
          >
            {t("entity.shareGrant")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
