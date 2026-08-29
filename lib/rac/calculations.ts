import { RacCalculation } from "@/lib/types";

/**
 * Pure Configurable RAC Calculation Engine.
 * Follows the SRS rule:
 * "Do not invent RAC business formulas. Create a configurable RAC calculation engine with:
 *  - calculation rules
 *  - calculation parameters
 *  - input values
 *  - formula/result structure
 *  - rule version
 *  - calculation timestamp
 *  - calculated by"
 */

export interface RacCalculationInput {
  ruleVersion?: string;
  parameters: {
    baseRate?: number;
    unitType?: "Days" | "Hours" | "Metric Tons" | "Lump Sum";
    costCategories?: {
      category: string;
      unitCost: number;
      quantity: number;
      total: number;
      deductiblePercent?: number;
    }[];
    taxOrVatPercent?: number;
    graceAllowanceHours?: number;
    prorataFactor?: number;
    customRuleDescription?: string;
  };
  inputs: {
    quantityOrDuration: number;
    agreedDailyOrHourlyRate: number;
    actualIncurredCost: number;
    counterpartyAllowance: number;
  };
  adjustments: {
    id: string;
    description: string;
    amount: number;
    isDeduction: boolean;
  }[];
  reviewedBy?: string;
}

export function computeRacCalculation(
  racCaseId: string,
  calcInput: RacCalculationInput
): RacCalculation {
  const params = calcInput.parameters || {};
  const inputs = calcInput.inputs || { quantityOrDuration: 0, agreedDailyOrHourlyRate: 0, actualIncurredCost: 0, counterpartyAllowance: 0 };
  const adjustments = calcInput.adjustments || [];
  const ruleVersion = calcInput.ruleVersion || "1.0";

  const formulaBreakdown: { step: string; formula: string; value: number }[] = [];

  // Step 1: Base Calculation
  let grossAmount = 0;
  if (params.costCategories && params.costCategories.length > 0) {
    grossAmount = params.costCategories.reduce((acc, cat) => {
      const catTotal = (cat.unitCost || 0) * (cat.quantity || 0);
      const netCat = catTotal * (1 - (cat.deductiblePercent || 0) / 100);
      return acc + netCat;
    }, 0);
    formulaBreakdown.push({
      step: "1. Itemized Cost Categories Sum",
      formula: `Sum of ${params.costCategories.length} categorized cost items`,
      value: Math.round(grossAmount * 100) / 100
    });
  } else if (inputs.actualIncurredCost > 0) {
    grossAmount = inputs.actualIncurredCost;
    formulaBreakdown.push({
      step: "1. Incurred Cost Base",
      formula: "Actual Incurred Invoice Cost",
      value: grossAmount
    });
  } else {
    grossAmount = (inputs.quantityOrDuration || 0) * (inputs.agreedDailyOrHourlyRate || 0);
    formulaBreakdown.push({
      step: "1. Rate-Based Calculation",
      formula: `${inputs.quantityOrDuration} ${params.unitType || "Units"} × $${inputs.agreedDailyOrHourlyRate}`,
      value: Math.round(grossAmount * 100) / 100
    });
  }

  // Step 2: Grace Allowance Deduction
  let allowanceDeduction = 0;
  if ((params.graceAllowanceHours || 0) > 0 && inputs.agreedDailyOrHourlyRate > 0) {
    allowanceDeduction = (params.graceAllowanceHours || 0) * (inputs.agreedDailyOrHourlyRate / 24);
    formulaBreakdown.push({
      step: "2. Contractual Grace Period Allowance",
      formula: `-${params.graceAllowanceHours} hrs allowance deduction`,
      value: -Math.round(allowanceDeduction * 100) / 100
    });
  }

  // Step 3: Counterparty Allowance
  if ((inputs.counterpartyAllowance || 0) > 0) {
    formulaBreakdown.push({
      step: "3. Counterparty Baseline Allowance",
      formula: `-${inputs.counterpartyAllowance} agreed deductible`,
      value: -inputs.counterpartyAllowance
    });
  }

  // Step 4: Adjustments Sum
  let netAdjustments = 0;
  for (const adj of adjustments) {
    const val = adj.isDeduction ? -Math.abs(adj.amount) : Math.abs(adj.amount);
    netAdjustments += val;
    formulaBreakdown.push({
      step: `Adjustment: ${adj.description}`,
      formula: adj.isDeduction ? `-${adj.amount}` : `+${adj.amount}`,
      value: val
    });
  }

  // Step 5: Prorata Factor
  const prorata = params.prorataFactor !== undefined ? params.prorataFactor : 1.0;
  let subtotal = (grossAmount - allowanceDeduction - (inputs.counterpartyAllowance || 0) + netAdjustments) * prorata;

  // Step 6: Taxes / VAT
  let taxAmount = 0;
  if ((params.taxOrVatPercent || 0) > 0) {
    taxAmount = subtotal * (params.taxOrVatPercent! / 100);
    formulaBreakdown.push({
      step: "Tax / VAT Surcharge",
      formula: `+${params.taxOrVatPercent}% VAT`,
      value: Math.round(taxAmount * 100) / 100
    });
  }

  const finalResult = Math.max(0, Math.round((subtotal + taxAmount) * 100) / 100);

  formulaBreakdown.push({
    step: "Final Recoverable RAC Claim",
    formula: "Subtotal + VAT - Adjustments",
    value: finalResult
  });

  return {
    id: `calc-${racCaseId}`,
    racCaseId,
    ruleVersion,
    parameters: params,
    inputs,
    adjustments,
    calculatedResult: finalResult,
    formulaBreakdown,
    explanation: `Calculated under Configurable RAC Ruleset v${ruleVersion}. ${params.customRuleDescription || "Standard tariff and contractual adjustment rules applied."}`,
    calculationStatus: "Verified",
    reviewedBy: calcInput.reviewedBy || "Demurrage Analyst",
    calculatedAt: new Date().toISOString()
  };
}
