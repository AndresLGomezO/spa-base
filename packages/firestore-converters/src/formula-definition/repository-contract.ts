import type {
  CreateFormulaDefinitionInput,
  FormulaDefinition,
  PatchFormulaDefinitionInput,
} from "@repo/formula-definitions/types";

export interface FormulaDefinitionRepository {
  list(tenantId: string): Promise<readonly FormulaDefinition[]>;
  listEnabled(tenantId: string): Promise<readonly FormulaDefinition[]>;
  getById(tenantId: string, id: string): Promise<FormulaDefinition | null>;
  create(
    tenantId: string,
    input: CreateFormulaDefinitionInput,
  ): Promise<FormulaDefinition>;
  update(
    tenantId: string,
    id: string,
    input: PatchFormulaDefinitionInput,
  ): Promise<FormulaDefinition>;
  delete(tenantId: string, id: string): Promise<void>;
}
