import { RetirementInputs, SpouseInputs } from '../../types/retirement';
import { calculateCanadianTax, TFSA_ANNUAL_LIMIT, FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT } from '../canadianTax';

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
      yearFhsaWithdrawalOrTransfer += balances.pFhsa;
      notes.push(`🏠 Age ${age}: FHSA fully withdrawn tax-free ($${Math.round(balances.pFhsa).toLocaleString()}) for qualifying home purchase!`);
      balances.pFhsa = 0;
      state.pFhsaActive = false;
    } else if (age >= 71 || primaryReached15Years) {
      const destAccount = age >= 71 ? 'RRIF' : (isPrimaryRetired ? 'RRIF / RRSP' : 'RRSP');
      balances.pRrsp += balances.pFhsa;
      yearFhsaWithdrawalOrTransfer += balances.pFhsa;
      fhsaRolledOver = true;
      const triggerReason = age >= 71
        ? 'reaching CRA maximum age 71'
        : `reaching 15-year participation limit (account opened in ${primaryFhsaOpenYear})`;
      notes.push(`🔄 Age ${age} (Year ${currentSimYear}): FHSA reached its 15-year limit (${triggerReason}) and rolled over $${Math.round(balances.pFhsa).toLocaleString()} into ${destAccount} 100% tax-free.`);
      balances.pFhsa = 0;
      state.pFhsaActive = false;
    }
  }

  // 2. Spouse FHSA Lifecycle Check
  if (isCouple && spouse && state.sFhsaActive && spouseAge !== undefined) {
    const spouseFhsaOpenYear = spouse.fhsaOpenYear || 2023;
    const spouseYearsSinceOpen = currentSimYear - spouseFhsaOpenYear;
    const spouseReached15Years = spouseYearsSinceOpen >= 15;

    if (spouse.fhsaIntent === 'home_purchase' && (!isFuturePurchase || fundWithFhsa) && spouseAge === spouse.fhsaHomePurchaseAge) {
      yearFhsaWithdrawalOrTransfer += balances.sFhsa;
      notes.push(`🏠 Spouse Age ${spouseAge}: Spouse FHSA withdrawn tax-free ($${Math.round(balances.sFhsa).toLocaleString()}) for qualifying home purchase!`);
      balances.sFhsa = 0;
      state.sFhsaActive = false;
    } else if (spouseAge >= 71 || spouseReached15Years) {
      const destAccount = spouseAge >= 71 ? 'RRIF' : (isSpouseRetired ? 'RRIF / RRSP' : 'RRSP');
      balances.sRrsp += balances.sFhsa;
      yearFhsaWithdrawalOrTransfer += balances.sFhsa;
      fhsaRolledOver = true;
      const triggerReason = spouseAge >= 71
        ? 'reaching CRA maximum age 71'
        : `reaching 15-year participation limit (account opened in ${spouseFhsaOpenYear})`;
      notes.push(`🔄 Spouse Age ${spouseAge} (Year ${currentSimYear}): Spouse FHSA reached its 15-year limit (${triggerReason}) and rolled over $${Math.round(balances.sFhsa).toLocaleString()} into ${destAccount} 100% tax-free.`);
      balances.sFhsa = 0;
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

    pRrspContrib = Math.max(0, inputs.rrspAnnualContribution);
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

    pTaxable = Math.max(0, pYearIncome - pRrspContrib - pFhsaContrib);
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

    sRrspContrib = Math.max(0, spouse.rrspAnnualContribution);
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

    sTaxable = Math.max(0, sYearIncome - sRrspContrib - sFhsaContrib);
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
