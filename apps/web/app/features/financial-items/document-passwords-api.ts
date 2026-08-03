import { apiRequest } from "../../lib/api-client";

export const DOCUMENT_PASSWORD_TYPES = [
  "STATEMENT",
  "RECEIPT",
  "CONTRACT",
  "INVOICE",
  "SUPPORT",
  "OTHER",
] as const;

export type DocumentPasswordType = (typeof DOCUMENT_PASSWORD_TYPES)[number];

type DocumentPasswordsResponse = {
  readonly documentTypes: readonly DocumentPasswordType[];
};

export function getDocumentPasswords(
  financialItemId: string,
): Promise<DocumentPasswordsResponse> {
  return apiRequest<DocumentPasswordsResponse>(
    `/api/financial-items/${encodeURIComponent(financialItemId)}/document-passwords`,
  );
}

export function putDocumentPassword(
  financialItemId: string,
  documentType: DocumentPasswordType,
  password: string,
): Promise<DocumentPasswordsResponse> {
  return apiRequest<DocumentPasswordsResponse>(
    `/api/financial-items/${encodeURIComponent(financialItemId)}/document-passwords/${encodeURIComponent(documentType)}`,
    {
      method: "PUT",
      body: { password },
    },
  );
}

export function deleteDocumentPassword(
  financialItemId: string,
  documentType: DocumentPasswordType,
): Promise<DocumentPasswordsResponse> {
  return apiRequest<DocumentPasswordsResponse>(
    `/api/financial-items/${encodeURIComponent(financialItemId)}/document-passwords/${encodeURIComponent(documentType)}`,
    {
      method: "DELETE",
    },
  );
}
