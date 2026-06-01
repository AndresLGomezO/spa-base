import type { FieldDefinitionRecord } from "@repo/dynamic-entities";

interface RatesListFieldUiFlags {
  readonly filterable: boolean;
  readonly sortable: boolean;
  readonly searchable: boolean;
}

const NONE: RatesListFieldUiFlags = {
  filterable: false,
  sortable: false,
  searchable: false,
};

const TEXT_LABEL: RatesListFieldUiFlags = {
  filterable: false,
  sortable: false,
  searchable: true,
};

const TEXT_OTHER: RatesListFieldUiFlags = {
  filterable: false,
  sortable: false,
  searchable: false,
};

const LOOKUP_CODE: RatesListFieldUiFlags = {
  filterable: false,
  sortable: true,
  searchable: true,
};

const LOOKUP_FK: RatesListFieldUiFlags = {
  filterable: true,
  sortable: false,
  searchable: false,
};

const DATE: RatesListFieldUiFlags = {
  filterable: true,
  sortable: true,
  searchable: false,
};

const BOOLEAN: RatesListFieldUiFlags = {
  filterable: true,
  sortable: true,
  searchable: false,
};

const INTEGER_SORT: RatesListFieldUiFlags = {
  filterable: false,
  sortable: true,
  searchable: false,
};

const DECIMAL_SORT: RatesListFieldUiFlags = {
  filterable: false,
  sortable: true,
  searchable: false,
};

const SUBSCRIPTION_SEARCH_TEXT: RatesListFieldUiFlags = {
  filterable: false,
  sortable: false,
  searchable: true,
};

const HIDDEN_LOOKUP_ENTITIES = new Set([
  "productType",
  "accountType",
  "categoryType",
  "frequency",
  "status",
  "rateType",
  "compoundingFrequency",
  "amortizationType",
  "transactionType",
  "cashflowDirection",
  "incomeType",
  "variabilityType",
  "riskLevel",
  "currency",
]);

function isLookupEntity(entityName: string): boolean {
  return HIDDEN_LOOKUP_ENTITIES.has(entityName);
}

function isRelationField(field: FieldDefinitionRecord): boolean {
  return field.type === "relation" && !!field.relation;
}

export function resolveRatesListFieldUi(
  entityName: string,
  field: FieldDefinitionRecord,
): RatesListFieldUiFlags {
  if (field.sensitive) {
    return NONE;
  }

  if (isLookupEntity(entityName)) {
    if (field.name === "code") {
      return LOOKUP_CODE;
    }
    if (field.type === "number" && field.numberKind === "integer") {
      return INTEGER_SORT;
    }
    return NONE;
  }

  if (field.name === "description" || field.name === "liquidity") {
    return TEXT_OTHER;
  }

  if (field.type === "string") {
    if (field.name === "name") {
      return TEXT_LABEL;
    }
    if (
      entityName === "subscriptionDetail" &&
      (field.name === "provider" || field.name === "planName")
    ) {
      return SUBSCRIPTION_SEARCH_TEXT;
    }
    return TEXT_OTHER;
  }

  if (isRelationField(field)) {
    return LOOKUP_FK;
  }

  if (field.type === "date") {
    return DATE;
  }

  if (field.type === "boolean") {
    return BOOLEAN;
  }

  if (field.type === "number" && field.numberKind === "integer") {
    return INTEGER_SORT;
  }

  if (field.type === "number") {
    if (entityName === "transactionSource" && field.name === "percentage") {
      return DECIMAL_SORT;
    }
    return NONE;
  }

  return NONE;
}
