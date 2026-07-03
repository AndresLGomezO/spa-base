import {
  collectFormulaNames,
  walkExpressionNodes,
  type ExpressionNode,
} from "@repo/hooks";

import type { PortableFormulaDefinition } from "./types.js";

export interface FormulaCatalogValidationError {
  readonly path: string;
  readonly message: string;
}

function collectInputRefs(node: ExpressionNode): readonly string[] {
  const names: string[] = [];
  walkExpressionNodes(node, (current) => {
    if (current.kind === "input") {
      names.push(current.name);
    }
  });
  return names;
}

function detectCycle(
  name: string,
  formulasByName: ReadonlyMap<string, PortableFormulaDefinition>,
  visiting: Set<string>,
  visited: Set<string>,
  path: string[],
): readonly FormulaCatalogValidationError[] {
  if (visited.has(name)) {
    return [];
  }
  if (visiting.has(name)) {
    return [
      {
        path: `formulaDefinitions.${name}`,
        message: `Circular formula dependency: ${[...path, name].join(" → ")}.`,
      },
    ];
  }

  const formula = formulasByName.get(name);
  if (!formula) {
    return [];
  }

  visiting.add(name);
  path.push(name);
  const errors: FormulaCatalogValidationError[] = [];

  for (const referencedName of collectFormulaNames(formula.body)) {
    errors.push(
      ...detectCycle(referencedName, formulasByName, visiting, visited, path),
    );
  }

  path.pop();
  visiting.delete(name);
  visited.add(name);
  return errors;
}

export function validateFormulaCatalog(
  formulas: readonly PortableFormulaDefinition[],
  availableFormulaNames: ReadonlySet<string> = new Set(),
): readonly FormulaCatalogValidationError[] {
  const errors: FormulaCatalogValidationError[] = [];
  const formulasByName = new Map<string, PortableFormulaDefinition>();
  const inputNamesByFormula = new Map<string, ReadonlySet<string>>();

  for (const [index, formula] of formulas.entries()) {
    const pathPrefix = `formulaDefinitions[${index}]`;
    if (formulasByName.has(formula.name)) {
      errors.push({
        path: `${pathPrefix}.name`,
        message: `Duplicate formula name "${formula.name}".`,
      });
    }
    formulasByName.set(formula.name, formula);
    inputNamesByFormula.set(
      formula.name,
      new Set(formula.inputs.map((input) => input.name)),
    );
  }

  for (const [index, formula] of formulas.entries()) {
    const pathPrefix = `formulaDefinitions[${index}]`;
    const declaredInputs = inputNamesByFormula.get(formula.name) ?? new Set();

    for (const inputName of collectInputRefs(formula.body)) {
      if (!declaredInputs.has(inputName)) {
        errors.push({
          path: `${pathPrefix}.body`,
          message: `Formula "${formula.name}" references undeclared input "${inputName}".`,
        });
      }
    }

    for (const referencedName of collectFormulaNames(formula.body)) {
      if (
        !formulasByName.has(referencedName) &&
        !availableFormulaNames.has(referencedName)
      ) {
        errors.push({
          path: `${pathPrefix}.body`,
          message: `Formula "${formula.name}" references unknown formula "${referencedName}".`,
        });
      }
    }
  }

  const visited = new Set<string>();
  for (const formula of formulas) {
    errors.push(
      ...detectCycle(
        formula.name,
        formulasByName,
        new Set<string>(),
        visited,
        [],
      ),
    );
  }

  return errors;
}

export function listFormulaDependencyNames(
  formula: PortableFormulaDefinition,
): readonly string[] {
  return collectFormulaNames(formula.body);
}
