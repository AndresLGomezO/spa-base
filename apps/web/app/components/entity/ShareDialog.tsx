import { useCallback, useState } from "react";
import { Button, Input, Modal, Text, Select } from "@repo/ui";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useShare } from "../../hooks/useShare";
import type { EntityName } from "../../entities/entity-catalog";

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
  const { shares, grant, revoke, isGranting, isRevoking, isLoading } = useShare(
    entityName,
    open ? recordId : null,
  );

  const [userId, setUserId] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("read");

  const handleGrant = useCallback(async () => {
    if (!userId.trim()) return;
    await grant({ userId: userId.trim(), permission });
    setUserId("");
  }, [grant, userId, permission]);

  const handleRevoke = useCallback(
    async (targetUserId: string) => {
      await revoke({ userId: targetUserId });
    },
    [revoke],
  );

  return (
    <Modal open={open} onClose={onClose} title={t("share.title")}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Text className="text-sm font-medium mb-1">
              {t("share.userId")}
            </Text>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={t("share.userIdPlaceholder")}
            />
          </div>
          <div>
            <Text className="text-sm font-medium mb-1">
              {t("share.permission")}
            </Text>
            <Select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={permission}
              onChange={(e) =>
                setPermission(e.target.value as "read" | "write")
              }
            >
              <option value="read">{t("share.read")}</option>
              <option value="write">{t("share.write")}</option>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => void handleGrant()}
            loading={isGranting}
            disabled={!userId.trim()}
          >
            {t("share.grant")}
          </Button>
        </div>

        <div className="border-t pt-3">
          <Text className="text-sm font-medium mb-2">
            {t("share.currentShares")}
          </Text>
          {isLoading ? (
            <Text className="text-muted-foreground text-sm">
              {t("share.loading")}
            </Text>
          ) : shares.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t("share.noShares")}
            </Text>
          ) : (
            <ul className="space-y-2">
              {shares.map((share) => (
                <li
                  key={share.userId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <Text className="text-sm font-medium">{share.userId}</Text>
                    <Text className="text-muted-foreground text-xs">
                      {share.permission === "write"
                        ? t("share.write")
                        : t("share.read")}
                    </Text>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRevoke(share.userId)}
                    disabled={isRevoking}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
