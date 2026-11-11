import { RetirementInputs, StressTestOptions } from '../../types/retirement';
import { CustomAccountState } from './calculateContributions';

export interface InvestmentBalances {
  pRrsp: number;
  sRrsp: number;
  pTfsa: number;
  sTfsa: number;
  pFhsa: number;
  sFhsa: number;
  pNonReg: number;
  sNonReg: number;
  customAccountsState: CustomAccountState[];
}

export interface InvestmentContributions {
  pRrspContrib: number;
  pTfsaContrib: number;
  pFhsaContrib: number;
  pNonRegContrib: number;
  sRrspContrib: number;
  sTfsaContrib: number;
  sFhsaContrib: number;
  sNonRegContrib: number;
}

export interface InvestmentReturnsResult {
  totalGrowth: number;
  pRrspGrowth: number;
  pTfsaGrowth: number;
  pFhsaGrowth: number;
  pNonRegGrowth: number;
  sRrspGrowth: number;
  sTfsaGrowth: number;
  sFhsaGrowth: number;
  sNonRegGrowth: number;
  notes: string[];
}

/**
 * Compounds registered and non-registered balances, accounts for yield tax friction,
 * handles GIC maturity events, and executes stress test shocks.
 */
export function calculateInvestmentReturnsForYear(
  age: number,
  retirementAge: number,
  yearIndex: number,
  inputs: RetirementInputs,
  balances: InvestmentBalances,
  contributions: InvestmentContributions,
  isRetired: boolean,
  isPrimaryRetired: boolean,
  stressTest?: StressTestOptions
): InvestmentReturnsResult {
  const notes: string[] = [];
  const ar = inputs.accountReturns;
  const nonRegYieldTaxRate = inputs.nonRegYieldTaxRate;

  let rrspRate = (isRetired ? (ar?.rrspPostReturn ?? ar?.rrspReturn ?? 6.5) : (ar?.rrspReturn ?? 6.5)) / 100;
  let tfsaRate = (isRetired ? (ar?.tfsaPostReturn ?? ar?.tfsaReturn ?? 7.0) : (ar?.tfsaReturn ?? 7.0)) / 100;
  let fhsaRate = (ar?.fhsaReturn ?? 6.0) / 100;
  let nonRegBaseRate = (isRetired ? (ar?.nonRegPostReturn ?? ar?.nonRegReturn ?? 5.5) : (ar?.nonRegReturn ?? 5.5)) / 100;

  // Apply Market Stress Test
  if (stressTest?.enabled) {
    const drop = (stressTest.dropPercent || 10) / 100;
    const isShockYear =
      (stressTest.timing === 'immediate' && yearIndex === 0) ||
      (stressTest.timing === 'custom' && stressTest.customAge !== undefined && age === stressTest.customAge) ||
      ((stressTest.timing === 'at_retirement' || !stressTest.timing) && age === retirementAge);

    if (isShockYear) {
      rrspRate = -drop;
      tfsaRate = -drop;
      fhsaRate = -drop;
      nonRegBaseRate = -drop;
      const timingDesc = stressTest.timing === 'immediate'
        ? 'immediate market downturn'
        : stressTest.timing === 'custom'
        ? `market shock simulated at Age ${stressTest.customAge ?? age}`
        : 'market shock simulated at retirement';
      notes.push(`🚨 Stress Test: -${stressTest.dropPercent}% ${timingDesc}.`);
    }
  }

  const netNonRegReturn = Math.max(-1, nonRegBaseRate - (nonRegYieldTaxRate / 100));

  const pRrspGrowth = (balances.pRrsp + contributions.pRrspContrib) * rrspRate;
  const pTfsaGrowth = (balances.pTfsa + contributions.pTfsaContrib) * tfsaRate;
  const pFhsaGrowth = (balances.pFhsa + contributions.pFhsaContrib) * fhsaRate;
  let pNonRegGrowth = 0;

  const hasCustomNonReg = Boolean(balances.customAccountsState && balances.customAccountsState.length > 0);

  if (hasCustomNonReg) {
    const simYear = 2026 + yearIndex;
    balances.customAccountsState.forEach((acc) => {
      let accRate = acc.expectedReturn / 100;

      // Apply Stress Test shock if active
      if (stressTest?.enabled) {
        const drop = (stressTest.dropPercent || 10) / 100;
        const isShockYear =
          (stressTest.timing === 'immediate' && yearIndex === 0) ||
          (stressTest.timing === 'custom' && stressTest.customAge !== undefined && age === stressTest.customAge) ||
          ((stressTest.timing === 'at_retirement' || !stressTest.timing) && age === retirementAge);

        if (isShockYear) {
          accRate = -drop;
        }
      }

      // GIC Maturity check
      if (acc.category === 'gic') {
        const closeYr = acc.gicCloseYear || 2028;
        if (simYear > closeYr) {
          accRate = nonRegBaseRate;
        } else if (simYear === closeYr && !acc.matured) {
          acc.matured = true;
          notes.push(
            `🔒 GIC "${acc.name}" reached close date in ${simYear} ($${Math.round(
              acc.balance
            ).toLocaleString()}) and rolled into liquid Non-Reg.`
          );
        }
      }

      // Yield tax drag
      const netAccReturn = Math.max(-1, accRate - (nonRegYieldTaxRate / 100));
      const accContrib = isPrimaryRetired ? 0 : (acc.currentContribution || 0);
      const accGrowth = (acc.balance + accContrib) * netAccReturn;

      acc.balance += accContrib + accGrowth;
      pNonRegGrowth += accGrowth;
    });

    balances.pNonReg = balances.customAccountsState.reduce((sum, a) => sum + a.balance, 0);
  } else {
    pNonRegGrowth = (balances.pNonReg + contributions.pNonRegContrib) * netNonRegReturn;
    balances.pNonReg += contributions.pNonRegContrib + pNonRegGrowth;
  }

  const sRrspGrowth = (balances.sRrsp + contributions.sRrspContrib) * rrspRate;
  const sTfsaGrowth = (balances.sTfsa + contributions.sTfsaContrib) * tfsaRate;
  const sFhsaGrowth = (balances.sFhsa + contributions.sFhsaContrib) * fhsaRate;
  const sNonRegGrowth = (balances.sNonReg + contributions.sNonRegContrib) * netNonRegReturn;

  const totalGrowth = pRrspGrowth + pTfsaGrowth + pFhsaGrowth + pNonRegGrowth + sRrspGrowth + sTfsaGrowth + sFhsaGrowth + sNonRegGrowth;

  balances.pRrsp += contributions.pRrspContrib + pRrspGrowth;
  balances.pTfsa += contributions.pTfsaContrib + pTfsaGrowth;
  balances.pFhsa += contributions.pFhsaContrib + pFhsaGrowth;

  balances.sRrsp += contributions.sRrspContrib + sRrspGrowth;
  balances.sTfsa += contributions.sTfsaContrib + sTfsaGrowth;
  balances.sFhsa += contributions.sFhsaContrib + sFhsaGrowth;
  balances.sNonReg += contributions.sNonRegContrib + sNonRegGrowth;

  return {
    totalGrowth,
    pRrspGrowth,
    pTfsaGrowth,
    pFhsaGrowth,
    pNonRegGrowth,
    sRrspGrowth,
    sTfsaGrowth,
    sFhsaGrowth,
    sNonRegGrowth,
    notes
  };
}
