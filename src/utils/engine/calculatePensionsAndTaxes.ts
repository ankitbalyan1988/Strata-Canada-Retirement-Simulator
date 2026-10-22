import { CanadianProvince, RetirementInputs, SpouseInputs } from '../../types/retirement';
import { calculateCanadianTax, calculateCppAnnualBenefit, calculateOasGrossBenefit, calculateOasClawback } from '../canadianTax';

export interface GovernmentPensionsResult {
  pCppIncome: number;
  sCppIncome: number;
  pGrossOas: number;
  sGrossOas: number;
}

export interface DecumulationWithdrawals {
  pRrspWithdrawal: number;
  sRrspWithdrawal: number;
  pTfsaWithdrawal: number;
  sTfsaWithdrawal: number;
  pNonRegWithdrawal: number;
  sNonRegWithdrawal: number;
}

export interface RetirementTaxesAndCashflowResult {
  pTaxable: number;
  sTaxable: number;
  pOasClawback: number;
  sOasClawback: number;
  pNetOas: number;
  sNetOas: number;
  pTaxPaid: number;
  sTaxPaid: number;
  totalTaxPaid: number;
  netSpendableCashflow: number;
  cashflowGap: number;
  pMarginalRate: number;
  notes: string[];
}

/**
 * Evaluates CPP and gross OAS benefits for primary and spouse based on start ages and inflation.
 */
export function calculateGovernmentPensionsForYear(
  age: number,
  spouseAge: number | undefined,
  inputs: RetirementInputs,
  isCouple: boolean,
  spouse: SpouseInputs | undefined,
  inflationFactor: number
): GovernmentPensionsResult {
  let pCppIncome = 0;
  let sCppIncome = 0;
  let pGrossOas = 0;
  let sGrossOas = 0;

  if (age >= inputs.cppStartAge) {
    pCppIncome = calculateCppAnnualBenefit(inputs.cppStartAge, inputs.cppEstimatedPercentOfMax, inflationFactor);
  }
  if (age >= inputs.oasStartAge) {
    pGrossOas = calculateOasGrossBenefit(age, inputs.oasStartAge, inputs.oasEligibleYearsInCanada, inflationFactor);
  }

  if (isCouple && spouse && spouseAge !== undefined) {
    if (spouseAge >= spouse.cppStartAge) {
      sCppIncome = calculateCppAnnualBenefit(spouse.cppStartAge, spouse.cppEstimatedPercentOfMax, inflationFactor);
    }
    if (spouseAge >= spouse.oasStartAge) {
      sGrossOas = calculateOasGrossBenefit(spouseAge, spouse.oasStartAge, spouse.oasEligibleYearsInCanada, inflationFactor);
    }
  }

  return {
    pCppIncome,
    sCppIncome,
    pGrossOas,
    sGrossOas
  };
}

/**
 * Calculates CRA Form T1032 pension income splitting, OAS clawback thresholds,
 * federal/provincial income taxes, net spendable cashflow, and decumulation shortfall.
 */
export function calculateRetirementTaxesAndCashflow(
  age: number,
  spouseAge: number | undefined,
  yearIndex: number,
  pensions: GovernmentPensionsResult,
  withdrawals: DecumulationWithdrawals,
  targetSpendingNominal: number,
  province: CanadianProvince,
  isCouple: boolean,
  spouse: SpouseInputs | undefined,
  inflationFactor: number
): RetirementTaxesAndCashflowResult {
  const notes: string[] = [];

  // Pension Income Splitting (CRA Form T1032): Couples 65+ can split up to 50% of eligible pension/RRIF income
  let pRrspTaxable = withdrawals.pRrspWithdrawal;
  let sRrspTaxable = withdrawals.sRrspWithdrawal;

  if (isCouple && spouse && spouse.pensionIncomeSplitting && (age >= 65 || (spouseAge !== undefined && spouseAge >= 65))) {
    const totalRrspTaxable = withdrawals.pRrspWithdrawal + withdrawals.sRrspWithdrawal;
    pRrspTaxable = totalRrspTaxable / 2;
    sRrspTaxable = totalRrspTaxable / 2;
    if (yearIndex % 5 === 0 && age >= 65) {
      notes.push(`Age ${age}: Canadian Pension Income Splitting active (up to 50% RRIF equalized to lower marginal tax).`);
    }
  }

  const pTaxable = pensions.pCppIncome + pensions.pGrossOas + pRrspTaxable + (withdrawals.pNonRegWithdrawal * 0.25);
  const pOasClawback = calculateOasClawback(pensions.pGrossOas, pTaxable, inflationFactor);
  const pNetOas = Math.max(0, pensions.pGrossOas - pOasClawback);

  const pTaxRes = calculateCanadianTax(pTaxable, province, age, age >= 65 ? pRrspTaxable : 0);
  let pTaxPaid = pTaxRes.totalTax + pOasClawback;

  let sTaxable = 0;
  let sOasClawback = 0;
  let sNetOas = 0;
  let sTaxPaid = 0;

  if (isCouple && spouse && spouseAge !== undefined) {
    sTaxable = pensions.sCppIncome + pensions.sGrossOas + sRrspTaxable + (withdrawals.sNonRegWithdrawal * 0.25);
    sOasClawback = calculateOasClawback(pensions.sGrossOas, sTaxable, inflationFactor);
    sNetOas = Math.max(0, pensions.sGrossOas - sOasClawback);

    const sTaxRes = calculateCanadianTax(sTaxable, province, spouseAge, spouseAge >= 65 ? sRrspTaxable : 0);
    sTaxPaid = sTaxRes.totalTax + sOasClawback;
  }

  if (pOasClawback > 0 || sOasClawback > 0) {
    notes.push(
      `Age ${age}: OAS clawback triggered (${pOasClawback > 0 ? `Primary: $${Math.round(pOasClawback)}` : ''}${
        sOasClawback > 0 ? ` Spouse: $${Math.round(sOasClawback)}` : ''
      }).`
    );
  }

  const totalTaxPaid = pTaxPaid + sTaxPaid;
  const totalInflow =
    pensions.pCppIncome +
    pNetOas +
    pensions.sCppIncome +
    sNetOas +
    withdrawals.pRrspWithdrawal +
    withdrawals.sRrspWithdrawal +
    withdrawals.pTfsaWithdrawal +
    withdrawals.sTfsaWithdrawal +
    withdrawals.pNonRegWithdrawal +
    withdrawals.sNonRegWithdrawal;

  const combinedTax = pTaxRes.totalTax + (isCouple && spouseAge !== undefined ? calculateCanadianTax(sTaxable, province, spouseAge, 0).totalTax : 0);
  const netSpendableCashflow = totalInflow - combinedTax;
  let cashflowGap = 0;
  if (netSpendableCashflow < targetSpendingNominal) {
    cashflowGap = targetSpendingNominal - netSpendableCashflow;
  }

  return {
    pTaxable,
    sTaxable,
    pOasClawback,
    sOasClawback,
    pNetOas,
    sNetOas,
    pTaxPaid,
    sTaxPaid,
    totalTaxPaid,
    netSpendableCashflow,
    cashflowGap,
    pMarginalRate: pTaxRes.marginalRate,
    notes
  };
}
