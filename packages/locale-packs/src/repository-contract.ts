import type {
  CreateLocalePackInput,
  LocalePack,
  PatchLocalePackInput,
} from "./types.js";

export interface LocalePackRepository {
  list(tenantId: string): Promise<readonly LocalePack[]>;
  getById(tenantId: string, id: string): Promise<LocalePack | null>;
  getByLocale(tenantId: string, locale: string): Promise<LocalePack | null>;
  create(tenantId: string, input: CreateLocalePackInput): Promise<LocalePack>;
  update(
    tenantId: string,
    id: string,
    input: PatchLocalePackInput,
  ): Promise<LocalePack>;
  delete(tenantId: string, id: string): Promise<void>;
}
