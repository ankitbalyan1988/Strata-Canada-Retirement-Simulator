import { RetirementInputs, SpouseInputs } from '../../types/retirement';
import { calculateCanadianTax, TFSA_ANNUAL_LIMIT, FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT } from '../canadianTax';
import { calculateEmployerRrspMatch } from '../employerMatch';

export interface CustomAccountState {
  id: string;
  name: string;
  category: string;
  balance: number;
  annualContribution: number;
  expectedReturn: number;
  gicCloseYear?: number;
  matured: boolean;
  currentContribution: number;
}

export interface ContributionYearState {
  pEmploymentIncome: number;
  sEmploymentIncome: number;
  pCumulativeFhsa: number;
  sCumulativeFhsa: number;
  pFhsaActive: boolean;
  sFhsaActive: boolean;
  lifetimeEmploymentIncome: number;
}

export interface ContributionBalances {
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

export interface ContributionYearResult {
  pRrspContrib: number;
  pTfsaContrib: number;
  pFhsaContrib: number;
  pNonRegContrib: number;
  sRrspContrib: number;
  sTfsaContrib: number;
  sFhsaContrib: number;
  sNonRegContrib: number;
  pYearIncome: number;
  sYearIncome: number;
  pTaxable: number;
  sTaxable: number;
  pTaxPaid: number;
  sTaxPaid: number;
  fhsaRolledOver: boolean;
  yearFhsaWithdrawalOrTransfer: number;
  notes: string[];
}

/**
 * Handles FHSA lifetime limits/rollovers, wage growth, career disruption scalers,
 * and annual contributions for primary and spouse accounts.
 */
export function calculateContributionsForYear(
  age: number,
  spouseAge: number | undefined,
  yearIndex: number,
  inputs: RetirementInputs,
  state: ContributionYearState,
  balances: ContributionBalances,
  isCouple: boolean,
  spouse: SpouseInputs | undefined,
  inflationFactor: number,
  isPrimaryRetired: boolean,
  isSpouseRetired: boolean,
  initialAnnualExpenses: number,
  stopContributionsAge?: number
): ContributionYearResult {
  const notes: string[] = [];
  const currentSimYear = 2026 + yearIndex;
  let fhsaRolledOver = false;
  let yearFhsaWithdrawalOrTransfer = 0;

  const re = inputs.realEstate;
  const ownsHome = Boolean(re && re.ownsHome);
  const purchaseType = re?.purchaseType ?? (ownsHome ? 'current' : 'rent');
  const isFuturePurchase = Boolean(ownsHome && purchaseType === 'future');
  const fundWithFhsa = re?.fundWithFhsa !== false;

  // 1. Primary FHSA Lifecycle Check
  if (state.pFhsaActive) {
    const primaryFhsaOpenYear = inputs.fhsaOpenYear || 2023;
    const primaryYearsSinceOpen = currentSimYear - primaryFhsaOpenYear;
    const primaryReached15Years = primaryYearsSinceOpen >= 15;

    if (inputs.fhsaIntent === 'home_purchase' && (!isFuturePurchase || fundWithFhsa) && age === inputs.fhsaHomePurchaseAge) {
      if (balances.pFhsa > 0) {
        yearFhsaWithdrawalOrTransfer += balances.pFhsa;
        notes.push(`🏠 Age ${age}: FHSA fully withdrawn tax-free ($${Math.round(balances.pFhsa).toLocaleString()}) for qualifying home purchase!`);
        balances.pFhsa = 0;
      }
      state.pFhsaActive = false;
    } else if (age >= 71 || primaryReached15Years) {
      const destAccount = age >= 71 ? 'RRIF' : (isPrimaryRetired ? 'RRIF / RRSP' : 'RRSP');
      const rolloverAmount = balances.pFhsa;
      if (rolloverAmount > 0) {
        balances.pRrsp += rolloverAmount;
        yearFhsaWithdrawalOrTransfer += rolloverAmount;
        fhsaRolledOver = true;
        const triggerReason = age >= 71
          ? 'reaching CRA maximum age 71'
          : `reaching 15-year participation limit (account opened in ${primaryFhsaOpenYear})`;
        notes.push(`🔄 Age ${age} (Year ${currentSimYear}): FHSA rolled over $${Math.round(rolloverAmount).toLocaleString()} into ${destAccount} 100% tax-free (${triggerReason}).`);
        balances.pFhsa = 0;
      }
      state.pFhsaActive = false;
    }
  }

  // 2. Spouse FHSA Lifecycle Check
  if (isCouple && spouse && state.sFhsaActive && spouseAge !== undefined) {
    const spouseFhsaOpenYear = spouse.fhsaOpenYear || 2023;
    const spouseYearsSinceOpen = currentSimYear - spouseFhsaOpenYear;
    const spouseReached15Years = spouseYearsSinceOpen >= 15;

    if (spouse.fhsaIntent === 'home_purchase' && (!isFuturePurchase || fundWithFhsa) && spouseAge === spouse.fhsaHomePurchaseAge) {
      if (balances.sFhsa > 0) {
        yearFhsaWithdrawalOrTransfer += balances.sFhsa;
        notes.push(`🏠 Spouse Age ${spouseAge}: Spouse FHSA withdrawn tax-free ($${Math.round(balances.sFhsa).toLocaleString()}) for qualifying home purchase!`);
        balances.sFhsa = 0;
      }
      state.sFhsaActive = false;
    } else if (spouseAge >= 71 || spouseReached15Years) {
      const destAccount = spouseAge >= 71 ? 'RRIF' : (isSpouseRetired ? 'RRIF / RRSP' : 'RRSP');
      const rolloverAmount = balances.sFhsa;
      if (rolloverAmount > 0) {
        balances.sRrsp += rolloverAmount;
        yearFhsaWithdrawalOrTransfer += rolloverAmount;
        fhsaRolledOver = true;
        const triggerReason = spouseAge >= 71
          ? 'reaching CRA maximum age 71'
          : `reaching 15-year participation limit (account opened in ${spouseFhsaOpenYear})`;
        notes.push(`🔄 Spouse Age ${spouseAge} (Year ${currentSimYear}): Spouse FHSA rolled over $${Math.round(rolloverAmount).toLocaleString()} into ${destAccount} 100% tax-free (${triggerReason}).`);
        balances.sFhsa = 0;
      }
      state.sFhsaActive = false;
    }
  }

  let pRrspContrib = 0;
  let pTfsaContrib = 0;
  let pFhsaContrib = 0;
  let pNonRegContrib = 0;

  let sRrspContrib = 0;
  let sTfsaContrib = 0;
  let sFhsaContrib = 0;
  let sNonRegContrib = 0;

  let pYearIncome = 0;
  let sYearIncome = 0;

  let pTaxable = 0;
  let sTaxable = 0;
  let pTaxPaid = 0;
  let sTaxPaid = 0;

  const hasCustomNonReg = Boolean(balances.customAccountsState && balances.customAccountsState.length > 0);

  // 3. Primary Working & Accumulation Contributions
  if (!isPrimaryRetired) {
    if (yearIndex > 0) {
      state.pEmploymentIncome *= (1 + inputs.incomeGrowthRate / 100);
    }

    let careerDisruptionActive = false;
    let careerDisruptionReduction = 0;
    if (inputs.careerDisruption?.enabled) {
      const cd = inputs.careerDisruption;
      const isDisrupted = cd.isTemporary
        ? age >= cd.shockAge && age < cd.shockAge + (cd.recoveryYears || 2)
        : age >= cd.shockAge;

      if (age === cd.shockAge) {
        state.pEmploymentIncome *= (1 - cd.reductionPercent / 100);
        notes.push(
          `🚨 Career Disruption at Age ${age}: Wage reduced by ${cd.reductionPercent}% (${
            cd.isTemporary ? `temporary ${cd.recoveryYears || 2}-yr hit` : 'permanent step-down'
          }).`
        );
      } else if (cd.isTemporary && age === cd.shockAge + (cd.recoveryYears || 2)) {
        state.pEmploymentIncome *= 1.25;
        notes.push(`💼 Career Recovery at Age ${age}: Wage partially rebounded following ${cd.recoveryYears || 2}-year disruption.`);
      }

      if (isDisrupted) {
        careerDisruptionActive = true;
        careerDisruptionReduction = cd.reductionPercent;
      }
    }

    pYearIncome = Math.max(0, state.pEmploymentIncome);
    state.lifetimeEmploymentIncome += pYearIncome;

    let pEmployeeRrsp = Math.max(0, inputs.rrspAnnualContribution);
    let pEmployerMatch = inputs.employerMatch?.enabled
      ? calculateEmployerRrspMatch(pYearIncome, pEmployeeRrsp, inputs.employerMatch)
      : 0;
    const pStatutoryRrspCap = Math.min(32490 * inflationFactor, pYearIncome * 0.18);
    if (pEmployeeRrsp + pEmployerMatch > pStatutoryRrspCap) {
      pEmployeeRrsp = Math.max(0, pStatutoryRrspCap - pEmployerMatch);
    }
    pRrspContrib = pEmployeeRrsp + pEmployerMatch;

    pTfsaContrib = Math.min(TFSA_ANNUAL_LIMIT * inflationFactor, Math.max(0, inputs.tfsaAnnualContribution));
    if (state.pFhsaActive && state.pCumulativeFhsa < FHSA_LIFETIME_LIMIT) {
      const allowed = Math.min(FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT - state.pCumulativeFhsa, Math.max(0, inputs.fhsaAnnualContribution));
      pFhsaContrib = allowed;
      state.pCumulativeFhsa += allowed;
    }

    if (hasCustomNonReg) {
      let customContribSum = 0;
      balances.customAccountsState.forEach((acc) => {
        const c = Math.max(0, acc.annualContribution);
        acc.currentContribution = c;
        customContribSum += c;
      });
      pNonRegContrib = customContribSum;
    } else {
      pNonRegContrib = Math.max(0, inputs.nonRegAnnualContribution);
    }

    // Dynamic waterfall calculation: net of in-hand income minus living expenses, allocated by priority order
    if (inputs.contributionAllocation?.mode === 'dynamic_waterfall' && (!stopContributionsAge || age < stopContributionsAge)) {
      const pTaxBaseline = calculateCanadianTax(pYearIncome, inputs.province, age, 0).totalTax;
      const pCppEi = Math.min(5200 * inflationFactor, pYearIncome * 0.075);
      const pInHand = Math.max(0, pYearIncome - pTaxBaseline - pCppEi);
      const estLivingCost = initialAnnualExpenses * inflationFactor;
      let surplus = Math.max(0, pInHand - estLivingCost);

      const pOrder = inputs.contributionAllocation.priorityOrder || ['rrsp', 'tfsa', 'fhsa', 'nonReg'];
      const caps = inputs.contributionAllocation.customCaps || {};

      pRrspContrib = 0;
      pTfsaContrib = 0;
      pFhsaContrib = 0;
      pNonRegContrib = 0;

      for (const acc of pOrder) {
        if (surplus <= 0) break;

        if (acc === 'rrsp') {
          const rrspTotalRoom = caps.rrsp?.enabled ? caps.rrsp.maxAmount : Math.min(32490 * inflationFactor, pYearIncome * 0.18);
          
          let potentialEmployerMatch = 0;
          if (inputs.employerMatch?.enabled) {
            if (inputs.employerMatch.matchType === 'fixed_dollar') {
              potentialEmployerMatch = Math.min(rrspTotalRoom, Math.max(0, inputs.employerMatch.fixedAnnualAmount || 0));
            } else if (inputs.employerMatch.matchType === 'percent_of_contribution') {
              const rate = (inputs.employerMatch.matchRatePercent ?? 50) / 100;
              const maxSalaryCap = pYearIncome > 0 ? pYearIncome * ((inputs.employerMatch.matchPercentOfSalary ?? 6) / 100) : Infinity;
              const employeeCapNoSalary = rrspTotalRoom / (1 + rate);
              const employeeCapWithSalary = Math.max(0, rrspTotalRoom - maxSalaryCap);
              const maxEmployee = Math.max(0, Math.min(employeeCapNoSalary, employeeCapWithSalary));
              potentialEmployerMatch = Math.min(rrspTotalRoom, Math.min(maxEmployee * rate, maxSalaryCap));
            } else {
              const matchPercent = (inputs.employerMatch.matchPercentOfSalary ?? 4) / 100;
              const matchRate = (inputs.employerMatch.matchRatePercent ?? 100) / 100;
              potentialEmployerMatch = Math.min(rrspTotalRoom, Math.round(pYearIncome * matchPercent * matchRate));
            }
          }

          // CRA Rule: Employer group RRSP/DPSP contribution consumes employee's overall statutory RRSP room.
          // Paycheck out-of-pocket contribution is capped at rrspTotalRoom - employerMatch.
          const maxEmployeeRrsp = Math.max(0, rrspTotalRoom - potentialEmployerMatch);
          const c = Math.min(surplus, maxEmployeeRrsp);
          pEmployeeRrsp = c;
          pEmployerMatch = inputs.employerMatch?.enabled
            ? calculateEmployerRrspMatch(pYearIncome, c, inputs.employerMatch)
            : 0;
          if (c + pEmployerMatch > rrspTotalRoom) {
            pEmployerMatch = Math.max(0, rrspTotalRoom - c);
          }
          pRrspContrib = c + pEmployerMatch;
          surplus -= c;
        } else if (acc === 'tfsa') {
          const tfsaCap = caps.tfsa?.enabled ? caps.tfsa.maxAmount : (TFSA_ANNUAL_LIMIT * inflationFactor);
          const c = Math.min(surplus, tfsaCap);
          pTfsaContrib = c;
          surplus -= c;
        } else if (acc === 'fhsa') {
          if (state.pFhsaActive && state.pCumulativeFhsa < FHSA_LIFETIME_LIMIT) {
            const maxFhsaRoom = Math.min(FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT - state.pCumulativeFhsa);
            const fhsaCap = caps.fhsa?.enabled ? caps.fhsa.maxAmount : maxFhsaRoom;
            const c = Math.min(surplus, fhsaCap);
            pFhsaContrib = c;
            state.pCumulativeFhsa += c;
            surplus -= c;
          }
        } else if (acc === 'nonReg') {
          const nonRegCap = caps.nonReg?.enabled ? caps.nonReg.maxAmount : Infinity;
          const c = Math.min(surplus, nonRegCap);
          pNonRegContrib = c;
          surplus -= c;
        }
      }

      if (hasCustomNonReg && balances.customAccountsState.length > 0) {
        const perAcc = pNonRegContrib / balances.customAccountsState.length;
        balances.customAccountsState.forEach((acc) => {
          acc.currentContribution = perAcc;
        });
      }
    }

    if (stopContributionsAge !== undefined && age >= stopContributionsAge) {
      pRrspContrib = 0;
      pTfsaContrib = 0;
      pFhsaContrib = 0;
      pNonRegContrib = 0;
      if (hasCustomNonReg) {
        balances.customAccountsState.forEach((acc) => {
          acc.currentContribution = 0;
        });
      }
    }

    // Scale down contributions if salary was disrupted
    const totalPlannedSavings = pRrspContrib + pTfsaContrib + pFhsaContrib + pNonRegContrib;
    if (totalPlannedSavings > 0) {
      let scaleDown = 1.0;

      if (careerDisruptionActive) {
        const estLivingCost = initialAnnualExpenses * inflationFactor;
        const availableSurplus = Math.max(0, pYearIncome * 0.82 - estLivingCost);

        if (availableSurplus < totalPlannedSavings) {
          scaleDown = Math.min(
            1 - careerDisruptionReduction / 100,
            availableSurplus > 0 ? availableSurplus / totalPlannedSavings : 0.05
          );
          scaleDown = Math.max(0, Math.min(1, scaleDown));

          if (age === inputs.careerDisruption!.shockAge) {
            notes.push(
              `📉 Account Contributions Scaled Down: Reduced by ${Math.round(
                (1 - scaleDown) * 100
              )}% (to $${Math.round(totalPlannedSavings * scaleDown).toLocaleString()}/yr) to protect household living costs ($${Math.round(estLivingCost).toLocaleString()}/yr) during salary disruption.`
            );
          }
        } else {
          scaleDown = Math.max(0.1, 1 - careerDisruptionReduction / 100);
        }
      } else if (pYearIncome > 0 && totalPlannedSavings > pYearIncome * 0.70) {
        scaleDown = (pYearIncome * 0.70) / totalPlannedSavings;
      }

      if (scaleDown < 1.0) {
        pRrspContrib *= scaleDown;
        pTfsaContrib *= scaleDown;
        pFhsaContrib *= scaleDown;
        pNonRegContrib *= scaleDown;
        if (hasCustomNonReg) {
          balances.customAccountsState.forEach((acc) => {
            acc.currentContribution *= scaleDown;
          });
        }
      }
    }

    pTaxable = Math.max(0, pYearIncome - pEmployeeRrsp - pFhsaContrib);
    pTaxPaid = calculateCanadianTax(pTaxable, inputs.province, age, 0).totalTax;
  }

  // 4. Spouse Working & Accumulation Contributions
  if (isCouple && spouse && !isSpouseRetired) {
    if (yearIndex > 0) {
      state.sEmploymentIncome *= (1 + spouse.incomeGrowthRate / 100);
    }

    if (spouse.careerDisruption?.enabled && spouseAge !== undefined) {
      const scd = spouse.careerDisruption;
      if (spouseAge === scd.shockAge) {
        state.sEmploymentIncome *= (1 - scd.reductionPercent / 100);
        notes.push(`🚨 Spouse Career Shock at Age ${spouseAge}: Wage cut by ${scd.reductionPercent}%.`);
      } else if (scd.isTemporary && spouseAge === scd.shockAge + (scd.recoveryYears || 2)) {
        state.sEmploymentIncome *= 1.25;
        notes.push(`💼 Spouse Career Recovery at Age ${spouseAge}.`);
      }
    }

    sYearIncome = Math.max(0, state.sEmploymentIncome);
    state.lifetimeEmploymentIncome += sYearIncome;

    let sEmployeeRrsp = Math.max(0, spouse.rrspAnnualContribution);
    let sEmployerMatch = spouse.employerMatch?.enabled
      ? calculateEmployerRrspMatch(sYearIncome, sEmployeeRrsp, spouse.employerMatch)
      : 0;
    const sStatutoryRrspCap = Math.min(32490 * inflationFactor, sYearIncome * 0.18);
    if (sEmployeeRrsp + sEmployerMatch > sStatutoryRrspCap) {
      sEmployeeRrsp = Math.max(0, sStatutoryRrspCap - sEmployerMatch);
    }
    sRrspContrib = sEmployeeRrsp + sEmployerMatch;

    sTfsaContrib = Math.min(TFSA_ANNUAL_LIMIT * inflationFactor, Math.max(0, spouse.tfsaAnnualContribution));
    if (state.sFhsaActive && state.sCumulativeFhsa < FHSA_LIFETIME_LIMIT) {
      const allowed = Math.min(FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT - state.sCumulativeFhsa, Math.max(0, spouse.fhsaAnnualContribution));
      sFhsaContrib = allowed;
      state.sCumulativeFhsa += allowed;
    }
    sNonRegContrib = Math.max(0, spouse.nonRegAnnualContribution);

    if (stopContributionsAge !== undefined && (spouseAge !== undefined ? spouseAge >= stopContributionsAge : age >= stopContributionsAge)) {
      sRrspContrib = 0;
      sTfsaContrib = 0;
      sFhsaContrib = 0;
      sNonRegContrib = 0;
    }

    if (spouse.careerDisruption?.enabled && spouseAge !== undefined) {
      const scd = spouse.careerDisruption;
      const isSpouseDisrupted = scd.isTemporary
        ? spouseAge >= scd.shockAge && spouseAge < scd.shockAge + (scd.recoveryYears || 2)
        : spouseAge >= scd.shockAge;
      if (isSpouseDisrupted) {
        const spouseReduction = Math.max(0.1, 1 - scd.reductionPercent / 100);
        sRrspContrib *= spouseReduction;
        sTfsaContrib *= spouseReduction;
        sFhsaContrib *= spouseReduction;
        sNonRegContrib *= spouseReduction;
      }
    }

    sTaxable = Math.max(0, sYearIncome - sEmployeeRrsp - sFhsaContrib);
    sTaxPaid = calculateCanadianTax(sTaxable, inputs.province, spouseAge!, 0).totalTax;
  }

  return {
    pRrspContrib,
    pTfsaContrib,
    pFhsaContrib,
    pNonRegContrib,
    sRrspContrib,
    sTfsaContrib,
    sFhsaContrib,
    sNonRegContrib,
    pYearIncome,
    sYearIncome,
    pTaxable,
    sTaxable,
    pTaxPaid,
    sTaxPaid,
    fhsaRolledOver,
    yearFhsaWithdrawalOrTransfer,
    notes
  };
}
