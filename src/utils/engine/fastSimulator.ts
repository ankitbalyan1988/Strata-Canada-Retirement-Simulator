import { RetirementInputs, StressTestOptions } from '../../types/retirement';
import { calculateCanadianTax } from '../canadianTax';
import {
  initializeMortgageAndHousingParams,
  calculateMortgageAndHousingForYear,
  HousingYearState
} from './calculateMortgageAndHousing';
import {
  calculateContributionsForYear,
  ContributionYearState,
  CustomAccountState
} from './calculateContributions';
import { calculateInvestmentReturnsForYear } from './calculateInvestmentReturns';
import { calculateDecumulationForYear } from './calculateDecumulation';
import {
  calculateGovernmentPensionsForYear,
  calculateRetirementTaxesAndCashflow
} from './calculatePensionsAndTaxes';
import { initializeDebtStates, calculateDebtsForYear, DebtYearState } from '../debtCalculator';

export interface FastSimulationResult {
  isFullyFunded: boolean;
  netWorthAtLifeExpectancy: number;
  netWorthAtRetirement: number;
  depletionAge: number | null;
}

/**
 * Stripped-down, high-performance evaluation routine for binary searches (e.g. Savings Pulse and Coast FIRE).
 * Skips yearly result array allocations, string formatting, notes generation, and milestone tracking
 * to find convergence in minimal clock cycles.
 */
