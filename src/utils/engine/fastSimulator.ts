import { RetirementInputs, StressTestOptions } from '../../types/retirement';
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

  const contributionState: ContributionYearState = {
    pEmploymentIncome: currentAnnualIncome,
    sEmploymentIncome: isCouple && spouse ? spouse.annualIncome : 0,
    pCumulativeFhsa: Math.min(40000, initialFhsa),
    sCumulativeFhsa: isCouple && spouse ? Math.min(40000, spouse.fhsaBalance) : 0,
    pFhsaActive,
    sFhsaActive,
    lifetimeEmploymentIncome: 0
  };

  let depletionAge: number | null = null;
  let netWorthAtRetirement = 0;
  let finalNetWorth = 0;

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

    // Determine Annual Living Expenses
    let currentLivingExpensesNominal: number;
    if (isRetired) {
      currentLivingExpensesNominal = targetRetirementSpendingToday * inflationFactor;
      if (housingResult.remainingMortgage > 0) {
        const annualMortgage = (housingParams.isFuturePurchase ? housingState.futureActualMonthlyPmt : housingParams.monthlyMortgagePmt) * 12;
        currentLivingExpensesNominal += annualMortgage * inflationFactor;
      }
    } else {
      if (housingParams.isFuturePurchase) {
        if (age < housingParams.futurePurchaseAge) {
          currentLivingExpensesNominal = (housingParams.currentRentMonthly + housingParams.nonHousingMonthly) * 12 * inflationFactor;
        } else if (housingResult.remainingMortgage > 0) {
          currentLivingExpensesNominal = (housingState.futureActualMonthlyPmt + housingParams.nonHousingMonthly) * 12 * inflationFactor;
        } else {
          currentLivingExpensesNominal = housingParams.nonHousingMonthly * 12 * inflationFactor;
        }
      } else {
        if (housingResult.remainingMortgage <= 0 && housingParams.ownsHome) {
          currentLivingExpensesNominal = housingParams.nonHousingMonthly * 12 * inflationFactor;
        } else {
          currentLivingExpensesNominal = housingParams.initialAnnualExpenses * inflationFactor;
        }
      }
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
        inflationFactor
      );

      calculateRetirementTaxesAndCashflow(
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
    }

    const currentLiquidPortfolio =
      balances.pRrsp + balances.pTfsa + balances.pFhsa + balances.pNonReg +
      balances.sRrsp + balances.sTfsa + balances.sFhsa + balances.sNonReg;
    const currentTotalNetWorth = currentLiquidPortfolio + housingResult.userRealEstateShare;

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
