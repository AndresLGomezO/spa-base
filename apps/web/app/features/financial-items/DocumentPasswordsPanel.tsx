import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Heading,
  Input,
  Modal,
  PageLoader,
  Text,
  toast,
} from "@repo/ui";
import { KeyRound, Pencil, Trash2 } from "lucide-react";

import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import {
  DOCUMENT_PASSWORD_TYPES,
  deleteDocumentPassword,
  getDocumentPasswords,
  putDocumentPassword,
  type DocumentPasswordType,
} from "./document-passwords-api";

function documentPasswordsQueryKey(financialItemId: string) {
  return ["financial-item-document-passwords", financialItemId] as const;
}

export function DocumentPasswordsPanel({
  financialItemId,
}: {
  readonly financialItemId: string;
}) {
  const { t } = useTranslation("common");
  const permissions = useEntityPermissions("financialItem");
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<DocumentPasswordType | null>(
    null,
  );
  const [password, setPassword] = useState("");

  const query = useQuery({
    queryKey: documentPasswordsQueryKey(financialItemId),
    queryFn: () => getDocumentPasswords(financialItemId),
    enabled: permissions.canUpdate,
  });

  const setMutation = useMutation({
    mutationFn: ({
      documentType,
      nextPassword,
    }: {
      documentType: DocumentPasswordType;
      nextPassword: string;
    }) => putDocumentPassword(financialItemId, documentType, nextPassword),
    onSuccess: async (data) => {
      queryClient.setQueryData(
        documentPasswordsQueryKey(financialItemId),
        data,
      );
      toast.success(t("financialItems.documentPasswords.saveSuccess"));
      setEditingType(null);
      setPassword("");
    },
    onError: () => {
      toast.error(t("financialItems.documentPasswords.saveFailed"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (documentType: DocumentPasswordType) =>
      deleteDocumentPassword(financialItemId, documentType),
    onSuccess: async (data) => {
      queryClient.setQueryData(
        documentPasswordsQueryKey(financialItemId),
        data,
      );
      toast.success(t("financialItems.documentPasswords.removeSuccess"));
    },
    onError: () => {
      toast.error(t("financialItems.documentPasswords.removeFailed"));
    },
  });

  if (!permissions.canUpdate) {
    return null;
  }

  const setTypes = new Set(query.data?.documentTypes ?? []);

  return (
    <div
      className="bg-card border-border space-y-3 rounded-lg border p-4"
      data-testid="document-passwords-panel"
    >
      <div className="flex items-start gap-2">
        <KeyRound className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <Heading level={2} className="text-base">
            {t("financialItems.documentPasswords.title")}
          </Heading>
          <Text className="text-muted-foreground text-sm">
            {t("financialItems.documentPasswords.description")}
          </Text>
        </div>
      </div>

      {query.isLoading ? (
        <PageLoader ariaLabel={t("loading")} />
      ) : query.isError ? (
        <Alert>{t("financialItems.documentPasswords.loadFailed")}</Alert>
      ) : (
        <ul className="divide-border divide-y rounded-md border">
          {DOCUMENT_PASSWORD_TYPES.map((documentType) => {
            const isSet = setTypes.has(documentType);
            return (
              <li
                key={documentType}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Text className="text-sm font-medium">{documentType}</Text>
                  <span
                    className={
                      isSet
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        : "bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    }
                  >
                    {isSet
                      ? t("financialItems.documentPasswords.statusSet")
                      : t("financialItems.documentPasswords.statusNotSet")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={setMutation.isPending || removeMutation.isPending}
                    onClick={() => {
                      setEditingType(documentType);
                      setPassword("");
                    }}
                    data-testid={`document-password-set-${documentType}`}
                  >
                    <Pencil className="mr-1 size-3.5" />
                    {isSet
                      ? t("financialItems.documentPasswords.update")
                      : t("financialItems.documentPasswords.set")}
                  </Button>
                  {isSet ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        setMutation.isPending || removeMutation.isPending
                      }
                      loading={
                        removeMutation.isPending &&
                        removeMutation.variables === documentType
                      }
                      onClick={() => removeMutation.mutate(documentType)}
                      data-testid={`document-password-remove-${documentType}`}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      {t("financialItems.documentPasswords.remove")}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={editingType !== null}
        onClose={() => {
          if (setMutation.isPending) return;
          setEditingType(null);
          setPassword("");
        }}
        title={
          editingType
            ? t("financialItems.documentPasswords.modalTitle", {
                documentType: editingType,
              })
            : t("financialItems.documentPasswords.title")
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={setMutation.isPending}
              onClick={() => {
                setEditingType(null);
                setPassword("");
              }}
            >
              {t("financialItems.documentPasswords.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!password.trim() || setMutation.isPending}
              loading={setMutation.isPending}
              onClick={() => {
                if (!editingType || !password.trim()) return;
                setMutation.mutate({
                  documentType: editingType,
                  nextPassword: password,
                });
              }}
              data-testid="document-password-save"
            >
              {t("financialItems.documentPasswords.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Text className="text-muted-foreground text-sm">
            {t("financialItems.documentPasswords.modalHint")}
          </Text>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t(
              "financialItems.documentPasswords.passwordPlaceholder",
            )}
            aria-label={t(
              "financialItems.documentPasswords.passwordPlaceholder",
            )}
            data-testid="document-password-input"
          />
        </div>
      </Modal>
    </div>
  );
}