export function fastSimulateEndNetWorth(
  inputs: RetirementInputs,
  stopContributionsAge?: number,
  stressTest?: StressTestOptions
): FastSimulationResult {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;

  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    province,
    currentAnnualIncome,
    targetRetirementSpendingToday,
    rrspBalance: initialRrsp,
    tfsaBalance: initialTfsa,
    fhsaBalance: initialFhsa,
    nonRegBalance: initialNonReg,
    inflationRate,
    drawdownStrategy
  } = inputs;

  const isBlankCanvas = (
    (currentAnnualIncome || 0) === 0 &&
    (targetRetirementSpendingToday || 0) === 0 &&
    (initialRrsp || 0) === 0 &&
    (initialTfsa || 0) === 0 &&
    (initialNonReg || 0) === 0 &&
    (initialFhsa || 0) === 0 &&
    (!isCouple || (((spouse?.annualIncome || 0) === 0) && ((spouse?.rrspBalance || 0) === 0)))
  );

  if (isBlankCanvas) {
    return {
      isFullyFunded: false,
      netWorthAtLifeExpectancy: 0,
      netWorthAtRetirement: 0,
      depletionAge: null
    };
  }

  const totalYears = Math.max(1, lifeExpectancy - currentAge + 1);

  // 1. Housing Engine Params
  const housingParams = initializeMortgageAndHousingParams(inputs, isCouple);

  // 2. Liquid Balances & Custom Accounts
  const hasCustomNonReg = Boolean(inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0);
  const customAccountsState: CustomAccountState[] = hasCustomNonReg
    ? inputs.nonRegCustomAccounts!.map((acc) => ({
        id: acc.id,
        name: acc.name,
        category: acc.category,
        balance: Math.max(0, acc.balance),
        annualContribution: Math.max(0, acc.annualContribution),
        expectedReturn: acc.expectedReturn,
        gicCloseYear: acc.gicCloseYear || (acc.gicCloseDate ? parseInt(acc.gicCloseDate.split('-')[0], 10) : 2028),
        matured: false,
        currentContribution: 0
      }))
    : [];

  const initialNonRegCalculated = hasCustomNonReg
    ? customAccountsState.reduce((sum, a) => sum + a.balance, 0)
    : Math.max(0, initialNonReg);

  const balances = {
    pRrsp: Math.max(0, initialRrsp),
    pTfsa: Math.max(0, initialTfsa),
    pFhsa: Math.max(0, initialFhsa),
    pNonReg: initialNonRegCalculated,
    sRrsp: isCouple && spouse ? Math.max(0, spouse.rrspBalance) : 0,
    sTfsa: isCouple && spouse ? Math.max(0, spouse.tfsaBalance) : 0,
    sFhsa: isCouple && spouse ? Math.max(0, spouse.fhsaBalance) : 0,
    sNonReg: isCouple && spouse ? Math.max(0, spouse.nonRegBalance) : 0,
    customAccountsState
  };

  const pFhsaActive = balances.pFhsa > 0 || (inputs.fhsaAnnualContribution > 0 && currentAge < 71);
  const sFhsaActive = isCouple && spouse ? (balances.sFhsa > 0 || (spouse.fhsaAnnualContribution > 0 && spouse.currentAge < 71)) : false;

  const housingState: HousingYearState = {
    homeSold: false,
    homeSoldAge: null,
    homeNetProceedsAtSale: 0,
    futurePurchaseExecuted: false,
    futureActualLoanPrincipal: housingParams.targetFutureDownPayment > 0
      ? Math.max(0, housingParams.nominalPurchasePrice - housingParams.targetFutureDownPayment)
      : 0,
    futureActualMonthlyPmt: housingParams.calcMonthlyPmtForLoan(
      Math.max(0, housingParams.nominalPurchasePrice - housingParams.targetFutureDownPayment)
    ),
    totalDownPaymentFunded: 0,
    pFhsaActive,
    sFhsaActive
  };

  const pRemainingFhsa = inputs.fhsaRemainingContributionRoom !== undefined
    ? Math.min(40000, Math.max(0, inputs.fhsaRemainingContributionRoom))
    : Math.max(0, 40000 - Math.min(40000, initialFhsa));
  const pInitialCumulativeFhsa = Math.max(0, 40000 - pRemainingFhsa);

  const sRemainingFhsa = (isCouple && spouse && spouse.fhsaRemainingContributionRoom !== undefined)
    ? Math.min(40000, Math.max(0, spouse.fhsaRemainingContributionRoom))
    : Math.max(0, 40000 - Math.min(40000, isCouple && spouse ? spouse.fhsaBalance : 0));
  const sInitialCumulativeFhsa = Math.max(0, 40000 - sRemainingFhsa);

  const contributionState: ContributionYearState = {
    pEmploymentIncome: currentAnnualIncome,
    sEmploymentIncome: isCouple && spouse ? spouse.annualIncome : 0,
    pCumulativeFhsa: pInitialCumulativeFhsa,
    sCumulativeFhsa: sInitialCumulativeFhsa,
    pFhsaActive,
    sFhsaActive,
    lifetimeEmploymentIncome: 0
  };

  let depletionAge: number | null = null;
  let netWorthAtRetirement = 0;
  let finalNetWorth = 0;

  const effectiveDebts = inputs.hasOngoingOrFutureDebts === false ? [] : (inputs.debts || []);
  const debtStates: DebtYearState[] = initializeDebtStates(effectiveDebts, currentAge, inputs.debtStrategy);

  for (let i = 0; i < totalYears; i++) {
    const age = currentAge + i;
    const spouseAge = isCouple && spouse ? spouse.currentAge + i : undefined;
    const isPrimaryRetired = age >= retirementAge;
    const isSpouseRetired = isCouple && spouse ? (spouseAge! >= spouse.retirementAge) : true;
    const isRetired = isPrimaryRetired;

    const inflationFactor = Math.pow(1 + inflationRate / 100, i);

    // 1. Mortgage & Real Estate
    const housingResult = calculateMortgageAndHousingForYear(
      age,
      spouseAge,
      i,
      housingParams,
      housingState,
      balances,
      isCouple
    );

    if (!housingState.pFhsaActive) {
      contributionState.pFhsaActive = false;
    }
    if (!housingState.sFhsaActive) {
      contributionState.sFhsaActive = false;
    }

    // 2. Contributions
    const contributionResult = calculateContributionsForYear(
      age,
      spouseAge,
      i,
      inputs,
      contributionState,
      balances,
      isCouple,
      spouse,
      inflationFactor,
      isPrimaryRetired,
      isSpouseRetired,
      housingParams.initialAnnualExpenses,
      stopContributionsAge
    );

    if (!contributionState.pFhsaActive) {
      housingState.pFhsaActive = false;
    }
    if (!contributionState.sFhsaActive) {
      housingState.sFhsaActive = false;
    }

    // 3. Compounding & Returns
    calculateInvestmentReturnsForYear(
      age,
      retirementAge,
      i,
      inputs,
      balances,
      {
        pRrspContrib: contributionResult.pRrspContrib,
        pTfsaContrib: contributionResult.pTfsaContrib,
        pFhsaContrib: contributionResult.pFhsaContrib,
        pNonRegContrib: contributionResult.pNonRegContrib,
        sRrspContrib: contributionResult.sRrspContrib,
        sTfsaContrib: contributionResult.sTfsaContrib,
        sFhsaContrib: contributionResult.sFhsaContrib,
        sNonRegContrib: contributionResult.sNonRegContrib
      },
      isRetired,
      isPrimaryRetired,
      stressTest
    );

    // Advance Debts
    const debtResult = calculateDebtsForYear(debtStates, age, inputs.debtStrategy);

    // Determine Annual Living Expenses
    let currentLivingExpensesNominal: number;
    if (isRetired) {
      currentLivingExpensesNominal = targetRetirementSpendingToday * inflationFactor;
      if (housingResult.remainingMortgage > 0) {
        const annualMortgage = (housingParams.isFuturePurchase ? housingState.futureActualMonthlyPmt : housingParams.monthlyMortgagePmt) * 12;
        currentLivingExpensesNominal += annualMortgage * inflationFactor;
      }
      if (housingResult.housingStatus === 'mortgage_free' || housingResult.housingStatus === 'mortgage') {
        const ongoingOwnershipAnnual = housingParams.otherOwnershipCostsMonthly * 12;
        currentLivingExpensesNominal += ongoingOwnershipAnnual * inflationFactor;
      }
      if (debtResult.totalAnnualPayment > 0) {
        currentLivingExpensesNominal += debtResult.totalAnnualPayment;
      }
    } else {
      currentLivingExpensesNominal = (housingResult.yearHousingCost + housingParams.nonHousingMonthly * 12) * inflationFactor;
    }
    const targetSpendingNominal = Math.round(currentLivingExpensesNominal);

    if (isRetired) {
      const pensions = calculateGovernmentPensionsForYear(age, spouseAge, inputs, isCouple, spouse, inflationFactor);
      const guaranteedCash =
        pensions.pCppIncome +
        pensions.pGrossOas +
        pensions.sCppIncome +
        pensions.sGrossOas +
        (!isSpouseRetired ? contributionResult.sYearIncome - contributionResult.sTaxPaid : 0);

      const decumulationResult = calculateDecumulationForYear(
        age,
        spouseAge,
        i,
        targetSpendingNominal,
        guaranteedCash,
        drawdownStrategy,
        balances,
        isCouple,
        spouse,
        inflationFactor,
        {
          startAge: inputs.meltdownStartAge ?? inputs.retirementAge,
          targetStrategy: inputs.meltdownTargetStrategy ?? 'bracket1'
        }
      );

      const taxCashflowResult = calculateRetirementTaxesAndCashflow(
        age,
        spouseAge,
        i,
        pensions,
        {
          pRrspWithdrawal: decumulationResult.pRrspWithdrawal + decumulationResult.pRrifWithdrawal,
          sRrspWithdrawal: decumulationResult.sRrspWithdrawal + decumulationResult.sRrifWithdrawal,
          pTfsaWithdrawal: decumulationResult.pTfsaWithdrawal,
          sTfsaWithdrawal: decumulationResult.sTfsaWithdrawal,
          pNonRegWithdrawal: decumulationResult.pNonRegWithdrawal,
          sNonRegWithdrawal: decumulationResult.sNonRegWithdrawal
        },
        targetSpendingNominal,
        province,
        isCouple,
        spouse,
        inflationFactor
      );

      const netSpendable = Math.max(0, taxCashflowResult.netSpendableCashflow - debtResult.totalAnnualPayment);
      if (netSpendable > targetSpendingNominal) {
        const surplus = netSpendable - targetSpendingNominal;
        const tfsaAnnualLimit = 7000 * inflationFactor;
        const pTfsaReinvest = Math.min(surplus * (isCouple ? 0.5 : 1.0), tfsaAnnualLimit);
        const sTfsaReinvest = isCouple && spouse ? Math.min(surplus * 0.5, tfsaAnnualLimit) : 0;
        balances.pTfsa += pTfsaReinvest;
        balances.sTfsa += sTfsaReinvest;
        const remSurplus = Math.max(0, surplus - (pTfsaReinvest + sTfsaReinvest));
        if (remSurplus > 0) {
          if (isCouple && spouse) {
            balances.pNonReg += remSurplus / 2;
            balances.sNonReg += remSurplus / 2;
          } else {
            balances.pNonReg += remSurplus;
          }
        }
      }
    } else if (
      inputs.drawdownStrategy === 'rrsp_meltdown' &&
      age >= (inputs.meltdownStartAge ?? inputs.retirementAge) &&
      age < 72 &&
      (balances.pRrsp > 0 || (isCouple && spouse && balances.sRrsp > 0))
    ) {
      const meltdownTarget = inputs.meltdownTargetStrategy ?? 'bracket1';
      const yearsRemaining = Math.max(1, 72 - age);
      const sYearsRemaining = isCouple && spouse && spouseAge !== undefined ? Math.max(1, 72 - spouseAge) : yearsRemaining;

      let pTargetCeiling = 57375 * inflationFactor;
      let sTargetCeiling = 57375 * inflationFactor;
      if (meltdownTarget === 'bracket1') {
        pTargetCeiling = 57375 * inflationFactor;
        sTargetCeiling = 57375 * inflationFactor;
      } else if (meltdownTarget === 'oas_threshold') {
        pTargetCeiling = 93208 * inflationFactor;
        sTargetCeiling = 93208 * inflationFactor;
      } else {
        pTargetCeiling = Math.max(25000 * inflationFactor, balances.pRrsp / yearsRemaining);
        sTargetCeiling = Math.max(25000 * inflationFactor, (isCouple && spouse ? balances.sRrsp : 0) / sYearsRemaining);
      }

      let pRrspDraw = 0;
      if (balances.pRrsp > 0) {
        const pEarned = contributionResult.pYearIncome;
        const pRoom = meltdownTarget === 'even_meltdown' ? pTargetCeiling : Math.max(0, pTargetCeiling - pEarned);
        const pMinSlice = balances.pRrsp / yearsRemaining;
        const pTargetDraw = Math.max(pRoom, pMinSlice);
        pRrspDraw = Math.min(balances.pRrsp, pTargetDraw);
        balances.pRrsp -= pRrspDraw;
      }

      let sRrspDraw = 0;
      if (isCouple && spouse && spouseAge !== undefined && spouseAge < 72 && balances.sRrsp > 0) {
        const sEarned = contributionResult.sYearIncome;
        const sRoom = meltdownTarget === 'even_meltdown' ? sTargetCeiling : Math.max(0, sTargetCeiling - sEarned);
        const sMinSlice = balances.sRrsp / sYearsRemaining;
        const sTargetDraw = Math.max(sRoom, sMinSlice);
        sRrspDraw = Math.min(balances.sRrsp, sTargetDraw);
        balances.sRrsp -= sRrspDraw;
      }

      const pNewTax = calculateCanadianTax(contributionResult.pTaxable + pRrspDraw, province, age).totalTax;
      const additionalPTax = Math.max(0, pNewTax - contributionResult.pTaxPaid);
      let additionalSTax = 0;
      if (isCouple && spouse && spouseAge !== undefined) {
        const sNewTax = calculateCanadianTax(contributionResult.sTaxable + sRrspDraw, province, spouseAge).totalTax;
        additionalSTax = Math.max(0, sNewTax - contributionResult.sTaxPaid);
      }

      const pNetProceeds = Math.max(0, pRrspDraw - additionalPTax);
      const sNetProceeds = Math.max(0, sRrspDraw - additionalSTax);

      const tfsaAnnualLimit = 7000 * inflationFactor;
      const pTfsaRoom = Math.max(0, tfsaAnnualLimit - contributionResult.pTfsaContrib);
      const pTfsaReinvest = Math.min(pNetProceeds, pTfsaRoom);
      balances.pTfsa += pTfsaReinvest;
      balances.pNonReg += (pNetProceeds - pTfsaReinvest);

      if (isCouple && spouse) {
        const sTfsaRoom = Math.max(0, tfsaAnnualLimit - contributionResult.sTfsaContrib);
        const sTfsaReinvest = Math.min(sNetProceeds, sTfsaRoom);
        balances.sTfsa += sTfsaReinvest;
        balances.sNonReg += (sNetProceeds - sTfsaReinvest);
      }
    }

    const currentLiquidPortfolio =
      balances.pRrsp + balances.pTfsa + balances.pFhsa + balances.pNonReg +
      balances.sRrsp + balances.sTfsa + balances.sFhsa + balances.sNonReg;
    const currentTotalNetWorth = currentLiquidPortfolio + housingResult.userRealEstateShare - debtResult.totalRemainingBalance;

    if (age === retirementAge - 1 || (currentAge === retirementAge && i === 0)) {
      netWorthAtRetirement = Math.round(currentTotalNetWorth);
    }

    if (isRetired && currentTotalNetWorth <= 0 && depletionAge === null && age > retirementAge) {
      depletionAge = age;
    }

    if (i === totalYears - 1) {
      finalNetWorth = Math.round(currentTotalNetWorth);
    }
  }

  const isFullyFunded = depletionAge === null && finalNetWorth >= 0;

  return {
    isFullyFunded,
    netWorthAtLifeExpectancy: finalNetWorth,
    netWorthAtRetirement,
    depletionAge
  };
}
