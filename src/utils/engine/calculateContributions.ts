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
  pBaselineIncome: number;
  sBaselineIncome: number;
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
  pEmployeeRrsp: number;
  pEmployerMatch: number;
  pTfsaContrib: number;
  pFhsaContrib: number;
  pNonRegContrib: number;
  sRrspContrib: number;
  sEmployeeRrsp: number;
  sEmployerMatch: number;
  sTfsaContrib: number;
  sFhsaContrib: number;
  sNonRegContrib: number;
  pYearIncome: number;
  sYearIncome: number;
  discretionaryScaleFactor: number;
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
  let pEmployeeRrsp = 0;
  let pEmployerMatch = 0;
  let pTfsaContrib = 0;
  let pFhsaContrib = 0;
  let pNonRegContrib = 0;

  let sRrspContrib = 0;
  let sEmployeeRrsp = 0;
  let sEmployerMatch = 0;
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
      state.pBaselineIncome *= (1 + Math.max(0, inputs.incomeGrowthRate) / 100);
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
          }). Discretionary living costs scaled down proportionately.`
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

    pEmployeeRrsp = Math.max(0, inputs.rrspAnnualContribution);
    pEmployerMatch = inputs.employerMatch?.enabled
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
      pEmployeeRrsp = 0;
      pEmployerMatch = 0;
      pRrspContrib = 0;
      pTfsaContrib = 0;
      if (pFhsaContrib > 0) {
        state.pCumulativeFhsa = Math.max(0, state.pCumulativeFhsa - pFhsaContrib);
        pFhsaContrib = 0;
      }
      pNonRegContrib = 0;
      if (hasCustomNonReg) {
        balances.customAccountsState.forEach((acc) => {
          acc.currentContribution = 0;
        });
      }
    }

    // Scale down contributions if salary was disrupted
    const totalPlannedSavings = pEmployeeRrsp + pTfsaContrib + pFhsaContrib + pNonRegContrib;
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
        } else {
          scaleDown = Math.max(0.1, 1 - careerDisruptionReduction / 100);
        }
      } else if (pYearIncome > 0 && totalPlannedSavings > pYearIncome * 0.70) {
        scaleDown = (pYearIncome * 0.70) / totalPlannedSavings;
      }

      if (scaleDown < 1.0) {
        pEmployeeRrsp *= scaleDown;
        pEmployerMatch = inputs.employerMatch?.enabled
          ? calculateEmployerRrspMatch(pYearIncome, pEmployeeRrsp, inputs.employerMatch)
          : 0;
        pRrspContrib = pEmployeeRrsp + pEmployerMatch;
        pTfsaContrib *= scaleDown;
        const fhsaReduction = pFhsaContrib * (1 - scaleDown);
        pFhsaContrib *= scaleDown;
        state.pCumulativeFhsa = Math.max(0, state.pCumulativeFhsa - fhsaReduction);
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
      state.sBaselineIncome *= (1 + Math.max(0, spouse.incomeGrowthRate) / 100);
    }

    if (spouse.careerDisruption?.enabled && spouseAge !== undefined) {
      const scd = spouse.careerDisruption;
      if (spouseAge === scd.shockAge) {
        state.sEmploymentIncome *= (1 - scd.reductionPercent / 100);
        notes.push(`🚨 Spouse Career Shock at Age ${spouseAge}: Wage cut by ${scd.reductionPercent}%. Discretionary living costs scaled down proportionately.`);
      } else if (scd.isTemporary && spouseAge === scd.shockAge + (scd.recoveryYears || 2)) {
        state.sEmploymentIncome *= 1.25;
        notes.push(`💼 Spouse Career Recovery at Age ${spouseAge}.`);
      }
    }

    sYearIncome = Math.max(0, state.sEmploymentIncome);
    state.lifetimeEmploymentIncome += sYearIncome;

    sEmployeeRrsp = Math.max(0, spouse.rrspAnnualContribution);
    sEmployerMatch = spouse.employerMatch?.enabled
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
      sEmployeeRrsp = 0;
      sEmployerMatch = 0;
      sRrspContrib = 0;
      sTfsaContrib = 0;
      if (sFhsaContrib > 0) {
        state.sCumulativeFhsa = Math.max(0, state.sCumulativeFhsa - sFhsaContrib);
        sFhsaContrib = 0;
      }
      sNonRegContrib = 0;
    }

    if (spouse.careerDisruption?.enabled && spouseAge !== undefined) {
      const scd = spouse.careerDisruption;
      const isSpouseDisrupted = scd.isTemporary
        ? spouseAge >= scd.shockAge && spouseAge < scd.shockAge + (scd.recoveryYears || 2)
        : spouseAge >= scd.shockAge;
      if (isSpouseDisrupted) {
        const spouseReduction = Math.max(0.1, 1 - scd.reductionPercent / 100);
        sEmployeeRrsp *= spouseReduction;
        sEmployerMatch = spouse.employerMatch?.enabled
          ? calculateEmployerRrspMatch(sYearIncome, sEmployeeRrsp, spouse.employerMatch)
          : 0;
        sRrspContrib = sEmployeeRrsp + sEmployerMatch;
        sTfsaContrib *= spouseReduction;
        const sFhsaReduction = sFhsaContrib * (1 - spouseReduction);
        sFhsaContrib *= spouseReduction;
        state.sCumulativeFhsa = Math.max(0, state.sCumulativeFhsa - sFhsaReduction);
        sNonRegContrib *= spouseReduction;
      }
    }

    sTaxable = Math.max(0, sYearIncome - sEmployeeRrsp - sFhsaContrib);
    sTaxPaid = calculateCanadianTax(sTaxable, inputs.province, spouseAge!, 0).totalTax;
  }

  // Compute household active earned-income discretionary scaling ratio (0..1)
  let actualActiveWorkingIncome = 0;
  let baselineActiveWorkingIncome = 0;
  if (!isPrimaryRetired) {
    actualActiveWorkingIncome += pYearIncome;
    baselineActiveWorkingIncome += Math.max(0, state.pBaselineIncome);
  }
  if (isCouple && spouse && !isSpouseRetired) {
    actualActiveWorkingIncome += sYearIncome;
    baselineActiveWorkingIncome += Math.max(0, state.sBaselineIncome);
  }
  const discretionaryScaleFactor = baselineActiveWorkingIncome > 0
    ? Math.min(1, Math.max(0, actualActiveWorkingIncome / baselineActiveWorkingIncome))
    : 1;

  return {
    pRrspContrib,
    pEmployeeRrsp,
    pEmployerMatch,
    pTfsaContrib,
    pFhsaContrib,
    pNonRegContrib,
    sRrspContrib,
    sEmployeeRrsp,
    sEmployerMatch,
    sTfsaContrib,
    sFhsaContrib,
    sNonRegContrib,
    pYearIncome,
    sYearIncome,
    discretionaryScaleFactor,
    pTaxable,
    sTaxable,
    pTaxPaid,
    sTaxPaid,
    fhsaRolledOver,
    yearFhsaWithdrawalOrTransfer,
    notes
  };
}

/**
 * Reconciles pre-retirement inflows against exact annual outflows (living, rent/mortgage, debts) & taxes.
 * - If outflows + taxes leave insufficient cash for planned out-of-pocket savings, scales planned savings down
 *   to match actual cash capacity.
 * - If positive cash surplus remains after outflows, taxes, and planned savings, sweeps the surplus
 *   into Registered Savings (RRSP -> FHSA -> TFSA within statutory CRA limits) and then Non-Registered Savings.
 */
export function reconcilePreRetirementOutflowsAndSurplus(
  age: number,
  spouseAge: number | undefined,
  inputs: RetirementInputs,
  spouse: SpouseInputs | undefined,
  isCouple: boolean,
  isPrimaryRetired: boolean,
  isSpouseRetired: boolean,
  inflationFactor: number,
  totalOutflows: number,
  res: ContributionYearResult,
  state: ContributionYearState,
  balances: ContributionBalances,
  stopContributionsAge?: number,
  disableAutoSurplusSweep?: boolean
): { surplusSaved: number } {
  if (isPrimaryRetired || disableAutoSurplusSweep) {
    return { surplusSaved: 0 };
  }
  if (stopContributionsAge !== undefined && age >= stopContributionsAge) {
    return { surplusSaved: 0 };
  }

  const spouseStopped = stopContributionsAge !== undefined &&
    (spouseAge !== undefined ? spouseAge >= stopContributionsAge : age >= stopContributionsAge);
  const canSpouseSave = Boolean(isCouple && spouse && !isSpouseRetired && !spouseStopped);
  const hasCustomNonReg = Boolean(balances.customAccountsState && balances.customAccountsState.length > 0);
  const workingInflow = res.pYearIncome + res.sYearIncome;
  let surplusSaved = 0;

  const recomputeTaxes = () => {
    res.pTaxable = Math.max(0, res.pYearIncome - res.pEmployeeRrsp - res.pFhsaContrib);
    res.pTaxPaid = calculateCanadianTax(res.pTaxable, inputs.province, age, 0).totalTax;
    if (isCouple && spouse && !isSpouseRetired && spouseAge !== undefined) {
      res.sTaxable = Math.max(0, res.sYearIncome - res.sEmployeeRrsp - res.sFhsaContrib);
      res.sTaxPaid = calculateCanadianTax(res.sTaxable, inputs.province, spouseAge, 0).totalTax;
    }
  };

  // Run 2 convergence passes so tax reductions from additional RRSP/FHSA contributions also sweep cleanly
  for (let pass = 0; pass < 2; pass++) {
    const plannedOutOfPocket =
      res.pEmployeeRrsp +
      res.pTfsaContrib +
      res.pFhsaContrib +
      res.pNonRegContrib +
      res.sEmployeeRrsp +
      res.sTfsaContrib +
      res.sFhsaContrib +
      res.sNonRegContrib;
    const currentTax = res.pTaxPaid + res.sTaxPaid;
    const remainingCash = workingInflow - totalOutflows - currentTax - plannedOutOfPocket;

    if (remainingCash < -1 && plannedOutOfPocket > 0) {
      // Cash deficit: protect household living, rent/mortgage, debt & taxes first by scaling planned out-of-pocket contributions
      const availableForSavings = Math.max(0, workingInflow - totalOutflows - currentTax);
      const scale = Math.max(0, Math.min(1, availableForSavings / plannedOutOfPocket));

      res.pEmployeeRrsp *= scale;
      res.pEmployerMatch = inputs.employerMatch?.enabled
        ? calculateEmployerRrspMatch(res.pYearIncome, res.pEmployeeRrsp, inputs.employerMatch)
        : 0;
      res.pRrspContrib = res.pEmployeeRrsp + res.pEmployerMatch;
      res.pTfsaContrib *= scale;
      const pFhsaRed = res.pFhsaContrib * (1 - scale);
      res.pFhsaContrib *= scale;
      state.pCumulativeFhsa = Math.max(0, state.pCumulativeFhsa - pFhsaRed);
      res.pNonRegContrib *= scale;
      if (hasCustomNonReg) {
        balances.customAccountsState.forEach((acc) => {
          acc.currentContribution *= scale;
        });
      }

      if (canSpouseSave && spouse) {
        res.sEmployeeRrsp *= scale;
        res.sEmployerMatch = spouse.employerMatch?.enabled
          ? calculateEmployerRrspMatch(res.sYearIncome, res.sEmployeeRrsp, spouse.employerMatch)
          : 0;
        res.sRrspContrib = res.sEmployeeRrsp + res.sEmployerMatch;
        res.sTfsaContrib *= scale;
        const sFhsaRed = res.sFhsaContrib * (1 - scale);
        res.sFhsaContrib *= scale;
        state.sCumulativeFhsa = Math.max(0, state.sCumulativeFhsa - sFhsaRed);
        res.sNonRegContrib *= scale;
      }

      recomputeTaxes();
    } else if (remainingCash > 1) {
      // Cash surplus remaining after outflows & taxes -> allocate to Registered Savings, then Non-Registered Savings
      let pool = remainingCash;
      const pOrder = inputs.contributionAllocation?.priorityOrder || ['rrsp', 'tfsa', 'fhsa', 'nonReg'];
      const caps = inputs.contributionAllocation?.customCaps || {};
      const respectCaps = inputs.contributionAllocation?.mode === 'dynamic_waterfall';

      const allocateExtraRrsp = (
        income: number,
        curEmp: number,
        curTotal: number,
        matchCfg: RetirementInputs['employerMatch']
      ): { addEmp: number; newEmp: number; newMatch: number; newTotal: number } => {
        if (income <= 0 || pool <= 0) {
          return { addEmp: 0, newEmp: curEmp, newMatch: curTotal - curEmp, newTotal: curTotal };
        }
        const statutoryCap = Math.min(32490 * inflationFactor, income * 0.18);
        const effCap = respectCaps && caps.rrsp?.enabled ? Math.min(statutoryCap, caps.rrsp.maxAmount) : statutoryCap;
        const roomLeft = Math.max(0, effCap - curTotal);
        if (roomLeft <= 0) {
          return { addEmp: 0, newEmp: curEmp, newMatch: curTotal - curEmp, newTotal: curTotal };
        }
        let targetEmp = curEmp + Math.min(pool, roomLeft);
        let newMatch = matchCfg?.enabled ? calculateEmployerRrspMatch(income, targetEmp, matchCfg) : 0;
        if (targetEmp + newMatch > effCap) {
          // Solve cleanly for maximum employee contribution when employer match also consumes RRSP room
          targetEmp = Math.max(curEmp, effCap - newMatch);
          newMatch = matchCfg?.enabled ? calculateEmployerRrspMatch(income, targetEmp, matchCfg) : 0;
          if (targetEmp + newMatch > effCap) {
            newMatch = Math.max(0, effCap - targetEmp);
          }
        }
        const addEmp = Math.max(0, Math.min(pool, targetEmp - curEmp));
        return {
          addEmp,
          newEmp: curEmp + addEmp,
          newMatch,
          newTotal: curEmp + addEmp + newMatch
        };
      };

      for (const acc of pOrder) {
        if (pool <= 1) break;

        if (acc === 'rrsp') {
          const pAlloc = allocateExtraRrsp(res.pYearIncome, res.pEmployeeRrsp, res.pRrspContrib, inputs.employerMatch);
          res.pEmployeeRrsp = pAlloc.newEmp;
          res.pEmployerMatch = pAlloc.newMatch;
          res.pRrspContrib = pAlloc.newTotal;
          pool -= pAlloc.addEmp;
          surplusSaved += pAlloc.addEmp;

          if (canSpouseSave && spouse && pool > 1) {
            const sAlloc = allocateExtraRrsp(res.sYearIncome, res.sEmployeeRrsp, res.sRrspContrib, spouse.employerMatch);
            res.sEmployeeRrsp = sAlloc.newEmp;
            res.sEmployerMatch = sAlloc.newMatch;
            res.sRrspContrib = sAlloc.newTotal;
            pool -= sAlloc.addEmp;
            surplusSaved += sAlloc.addEmp;
          }
        } else if (acc === 'fhsa') {
          if (state.pFhsaActive && state.pCumulativeFhsa < FHSA_LIFETIME_LIMIT && pool > 1) {
            const statutoryRoom = Math.max(0, Math.min(FHSA_ANNUAL_LIMIT - res.pFhsaContrib, FHSA_LIFETIME_LIMIT - state.pCumulativeFhsa));
            const effRoom = respectCaps && caps.fhsa?.enabled
              ? Math.max(0, Math.min(statutoryRoom, caps.fhsa.maxAmount - res.pFhsaContrib))
              : statutoryRoom;
            const addP = Math.min(pool, effRoom);
            res.pFhsaContrib += addP;
            state.pCumulativeFhsa += addP;
            pool -= addP;
            surplusSaved += addP;
          }
          if (canSpouseSave && spouse && state.sFhsaActive && state.sCumulativeFhsa < FHSA_LIFETIME_LIMIT && pool > 1) {
            const statutoryRoom = Math.max(0, Math.min(FHSA_ANNUAL_LIMIT - res.sFhsaContrib, FHSA_LIFETIME_LIMIT - state.sCumulativeFhsa));
            const effRoom = respectCaps && caps.fhsa?.enabled
              ? Math.max(0, Math.min(statutoryRoom, caps.fhsa.maxAmount - res.sFhsaContrib))
              : statutoryRoom;
            const addS = Math.min(pool, effRoom);
            res.sFhsaContrib += addS;
            state.sCumulativeFhsa += addS;
            pool -= addS;
            surplusSaved += addS;
          }
        } else if (acc === 'tfsa') {
          const tfsaLimit = TFSA_ANNUAL_LIMIT * inflationFactor;
          const pEffCap = respectCaps && caps.tfsa?.enabled ? Math.min(tfsaLimit, caps.tfsa.maxAmount) : tfsaLimit;
          const pRoom = Math.max(0, pEffCap - res.pTfsaContrib);
          const addPTfsa = Math.min(pool, pRoom);
          res.pTfsaContrib += addPTfsa;
          pool -= addPTfsa;
          surplusSaved += addPTfsa;

          if (isCouple && spouse && !spouseStopped && pool > 1) {
            const sEffCap = respectCaps && caps.tfsa?.enabled ? Math.min(tfsaLimit, caps.tfsa.maxAmount) : tfsaLimit;
            const sRoom = Math.max(0, sEffCap - res.sTfsaContrib);
            const addSTfsa = Math.min(pool, sRoom);
            res.sTfsaContrib += addSTfsa;
            pool -= addSTfsa;
            surplusSaved += addSTfsa;
          }
        } else if (acc === 'nonReg') {
          const nonRegCap = respectCaps && caps.nonReg?.enabled
            ? Math.max(0, caps.nonReg.maxAmount - (res.pNonRegContrib + res.sNonRegContrib))
            : Infinity;
          const addNonReg = Math.min(pool, nonRegCap);
          if (addNonReg > 0) {
            if (canSpouseSave && !hasCustomNonReg) {
              res.pNonRegContrib += addNonReg / 2;
              res.sNonRegContrib += addNonReg / 2;
            } else {
              res.pNonRegContrib += addNonReg;
              if (hasCustomNonReg) {
                const perAcc = addNonReg / balances.customAccountsState.length;
                balances.customAccountsState.forEach((customAcc) => {
                  customAcc.currentContribution += perAcc;
                });
              }
            }
            pool -= addNonReg;
            surplusSaved += addNonReg;
          }
        }
      }

      // Catch-all: ensure any remaining positive surplus flows into savings (non-reg overflow if registered accounts & caps filled)
      if (pool > 1) {
        if (canSpouseSave && !hasCustomNonReg) {
          res.pNonRegContrib += pool / 2;
          res.sNonRegContrib += pool / 2;
        } else {
          res.pNonRegContrib += pool;
          if (hasCustomNonReg) {
            const perAcc = pool / balances.customAccountsState.length;
            balances.customAccountsState.forEach((customAcc) => {
              customAcc.currentContribution += perAcc;
            });
          }
        }
        surplusSaved += pool;
        pool = 0;
      }

      recomputeTaxes();
    } else {
      break;
    }
  }

  return { surplusSaved };
}
