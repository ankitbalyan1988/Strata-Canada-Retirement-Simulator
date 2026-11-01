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
  pRrifWithdrawal: number;
  sRrifWithdrawal: number;
  pTfsaWithdrawal: number;
  sTfsaWithdrawal: number;
  pNonRegWithdrawal: number;
  sNonRegWithdrawal: number;
  rrifMinimumWithdrawal: number;
  isRrifMandatory: boolean;
  isRrifMinMet: boolean;
}

/**
 * Executes portfolio decumulation: RRIF statutory minimums, drawdown strategy sequencing
 * (tax_efficient, rrsp_meltdown, tfsa_first, proportional, minimize_overall_tax, maximize_govt_pensions, minimize_post_retirement_tax),
 * and sub-account deductions.
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
  inflationFactor: number,
  meltdownOptions?: {
    startAge?: number;
    targetStrategy?: 'bracket1' | 'oas_threshold' | 'even_meltdown';
  }
): DecumulationResult {
  let pRegisteredWithdrawal = 0;
  let sRegisteredWithdrawal = 0;
  let pTfsaWithdrawal = 0;
  let sTfsaWithdrawal = 0;
  let pNonRegWithdrawal = 0;
  let sNonRegWithdrawal = 0;

  const isPrimaryRrif = age >= 72;
  const isSpouseRrif = isCouple && spouse && spouseAge !== undefined && spouseAge >= 72;
  const isRrifMandatory: boolean = Boolean(isPrimaryRrif || isSpouseRrif);

  let pRrifMin = 0;
  let sRrifMin = 0;

  if (isPrimaryRrif && balances.pRrsp > 0) {
    pRrifMin = balances.pRrsp * getRrifMinimumRate(age);
  }
  if (isSpouseRrif && balances.sRrsp > 0) {
    sRrifMin = balances.sRrsp * getRrifMinimumRate(spouseAge!);
  }
  const rrifMinimumWithdrawal = pRrifMin + sRrifMin;

  let neededFromPortfolio = Math.max(0, targetSpendingNominal - guaranteedCash);

  // 1. Mandatory RRIF minimums deducted first
  if (pRrifMin > 0) {
    const taken = Math.min(balances.pRrsp, pRrifMin);
    pRegisteredWithdrawal += taken;
    balances.pRrsp -= taken;
  }
  if (sRrifMin > 0) {
    const taken = Math.min(balances.sRrsp, sRrifMin);
    sRegisteredWithdrawal += taken;
    balances.sRrsp -= taken;
  }

  const totalRegisteredMandatory = pRegisteredWithdrawal + sRegisteredWithdrawal;
  neededFromPortfolio = Math.max(0, neededFromPortfolio - (totalRegisteredMandatory * 0.8));

  // 2. Strategy-based drawdown logic
  if (drawdownStrategy === 'tax_efficient') {
    // Classic: Non-Reg first, then RRSP/RRIF, then TFSA last
    const totalNonReg = balances.pNonReg + balances.sNonReg;
    if (totalNonReg > 0 && neededFromPortfolio > 0) {
      const draw = Math.min(totalNonReg, neededFromPortfolio);
      const pDraw = totalNonReg > 0 ? (balances.pNonReg / totalNonReg) * draw : 0;
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
      pRegisteredWithdrawal += pDraw;
      balances.pRrsp -= pDraw;
      sRegisteredWithdrawal += sDraw;
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
    // Accelerated early RRSP draw before age 71 to fill lower brackets
    const meltdownStartAge = meltdownOptions?.startAge ?? 0;
    const meltdownTarget = meltdownOptions?.targetStrategy ?? 'bracket1';
    const isMeltdownActiveThisYear = age >= meltdownStartAge && age < 72;

    if (isMeltdownActiveThisYear) {
      let targetCeiling = 65000 * inflationFactor;
      if (meltdownTarget === 'bracket1') {
        // Federal Bracket 1 (~$57,375 in 2026 indexed)
        targetCeiling = 57375 * inflationFactor;
      } else if (meltdownTarget === 'oas_threshold') {
        // OAS Clawback Threshold (~$93,208 in 2026 indexed)
        targetCeiling = 93208 * inflationFactor;
      } else if (meltdownTarget === 'even_meltdown') {
        // Even spread across remaining years to 71
        const yearsRemaining = Math.max(1, 72 - age);
        targetCeiling = Math.max(25000 * inflationFactor, balances.pRrsp / yearsRemaining);
      }

      if (balances.pRrsp > 0) {
        const availableRoom = Math.max(0, targetCeiling - (guaranteedCash / (isCouple ? 2 : 1)));
        const yearsRemaining = Math.max(1, 72 - age);
        const minMeltdownSlice = balances.pRrsp / yearsRemaining;
        const targetDraw = meltdownTarget === 'even_meltdown' ? targetCeiling : Math.max(availableRoom, minMeltdownSlice);
        const draw = Math.min(balances.pRrsp, Math.max(pRrifMin, targetDraw));
        pRegisteredWithdrawal += draw;
        balances.pRrsp -= draw;
      }
      if (isCouple && spouse && spouseAge !== undefined && spouseAge < 72 && balances.sRrsp > 0) {
        const sYearsRemaining = Math.max(1, 72 - spouseAge);
        const availableRoom = Math.max(0, targetCeiling - (guaranteedCash / 2));
        const sMinMeltdownSlice = balances.sRrsp / sYearsRemaining;
        const sTargetDraw = meltdownTarget === 'even_meltdown' ? targetCeiling : Math.max(availableRoom, sMinMeltdownSlice);
        const draw = Math.min(balances.sRrsp, Math.max(sRrifMin, sTargetDraw));
        sRegisteredWithdrawal += draw;
        balances.sRrsp -= draw;
      }
    } else if (age < 72) {
      // Prior to meltdown start age, draw from Non-Reg first
      if (neededFromPortfolio > 0) {
        const totalNonReg = balances.pNonReg + balances.sNonReg;
        if (totalNonReg > 0) {
          const draw = Math.min(totalNonReg, neededFromPortfolio);
          const pDraw = Math.min(balances.pNonReg, draw / 2);
          pNonRegWithdrawal += pDraw;
          balances.pNonReg -= pDraw;
          const sDraw = Math.min(balances.sNonReg, draw / 2);
          sNonRegWithdrawal += sDraw;
          balances.sNonReg -= sDraw;
          neededFromPortfolio -= draw;
        }
      }
    }

    let rem = Math.max(0, targetSpendingNominal - (guaranteedCash + (pRegisteredWithdrawal + sRegisteredWithdrawal) * 0.78));
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

  } else if (drawdownStrategy === 'minimize_overall_tax') {
    // 5. Minimize Overall Tax: Bracket smoothing across entire life cycle
    // Target the 2nd federal/provincial tax bracket threshold (~$55k per person inflation adjusted)
    const smoothBracketTarget = 55000 * inflationFactor;
    const pCurrentGuaranteed = guaranteedCash * (isCouple ? 0.5 : 1.0);
    const pRoomInTargetBracket = Math.max(0, smoothBracketTarget - pCurrentGuaranteed);

    if (balances.pRrsp > 0 && pRoomInTargetBracket > 0) {
      const draw = Math.min(balances.pRrsp, pRoomInTargetBracket);
      pRegisteredWithdrawal += draw;
      balances.pRrsp -= draw;
    }
    if (isCouple && spouse && spouseAge !== undefined && balances.sRrsp > 0) {
      const sCurrentGuaranteed = guaranteedCash * 0.5;
      const sRoom = Math.max(0, smoothBracketTarget - sCurrentGuaranteed);
      if (sRoom > 0) {
        const draw = Math.min(balances.sRrsp, sRoom);
        sRegisteredWithdrawal += draw;
        balances.sRrsp -= draw;
      }
    }

    // Fund remaining gap from Non-Reg first, then TFSA
    let rem = Math.max(0, targetSpendingNominal - (guaranteedCash + (pRegisteredWithdrawal + sRegisteredWithdrawal) * 0.78));
    const totalNonReg = balances.pNonReg + balances.sNonReg;
    if (totalNonReg > 0 && rem > 0) {
      const draw = Math.min(totalNonReg, rem);
      const pDraw = totalNonReg > 0 ? (balances.pNonReg / totalNonReg) * draw : 0;
      const sDraw = draw - pDraw;
      pNonRegWithdrawal += pDraw;
      balances.pNonReg -= pDraw;
      sNonRegWithdrawal += sDraw;
      balances.sNonReg -= sDraw;
      rem -= draw;
    }
    const totalTfsa = balances.pTfsa + balances.sTfsa;
    if (totalTfsa > 0 && rem > 0) {
      const draw = Math.min(totalTfsa, rem);
      const pDraw = totalTfsa > 0 ? (balances.pTfsa / totalTfsa) * draw : 0;
      const sDraw = draw - pDraw;
      pTfsaWithdrawal += pDraw;
      balances.pTfsa -= pDraw;
      sTfsaWithdrawal += sDraw;
      balances.sTfsa -= sDraw;
      rem -= draw;
    }

  } else if (drawdownStrategy === 'maximize_govt_pensions') {
    // 6. Maximize Government Pensions: Bridge funding to Age 70
    // Uses Non-Reg and TFSA during early retirement so CPP & OAS can delay to age 70 for +42% boost
    if (age < 70) {
      // Early bridge: Non-Reg first, then moderate RRSP, then TFSA
      const totalNonReg = balances.pNonReg + balances.sNonReg;
      if (totalNonReg > 0 && neededFromPortfolio > 0) {
        const draw = Math.min(totalNonReg, neededFromPortfolio);
        const pDraw = totalNonReg > 0 ? (balances.pNonReg / totalNonReg) * draw : 0;
        const sDraw = draw - pDraw;
        pNonRegWithdrawal += pDraw;
        balances.pNonReg -= pDraw;
        sNonRegWithdrawal += sDraw;
        balances.sNonReg -= sDraw;
        neededFromPortfolio -= draw;
      }
      const bridgeRrspTarget = 38000 * inflationFactor;
      if (balances.pRrsp > 0 && neededFromPortfolio > 0) {
        const draw = Math.min(balances.pRrsp, Math.min(bridgeRrspTarget, neededFromPortfolio / 0.8));
        pRegisteredWithdrawal += draw;
        balances.pRrsp -= draw;
        neededFromPortfolio -= draw * 0.8;
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
    } else {
      // Age 70+: Max CPP & OAS active. Preserve TFSA and draw Non-Reg/RRIF under OAS clawback
      const totalNonReg = balances.pNonReg + balances.sNonReg;
      if (totalNonReg > 0 && neededFromPortfolio > 0) {
        const draw = Math.min(totalNonReg, neededFromPortfolio);
        const pDraw = totalNonReg > 0 ? (balances.pNonReg / totalNonReg) * draw : 0;
        const sDraw = draw - pDraw;
        pNonRegWithdrawal += pDraw;
        balances.pNonReg -= pDraw;
        sNonRegWithdrawal += sDraw;
        balances.sNonReg -= sDraw;
        neededFromPortfolio -= draw;
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
    }

  } else if (drawdownStrategy === 'minimize_post_retirement_tax') {
    // 7. Minimize Post-Retirement Lifetime Tax:
    // Restrict taxable registered withdrawals strictly to Basic Personal Amount (BPA) and lowest bracket
    const bpaCeiling = 28000 * inflationFactor;
    if (balances.pRrsp > 0) {
      const room = Math.max(0, bpaCeiling - guaranteedCash);
      const draw = Math.min(balances.pRrsp, room);
      pRegisteredWithdrawal += draw;
      balances.pRrsp -= draw;
    }
    if (isCouple && spouse && spouseAge !== undefined && balances.sRrsp > 0) {
      const room = Math.max(0, bpaCeiling - guaranteedCash * 0.5);
      const draw = Math.min(balances.sRrsp, room);
      sRegisteredWithdrawal += draw;
      balances.sRrsp -= draw;
    }

    // Rest from 100% tax-free TFSA and capital return Non-Reg
    let rem = Math.max(0, targetSpendingNominal - (guaranteedCash + (pRegisteredWithdrawal + sRegisteredWithdrawal) * 0.8));
    const totalTfsa = balances.pTfsa + balances.sTfsa;
    if (totalTfsa > 0 && rem > 0) {
      const draw = Math.min(totalTfsa, rem);
      const pDraw = totalTfsa > 0 ? (balances.pTfsa / totalTfsa) * draw : 0;
      const sDraw = draw - pDraw;
      pTfsaWithdrawal += pDraw;
      balances.pTfsa -= pDraw;
      sTfsaWithdrawal += sDraw;
      balances.sTfsa -= sDraw;
      rem -= draw;
    }
    const totalNonReg = balances.pNonReg + balances.sNonReg;
    if (totalNonReg > 0 && rem > 0) {
      const draw = Math.min(totalNonReg, rem);
      const pDraw = totalNonReg > 0 ? (balances.pNonReg / totalNonReg) * draw : 0;
      const sDraw = draw - pDraw;
      pNonRegWithdrawal += pDraw;
      balances.pNonReg -= pDraw;
      sNonRegWithdrawal += sDraw;
      balances.sNonReg -= sDraw;
      rem -= draw;
    }

  } else if (drawdownStrategy === 'tfsa_first') {
    // TFSA first, then Non-Reg, then RRSP
    const totalTfsa = balances.pTfsa + balances.sTfsa;
    if (totalTfsa > 0 && neededFromPortfolio > 0) {
      const draw = Math.min(totalTfsa, neededFromPortfolio);
      const pDraw = Math.min(balances.pTfsa, draw / 2);
      pTfsaWithdrawal += pDraw;
      balances.pTfsa -= pDraw;
      const sDraw = Math.min(balances.sTfsa, draw / 2);
      sTfsaWithdrawal += sDraw;
      balances.sTfsa -= sDraw;
      neededFromPortfolio -= draw;
    }

    const totalNonReg = balances.pNonReg + balances.sNonReg;
    if (totalNonReg > 0 && neededFromPortfolio > 0) {
      const draw = Math.min(totalNonReg, neededFromPortfolio);
      const pDraw = Math.min(balances.pNonReg, draw / 2);
      pNonRegWithdrawal += pDraw;
      balances.pNonReg -= pDraw;
      const sDraw = Math.min(balances.sNonReg, draw / 2);
      sNonRegWithdrawal += sDraw;
      balances.sNonReg -= sDraw;
      neededFromPortfolio -= draw;
    }

    const totalRrsp = balances.pRrsp + balances.sRrsp;
    if (totalRrsp > 0 && neededFromPortfolio > 0) {
      const drawGross = Math.min(totalRrsp, neededFromPortfolio / 0.78);
      const pDraw = totalRrsp > 0 ? (balances.pRrsp / totalRrsp) * drawGross : 0;
      const sDraw = drawGross - pDraw;
      pRegisteredWithdrawal += pDraw;
      balances.pRrsp -= pDraw;
      sRegisteredWithdrawal += sDraw;
      balances.sRrsp -= sDraw;
      neededFromPortfolio -= drawGross * 0.78;
    }

  } else {
    // Proportional (Pro-Rata across all liquid vehicles)
    const totalLiquid = balances.pRrsp + balances.sRrsp + balances.pNonReg + balances.sNonReg + balances.pTfsa + balances.sTfsa;
    if (totalLiquid > 0 && neededFromPortfolio > 0) {
      const rrspTotal = balances.pRrsp + balances.sRrsp;
      const nonRegTotal = balances.pNonReg + balances.sNonReg;
      const tfsaTotal = balances.pTfsa + balances.sTfsa;

      const fromRrsp = Math.min(rrspTotal, (neededFromPortfolio * (rrspTotal / totalLiquid)) / 0.8);
      const pRrspDraw = balances.pRrsp > 0 ? fromRrsp * (balances.pRrsp / (rrspTotal || 1)) : 0;
      pRegisteredWithdrawal += pRrspDraw;
      balances.pRrsp -= pRrspDraw;
      const sRrspDraw = balances.sRrsp > 0 ? fromRrsp * (balances.sRrsp / (rrspTotal || 1)) : 0;
      sRegisteredWithdrawal += sRrspDraw;
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

  // 4. Separate RRSP vs RRIF based on CRA conversion age (72+)
  const pRrspWithdrawal = isPrimaryRrif ? 0 : pRegisteredWithdrawal;
  const pRrifWithdrawal = isPrimaryRrif ? pRegisteredWithdrawal : 0;

  const sRrspWithdrawal = isSpouseRrif ? 0 : sRegisteredWithdrawal;
  const sRrifWithdrawal = isSpouseRrif ? sRegisteredWithdrawal : 0;

  const totalRrifWithdrawal = pRrifWithdrawal + sRrifWithdrawal;
  const isRrifMinMet = isRrifMandatory ? (totalRrifWithdrawal >= (rrifMinimumWithdrawal - 1)) : true;

  return {
    pRrspWithdrawal,
    sRrspWithdrawal,
    pRrifWithdrawal,
    sRrifWithdrawal,
    pTfsaWithdrawal,
    sTfsaWithdrawal,
    pNonRegWithdrawal,
    sNonRegWithdrawal,
    rrifMinimumWithdrawal,
    isRrifMandatory,
    isRrifMinMet
  };
}
