import type { PortableFormulaDefinition } from "./types.js";
import {
  annuityPaymentBody,
  inputRef,
  simpleInterestBody,
} from "./math-formula-nodes.js";

function platform(
  name: string,
  description: string,
  body: PortableFormulaDefinition["body"],
  inputs: PortableFormulaDefinition["inputs"] = [],
): PortableFormulaDefinition {
  return {
    name,
    description,
    inputs,
    body,
    enabled: true,
    source: "platform",
  };
}

export function buildMathFormulas(): readonly PortableFormulaDefinition[] {
  return [
    platform(
      "annuityPayment",
      "Math: fixed payment for equal installments",
      annuityPaymentBody(
        inputRef("principal"),
        inputRef("ratePerPeriod"),
        inputRef("periods"),
      ),
      [
        { name: "principal", required: true },
        { name: "ratePerPeriod", required: true },
        { name: "periods", required: true },
      ],
    ),
    platform(
      "simpleInterest",
      "Math: simple interest for one period (amount × rate)",
      simpleInterestBody(inputRef("amount"), inputRef("rate")),
      [
        { name: "amount", required: true },
        { name: "rate", required: true },
      ],
    ),
  ];
}
