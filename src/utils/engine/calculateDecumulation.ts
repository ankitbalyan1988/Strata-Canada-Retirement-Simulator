import { DrawdownStrategyType, SpouseInputs } from '../../types/retirement';
import { getRrifMinimumRate } from '../canadianTax';
import { CustomAccountState } from './calculateContributions';

export interface DecumulationBalances {
  pRrsp: number;
  sRrsp: number;
  pTfsa: number;
  sTfsa: number;
  pNonReg: number;
  sNonReg: number;
  customAccountsState: CustomAccountState[];
}

export interface DecumulationResult {
  pRrspWithdrawal: number;
  sRrspWithdrawal: number;
  pTfsaWithdrawal: number;
  sTfsaWithdrawal: number;
  pNonRegWithdrawal: number;
  sNonRegWithdrawal: number;
  rrifMinimumWithdrawal: number;
  isRrifMandatory: boolean;
}

/**
 * Executes portfolio decumulation: RRIF statutory minimums, drawdown strategy sequencing
 * (tax_efficient, rrsp_meltdown, tfsa_first, proportional), and sub-account deductions.
 */
export function calculateDecumulationForYear(
  age: number,
  spouseAge: number | undefined,
  yearIndex: number,
  targetSpendingNominal: number,
  guaranteedCash: number,
  drawdownStrategy: DrawdownStrategyType,
  balances: DecumulationBalances,
  isCouple: boolean,
  spouse: SpouseInputs | undefined,
  inflationFactor: number
): DecumulationResult {
  let pRrspWithdrawal = 0;
  let sRrspWithdrawal = 0;
  let pTfsaWithdrawal = 0;
  let sTfsaWithdrawal = 0;
  let pNonRegWithdrawal = 0;
  let sNonRegWithdrawal = 0;

  const isRrifMandatory: boolean = Boolean(age >= 72 || (isCouple && spouse && spouseAge !== undefined && spouseAge >= 72));
  let pRrifMin = 0;
  let sRrifMin = 0;

  if (age >= 72 && balances.pRrsp > 0) {
    pRrifMin = balances.pRrsp * getRrifMinimumRate(age);
  }
  if (isCouple && spouse && spouseAge !== undefined && spouseAge >= 72 && balances.sRrsp > 0) {
    sRrifMin = balances.sRrsp * getRrifMinimumRate(spouseAge);
  }
  const rrifMinimumWithdrawal = pRrifMin + sRrifMin;

  let neededFromPortfolio = Math.max(0, targetSpendingNominal - guaranteedCash);

  // 1. Mandatory RRIF minimums deducted first
  if (pRrifMin > 0) {
    const taken = Math.min(balances.pRrsp, pRrifMin);
    pRrspWithdrawal += taken;
    balances.pRrsp -= taken;
  }
  if (sRrifMin > 0) {
    const taken = Math.min(balances.sRrsp, sRrifMin);
    sRrspWithdrawal += taken;
    balances.sRrsp -= taken;
  }

  const totalRrspTaken = pRrspWithdrawal + sRrspWithdrawal;
  neededFromPortfolio = Math.max(0, neededFromPortfolio - (totalRrspTaken * 0.8));

  // 2. Strategy-based drawdown
  if (drawdownStrategy === 'tax_efficient') {
    // Non-Reg first, then RRSP, then TFSA last
    const totalNonReg = balances.pNonReg + balances.sNonReg;
    if (totalNonReg > 0 && neededFromPortfolio > 0) {
      const draw = Math.min(totalNonReg, neededFromPortfolio);
      const pDraw = (totalNonReg > 0 ? (balances.pNonReg / totalNonReg) * draw : 0);
      const sDraw = draw - pDraw;
      pNonRegWithdrawal += pDraw;
      balances.pNonReg -= pDraw;
      sNonRegWithdrawal += sDraw;
      balances.sNonReg -= sDraw;
      neededFromPortfolio -= draw;
    }

    const totalRrsp = balances.pRrsp + balances.sRrsp;
    if (totalRrsp > 0 && neededFromPortfolio > 0) {
      const drawGross = Math.min(totalRrsp, neededFromPortfolio / 0.78);
      const pDraw = totalRrsp > 0 ? (balances.pRrsp / totalRrsp) * drawGross : 0;
      const sDraw = drawGross - pDraw;
      pRrspWithdrawal += pDraw;
      balances.pRrsp -= pDraw;
      sRrspWithdrawal += sDraw;
      balances.sRrsp -= sDraw;
      neededFromPortfolio -= drawGross * 0.78;
    }

    const totalTfsa = balances.pTfsa + balances.sTfsa;
    if (totalTfsa > 0 && neededFromPortfolio > 0) {
      const draw = Math.min(totalTfsa, neededFromPortfolio);
      const pDraw = totalTfsa > 0 ? (balances.pTfsa / totalTfsa) * draw : 0;
      const sDraw = draw - pDraw;
      pTfsaWithdrawal += pDraw;
      balances.pTfsa -= pDraw;
      sTfsaWithdrawal += sDraw;
      balances.sTfsa -= sDraw;
      neededFromPortfolio -= draw;
    }

  } else if (drawdownStrategy === 'rrsp_meltdown') {
    // Meltdown: accelerate RRSP withdrawals prior to age 71
    const ceiling = 65000 * inflationFactor;
    if (age < 72 && balances.pRrsp > 0) {
      const draw = Math.min(balances.pRrsp, Math.max(pRrifMin, ceiling));
      pRrspWithdrawal += draw;
      balances.pRrsp -= draw;
    }
    if (isCouple && spouse && spouseAge !== undefined && spouseAge < 72 && balances.sRrsp > 0) {
      const draw = Math.min(balances.sRrsp, Math.max(sRrifMin, ceiling));
      sRrspWithdrawal += draw;
      balances.sRrsp -= draw;
    }

    let rem = Math.max(0, targetSpendingNominal - (guaranteedCash + (pRrspWithdrawal + sRrspWithdrawal) * 0.78));
    const totalNonReg = balances.pNonReg + balances.sNonReg;
    if (totalNonReg > 0 && rem > 0) {
      const draw = Math.min(totalNonReg, rem);
      const pDraw = Math.min(balances.pNonReg, draw / 2);
      pNonRegWithdrawal += pDraw;
      balances.pNonReg -= pDraw;
      const sDraw = Math.min(balances.sNonReg, draw / 2);
      sNonRegWithdrawal += sDraw;
      balances.sNonReg -= sDraw;
      rem -= draw;
    }
    const totalTfsa = balances.pTfsa + balances.sTfsa;
    if (totalTfsa > 0 && rem > 0) {
      const draw = Math.min(totalTfsa, rem);
      const pDraw = Math.min(balances.pTfsa, draw / 2);
      pTfsaWithdrawal += pDraw;
      balances.pTfsa -= pDraw;
      const sDraw = Math.min(balances.sTfsa, draw / 2);
      sTfsaWithdrawal += sDraw;
      balances.sTfsa -= sDraw;
      rem -= draw;
    }

  } else {
    // Proportional or TFSA first
    const totalTfsa = balances.pTfsa + balances.sTfsa;
    if (drawdownStrategy === 'tfsa_first' && totalTfsa > 0 && neededFromPortfolio > 0) {
      const draw = Math.min(totalTfsa, neededFromPortfolio);
      const pDraw = Math.min(balances.pTfsa, draw / 2);
      pTfsaWithdrawal += pDraw;
      balances.pTfsa -= pDraw;
      const sDraw = Math.min(balances.sTfsa, draw / 2);
      sTfsaWithdrawal += sDraw;
      balances.sTfsa -= sDraw;
      neededFromPortfolio -= draw;
    }

    const totalLiquid = balances.pRrsp + balances.sRrsp + balances.pNonReg + balances.sNonReg + balances.pTfsa + balances.sTfsa;
    if (totalLiquid > 0 && neededFromPortfolio > 0) {
      const rrspTotal = balances.pRrsp + balances.sRrsp;
      const nonRegTotal = balances.pNonReg + balances.sNonReg;
      const tfsaTotal = balances.pTfsa + balances.sTfsa;

      const fromRrsp = Math.min(rrspTotal, (neededFromPortfolio * (rrspTotal / totalLiquid)) / 0.8);
      const pRrspDraw = balances.pRrsp > 0 ? fromRrsp * (balances.pRrsp / (rrspTotal || 1)) : 0;
      pRrspWithdrawal += pRrspDraw;
      balances.pRrsp -= pRrspDraw;
      const sRrspDraw = balances.sRrsp > 0 ? fromRrsp * (balances.sRrsp / (rrspTotal || 1)) : 0;
      sRrspWithdrawal += sRrspDraw;
      balances.sRrsp -= sRrspDraw;

      const fromNonReg = Math.min(nonRegTotal, neededFromPortfolio * (nonRegTotal / totalLiquid));
      const pNonRegDraw = balances.pNonReg > 0 ? fromNonReg * (balances.pNonReg / (nonRegTotal || 1)) : 0;
      pNonRegWithdrawal += pNonRegDraw;
      balances.pNonReg -= pNonRegDraw;
      const sNonRegDraw = balances.sNonReg > 0 ? fromNonReg * (balances.sNonReg / (nonRegTotal || 1)) : 0;
      sNonRegWithdrawal += sNonRegDraw;
      balances.sNonReg -= sNonRegDraw;

      const fromTfsa = Math.min(tfsaTotal, neededFromPortfolio * (tfsaTotal / totalLiquid));
      const pTfsaDraw = balances.pTfsa > 0 ? fromTfsa * (balances.pTfsa / (tfsaTotal || 1)) : 0;
      pTfsaWithdrawal += pTfsaDraw;
      balances.pTfsa -= pTfsaDraw;
      const sTfsaDraw = balances.sTfsa > 0 ? fromTfsa * (balances.sTfsa / (tfsaTotal || 1)) : 0;
      sTfsaWithdrawal += sTfsaDraw;
      balances.sTfsa -= sTfsaDraw;
    }
  }

  // 3. Deduct withdrawals from custom Non-Reg sub-accounts if present
  if (balances.customAccountsState && balances.customAccountsState.length > 0 && pNonRegWithdrawal > 0) {
    let remainingWithdrawal = pNonRegWithdrawal;
    const simYear = 2026 + yearIndex;
    const liquidAccounts = balances.customAccountsState.filter(
      (a) => a.category !== 'gic' || (a.gicCloseYear && simYear >= a.gicCloseYear)
    );
    const totalLiquid = liquidAccounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0);

    if (totalLiquid > 0) {
      const drawAmt = Math.min(totalLiquid, remainingWithdrawal);
      liquidAccounts.forEach((a) => {
        const share = a.balance > 0 ? (a.balance / totalLiquid) * drawAmt : 0;
        a.balance = Math.max(0, a.balance - share);
      });
      remainingWithdrawal -= drawAmt;
    }

    if (remainingWithdrawal > 0) {
      const remainingAccounts = balances.customAccountsState.filter((a) => a.balance > 0);
      const totalRemaining = remainingAccounts.reduce((sum, a) => sum + a.balance, 0);
      if (totalRemaining > 0) {
        remainingAccounts.forEach((a) => {
          const share = a.balance > 0 ? (a.balance / totalRemaining) * remainingWithdrawal : 0;
          a.balance = Math.max(0, a.balance - share);
        });
      }
    }
  }

  return {
    pRrspWithdrawal,
    sRrspWithdrawal,
    pTfsaWithdrawal,
    sTfsaWithdrawal,
    pNonRegWithdrawal,
    sNonRegWithdrawal,
    rrifMinimumWithdrawal,
    isRrifMandatory
  };
}
