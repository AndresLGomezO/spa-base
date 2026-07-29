export const LOCALE_PACK_PERMISSIONS = [
  "localePack.read",
  "localePack.create",
  "localePack.update",
  "localePack.delete",
] as const;

export type LocalePackPermission = (typeof LOCALE_PACK_PERMISSIONS)[number];
