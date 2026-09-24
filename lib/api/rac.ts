import { RacCase, RacCalculation } from "@/lib/types";
import {
  getStoreRacCases,
  getStoreRacCaseById,
  createStoreRacCase,
  updateStoreRacCase,
  deleteStoreRacCase
} from "@/lib/mock/clientStore";

export async function getRacCases(params?: {
  status?: string;
  racType?: string;
  client?: string;
  claimId?: string;
  search?: string;
}): Promise<RacCase[]> {
  return getStoreRacCases(params);
}

export async function getRacCaseById(id: string): Promise<RacCase | null> {
  return getStoreRacCaseById(id);
}

export async function createRacCase(racData: Partial<RacCase>): Promise<RacCase> {
  return createStoreRacCase(racData);
}

export async function updateRacCase(id: string, updates: Partial<RacCase>): Promise<RacCase> {
  return updateStoreRacCase(id, updates);
}

export async function deleteRacCase(id: string): Promise<boolean> {
  return deleteStoreRacCase(id);
}

export async function runRacCalculation(
  racCaseIdOrPayload: string | { racCaseId: string; [key: string]: any },
  calculationInput?: any
): Promise<{ calculation: RacCalculation }> {
  const caseId = typeof racCaseIdOrPayload === "object" ? racCaseIdOrPayload.racCaseId : racCaseIdOrPayload;
  const currentCase = getStoreRacCaseById(caseId);

  const baseRate = calculationInput?.baseRate || 25000;
  const days = calculationInput?.days || 2.5;
  const calculated = Math.round(baseRate * days);

  const calculation: RacCalculation = {
    id: `calc-rac-${Date.now()}`,
    racCaseId: caseId,
    ruleVersion: "RAC-2024.1",
    parameters: {
      baseRate,
      unitType: "Days",
      taxOrVatPercent: 0,
      graceAllowanceHours: 6
    },
    inputs: {
      quantityOrDuration: days,
      agreedDailyOrHourlyRate: baseRate,
      actualIncurredCost: calculated,
      counterpartyAllowance: 0
    },
    adjustments: [
      {
        id: "adj-1",
        description: "Contractual deductible 10%",
        amount: Math.round(calculated * 0.1),
        isDeduction: true
      }
    ],
    calculatedResult: Math.round(calculated * 0.9),
    formulaBreakdown: [
      { step: "Gross Laytime Claim", formula: "Base Rate x Excess Days", value: calculated },
      { step: "Contractual Deductible", formula: "Gross x 10%", value: -Math.round(calculated * 0.1) },
      { step: "Net Recoverable Additional Cost", formula: "Gross - Deductible", value: Math.round(calculated * 0.9) }
    ],
    explanation: "Calculated based on standard contractual demurrage recoverable audit terms.",
    calculationStatus: "Verified",
    reviewedBy: "Elena Rostova",
    calculatedAt: new Date().toISOString()
  };

  if (currentCase) {
    updateStoreRacCase(caseId, {
      calculation,
      outstandingAmount: calculation.calculatedResult
    });
  }

  return { calculation };
}
