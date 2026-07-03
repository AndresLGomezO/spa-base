import type { FormulaDefinitionRepository } from "./repository-contract.js";
import type { FormulaResolver } from "@repo/hooks";

import {
  createFormulaResolverFromRecords,
  getPlatformFormulaNames,
  listAvailableFormulaNames,
} from "./resolve-formula.js";
import type { FormulaDefinition } from "./types.js";

export class FormulaRuntimeContext {
  private readonly tenantResolvers = new Map<string, FormulaResolver>();
  private readonly tenantFormulaNames = new Map<string, ReadonlySet<string>>();

  constructor(
    private readonly formulaDefinitionRepository: FormulaDefinitionRepository,
  ) {}

  get repository(): FormulaDefinitionRepository {
    return this.formulaDefinitionRepository;
  }

  async getFormulaResolver(tenantId: string): Promise<FormulaResolver> {
    const cached = this.tenantResolvers.get(tenantId);
    if (cached) {
      return cached;
    }

    const tenantRecords =
      await this.formulaDefinitionRepository.listEnabled(tenantId);
    const resolver = createFormulaResolverFromRecords(tenantRecords);
    this.tenantResolvers.set(tenantId, resolver);
    this.tenantFormulaNames.set(
      tenantId,
      listAvailableFormulaNames(tenantRecords),
    );
    return resolver;
  }

  async getAvailableFormulaNames(
    tenantId: string,
  ): Promise<ReadonlySet<string>> {
    if (!this.tenantFormulaNames.has(tenantId)) {
      await this.getFormulaResolver(tenantId);
    }
    return (
      this.tenantFormulaNames.get(tenantId) ??
      new Set(getPlatformFormulaNames())
    );
  }

  invalidateTenant(tenantId: string): void {
    this.tenantResolvers.delete(tenantId);
    this.tenantFormulaNames.delete(tenantId);
  }

  syncFormula(definition: FormulaDefinition): void {
    this.invalidateTenant(definition.tenantId);
  }
}

export function createFormulaRuntimeContext(
  formulaDefinitionRepository: FormulaDefinitionRepository,
): FormulaRuntimeContext {
  return new FormulaRuntimeContext(formulaDefinitionRepository);
}
