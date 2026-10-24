import {
  RetirementInputs,
  YearSimulationResult,
  SimulationSummary,
  StressTestOptions
} from '../types/retirement';
import { calculateCanadianTax } from './canadianTax';
import {
  initializeMortgageAndHousingParams,
  calculateMortgageAndHousingForYear,
  HousingYearState
} from './engine/calculateMortgageAndHousing';
import {
  calculateContributionsForYear,
  ContributionYearState,
  CustomAccountState
} from './engine/calculateContributions';
import { calculateInvestmentReturnsForYear } from './engine/calculateInvestmentReturns';
import { calculateDecumulationForYear } from './engine/calculateDecumulation';
import {
  calculateGovernmentPensionsForYear,
  calculateRetirementTaxesAndCashflow,
  GovernmentPensionsResult
} from './engine/calculatePensionsAndTaxes';
import {
  evaluateSimulationMilestones,
  MilestoneSimulationOptions
} from './engine/evaluateSimulationMilestones';
import { fastSimulateEndNetWorth, FastSimulationResult } from './engine/fastSimulator';

export { fastSimulateEndNetWorth };
export type { FastSimulationResult };

export interface SimulationOptions extends MilestoneSimulationOptions {}

/**
 * Executes multi-year Canadian retirement projection simulation using modular engine sub-routines.
 */
export function runRetirementSimulation(
  inputs: RetirementInputs,
  stressTest?: StressTestOptions,
  simulationOptions?: SimulationOptions
): {
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
} {
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
  const yearlyResults: YearSimulationResult[] = [];

  // 1. Initialize Real Estate & Housing Engine Params
  const housingParams = initializeMortgageAndHousingParams(inputs, isCouple);

  // 2. Initialize Liquid Balances & Custom Accounts
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

  // 3. Engine States
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

  // Lifetime & milestone tracking metrics
  let depletionAge: number | null = null;
  let peakNetWorth = 0;
  let peakNetWorthAge = currentAge;
  let netWorthAtRetirement = 0;
  let homeEquityAtRetirement = 0;
  let liquidNetWorthAtRetirement = 0;

  let lifetimeCppReceived = 0;
  let lifetimeOasReceived = 0;
  let lifetimeTaxesPaid = 0;
  let lifetimeInvestmentGrowth = 0;
  let totalRetirementYears = 0;
  let sumAnnualRetirementSpend = 0;
  let sumEffectiveTaxInRetirement = 0;

  // 4. Primary Multi-Year Simulation Loop
  for (let i = 0; i < totalYears; i++) {
    const age = currentAge + i;
    const spouseAge = isCouple && spouse ? spouse.currentAge + i : undefined;
    const yearNumber = i + 1;
    const isPrimaryRetired = age >= retirementAge;
    const isSpouseRetired = isCouple && spouse ? (spouseAge! >= spouse.retirementAge) : true;
    const isRetired = isPrimaryRetired;
    const yearNotes: string[] = [];

    const inflationFactor = Math.pow(1 + inflationRate / 100, i);

    // Sub-Routine 1: Mortgage & Real Estate
    const housingResult = calculateMortgageAndHousingForYear(
      age,
      spouseAge,
      i,
      housingParams,
      housingState,
      balances,
      isCouple
    );
    yearNotes.push(...housingResult.notes);

    // Sync FHSA active status: once closed or deployed, it remains closed
    if (!housingState.pFhsaActive) {
      contributionState.pFhsaActive = false;
    }
    if (!housingState.sFhsaActive) {
      contributionState.sFhsaActive = false;
    }

    // Sub-Routine 2: Contributions, Wage Growth & Pre-Retirement Deductions
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
      simulationOptions?.stopContributionsAge
    );
    yearNotes.push(...contributionResult.notes);

    // Sync FHSA active status back to housingState so future loop iterations never reactivate it
    if (!contributionState.pFhsaActive) {
      housingState.pFhsaActive = false;
    }
    if (!contributionState.sFhsaActive) {
      housingState.sFhsaActive = false;
    }

    // Sub-Routine 3: Investment Returns, Yield Drag, GIC Maturity & Stress Testing
    const investmentResult = calculateInvestmentReturnsForYear(
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
    yearNotes.push(...investmentResult.notes);
    lifetimeInvestmentGrowth += investmentResult.totalGrowth;

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

    // Decumulation & Retirement Cashflow variables
    let pensions: GovernmentPensionsResult = { pCppIncome: 0, sCppIncome: 0, pGrossOas: 0, sGrossOas: 0 };
    let pRrspWithdrawal = 0;
    let sRrspWithdrawal = 0;
    let pRrifWithdrawal = 0;
    let sRrifWithdrawal = 0;
    let pTfsaWithdrawal = 0;
    let sTfsaWithdrawal = 0;
    let pNonRegWithdrawal = 0;
    let sNonRegWithdrawal = 0;
    const isPrimaryRrif = age >= 72;
    const isSpouseRrif = Boolean(isCouple && spouse && spouseAge !== undefined && spouseAge >= 72);
    let isRrifMandatory = Boolean(isPrimaryRrif || isSpouseRrif);
    let rrifMinimumWithdrawal = 0;
    let isRrifMinMet = true;

    let pTaxable = contributionResult.pTaxable;
    let sTaxable = contributionResult.sTaxable;
    let pTaxPaid = contributionResult.pTaxPaid;
    let sTaxPaid = contributionResult.sTaxPaid;
    let pOasClawback = 0;
    let sOasClawback = 0;
    let pNetOas = 0;
    let sNetOas = 0;
    let netSpendableCashflow = 0;
    let cashflowGap = 0;

    if (isRetired) {
      totalRetirementYears++;
      sumAnnualRetirementSpend += targetSpendingNominal;

      // Sub-Routine 4A: Government Pensions
      pensions = calculateGovernmentPensionsForYear(age, spouseAge, inputs, isCouple, spouse, inflationFactor);
      lifetimeCppReceived += pensions.pCppIncome + pensions.sCppIncome;

      const guaranteedCash =
        pensions.pCppIncome +
        pensions.pGrossOas +
        pensions.sCppIncome +
        pensions.sGrossOas +
        (!isSpouseRetired ? contributionResult.sYearIncome - contributionResult.sTaxPaid : 0);

      // Sub-Routine 4B: Decumulation Sequencing
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

      pRrspWithdrawal = decumulationResult.pRrspWithdrawal;
      sRrspWithdrawal = decumulationResult.sRrspWithdrawal;
      pRrifWithdrawal = decumulationResult.pRrifWithdrawal;
      sRrifWithdrawal = decumulationResult.sRrifWithdrawal;
      pTfsaWithdrawal = decumulationResult.pTfsaWithdrawal;
      sTfsaWithdrawal = decumulationResult.sTfsaWithdrawal;
      pNonRegWithdrawal = decumulationResult.pNonRegWithdrawal;
      sNonRegWithdrawal = decumulationResult.sNonRegWithdrawal;
      rrifMinimumWithdrawal = decumulationResult.rrifMinimumWithdrawal;
      isRrifMandatory = decumulationResult.isRrifMandatory;
      isRrifMinMet = decumulationResult.isRrifMinMet;

      // Sub-Routine 4C: Retirement Taxes, T1032 Splitting & Cashflow Gap
      const taxCashflowResult = calculateRetirementTaxesAndCashflow(
        age,
        spouseAge,
        i,
        pensions,
        {
          pRrspWithdrawal: pRrspWithdrawal + pRrifWithdrawal,
          sRrspWithdrawal: sRrspWithdrawal + sRrifWithdrawal,
          pTfsaWithdrawal,
          sTfsaWithdrawal,
          pNonRegWithdrawal,
          sNonRegWithdrawal
        },
        targetSpendingNominal,
        province,
        isCouple,
        spouse,
        inflationFactor
      );

      pTaxable = taxCashflowResult.pTaxable;
      sTaxable = taxCashflowResult.sTaxable;
      pOasClawback = taxCashflowResult.pOasClawback;
      sOasClawback = taxCashflowResult.sOasClawback;
      pNetOas = taxCashflowResult.pNetOas;
      sNetOas = taxCashflowResult.sNetOas;
      pTaxPaid = taxCashflowResult.pTaxPaid;
      sTaxPaid = taxCashflowResult.sTaxPaid;
      netSpendableCashflow = taxCashflowResult.netSpendableCashflow;
      cashflowGap = taxCashflowResult.cashflowGap;
      lifetimeOasReceived += pNetOas + sNetOas;
      yearNotes.push(...taxCashflowResult.notes);
    }

    const totalTaxPaid = pTaxPaid + sTaxPaid;
    lifetimeTaxesPaid += totalTaxPaid;
    if (isRetired) {
      sumEffectiveTaxInRetirement += (pTaxable + sTaxable > 0 ? totalTaxPaid / (pTaxable + sTaxable) : 0);
    }

    const currentLiquidPortfolio = balances.pRrsp + balances.pTfsa + balances.pFhsa + balances.pNonReg +
      balances.sRrsp + balances.sTfsa + balances.sFhsa + balances.sNonReg;
    const currentTotalNetWorth = currentLiquidPortfolio + housingResult.userRealEstateShare;

    if (currentTotalNetWorth > peakNetWorth) {
      peakNetWorth = currentTotalNetWorth;
      peakNetWorthAge = age;
    }

    if (age === retirementAge - 1 || (currentAge === retirementAge && i === 0)) {
      netWorthAtRetirement = currentTotalNetWorth;
      liquidNetWorthAtRetirement = currentLiquidPortfolio;
      homeEquityAtRetirement = housingResult.userRealEstateShare;
    }

    if (isRetired && currentTotalNetWorth <= 0 && depletionAge === null && age > retirementAge) {
      depletionAge = age;
      yearNotes.push(`Age ${age}: Household portfolio and assets depleted. Shortfall starts.`);
    }

    if (age === 71 && (balances.pRrsp > 0 || (isCouple && spouse && balances.sRrsp > 0))) {
      yearNotes.push(`Age 71: Mandatory CRA RRSP to RRIF conversion by Dec 31.`);
    }
    if (age >= 72 && rrifMinimumWithdrawal > 0) {
      yearNotes.push(`Age ${age}: Statutory CRA RRIF minimum withdrawal guideline ($${Math.round(rrifMinimumWithdrawal).toLocaleString()}) active.`);
    }

    const yearTotalWithdrawals =
      pRrspWithdrawal +
      sRrspWithdrawal +
      pRrifWithdrawal +
      sRrifWithdrawal +
      pTfsaWithdrawal +
      sTfsaWithdrawal +
      pNonRegWithdrawal +
      sNonRegWithdrawal;
    const totalYearContributions =
      contributionResult.pRrspContrib +
      contributionResult.sRrspContrib +
      contributionResult.pTfsaContrib +
      contributionResult.sTfsaContrib +
      contributionResult.pFhsaContrib +
      contributionResult.sFhsaContrib +
      contributionResult.pNonRegContrib +
      contributionResult.sNonRegContrib;

    const preRetirementNetCashflow = contributionResult.pYearIncome + contributionResult.sYearIncome - totalTaxPaid - totalYearContributions;

    yearlyResults.push({
      age,
      year: yearNumber,
      isRetired,
      employmentIncome: Math.round(contributionResult.pYearIncome + contributionResult.sYearIncome),
      cppIncome: Math.round(pensions.pCppIncome + pensions.sCppIncome),
      oasGrossIncome: Math.round(pensions.pGrossOas + pensions.sGrossOas),
      oasClawback: Math.round(pOasClawback + sOasClawback),
      oasNetIncome: Math.round(pNetOas + sNetOas),
      rrspBalance: age < 72 ? Math.round(balances.pRrsp + balances.sRrsp) : 0,
      rrifBalance: age >= 72 ? Math.round(balances.pRrsp + balances.sRrsp) : 0,
      tfsaBalance: Math.round(balances.pTfsa + balances.sTfsa),
      fhsaBalance: Math.round(balances.pFhsa + balances.sFhsa),
      nonRegBalance: Math.round(balances.pNonReg + balances.sNonReg),
      totalNetWorth: Math.round(currentTotalNetWorth),
      homeValue: Math.round(housingResult.yearHomeValue),
      remainingMortgage: Math.round(housingResult.remainingMortgage),
      homeEquity: Math.round(housingResult.yearHomeEquity),
      realEstateShare: Math.round(housingResult.userRealEstateShare),
      homeSoldThisYear: housingResult.homeSoldThisYear,
      homeSaleProceeds: Math.round(housingResult.homeSaleProceeds),
      isHomePurchasedThisYear: housingResult.isHomePurchasedThisYear,
      downPaymentPaidThisYear: Math.round(housingResult.downPaymentPaidThisYear),
      housingStatus: housingResult.housingStatus,
      rrspContribution: Math.round(contributionResult.pRrspContrib + contributionResult.sRrspContrib),
      tfsaContribution: Math.round(contributionResult.pTfsaContrib + contributionResult.sTfsaContrib),
      fhsaContribution: Math.round(contributionResult.pFhsaContrib + contributionResult.sFhsaContrib),
      nonRegContribution: Math.round(contributionResult.pNonRegContrib + contributionResult.sNonRegContrib),
      rrspWithdrawal: Math.round(pRrspWithdrawal + sRrspWithdrawal),
      rrifWithdrawal: Math.round(pRrifWithdrawal + sRrifWithdrawal),
      isRrifMinMet,
      tfsaWithdrawal: Math.round(pTfsaWithdrawal + sTfsaWithdrawal),
      nonRegWithdrawal: Math.round(pNonRegWithdrawal + sNonRegWithdrawal),
      fhsaWithdrawalOrTransfer: Math.round(housingResult.yearFhsaWithdrawalOrTransfer + contributionResult.yearFhsaWithdrawalOrTransfer),
      totalWithdrawals: Math.round(yearTotalWithdrawals),
      totalInvestmentGrowth: Math.round(investmentResult.totalGrowth),
      targetSpendingNominal: Math.round(targetSpendingNominal),
      totalGrossIncome: Math.round(
        contributionResult.pYearIncome +
        contributionResult.sYearIncome +
        pensions.pCppIncome +
        pensions.sCppIncome +
        pensions.pGrossOas +
        pensions.sGrossOas +
        yearTotalWithdrawals
      ),
      taxableIncome: Math.round(pTaxable + sTaxable),
      totalTaxPaid: Math.round(totalTaxPaid),
      effectiveTaxRate: (pTaxable + sTaxable > 0 ? totalTaxPaid / (pTaxable + sTaxable) : 0),
      marginalTaxRate: calculateCanadianTax(pTaxable, province, age, 0).marginalRate,
      netSpendableCashflow: Math.round(isRetired ? netSpendableCashflow : preRetirementNetCashflow),
      cashflowGap: Math.round(cashflowGap),
      isRrifMandatory,
      rrifMinimumWithdrawal: Math.round(rrifMinimumWithdrawal),
      fhsaRolledOver: contributionResult.fhsaRolledOver,
      notes: yearNotes,
      isCouple,
      spouseAge,
      isSpouseRetired,
      spouseEmploymentIncome: Math.round(contributionResult.sYearIncome),
      spouseCppIncome: Math.round(pensions.sCppIncome),
      spouseOasNetIncome: Math.round(sNetOas),
      spouseTaxPaid: Math.round(sTaxPaid)
    });
  }

  const finalYear = yearlyResults[yearlyResults.length - 1];
  const netWorthAtLifeExpectancy = finalYear ? finalYear.totalNetWorth : 0;
  const isFullyFunded = depletionAge === null && netWorthAtLifeExpectancy >= 0;

  const totalYearsInRetirement = Math.max(1, lifeExpectancy - retirementAge + 1);
  const yearsFunded = depletionAge !== null ? (depletionAge - retirementAge) : totalYearsInRetirement;
  const readinessScore = Math.min(100, Math.max(0, Math.round((yearsFunded / totalYearsInRetirement) * 100)));

  // 5. Evaluate Strategic Simulation Milestones via Analyzer Sub-Routine
  const milestoneResults = evaluateSimulationMilestones(
    yearlyResults,
    inputs,
    simulationOptions,
    stressTest,
    peakNetWorthAge,
    {
      ownsHome: housingParams.ownsHome,
      isFuturePurchase: housingParams.isFuturePurchase,
      futurePurchaseAge: housingParams.futurePurchaseAge,
      nominalPurchasePrice: housingParams.nominalPurchasePrice,
      totalDownPaymentFunded: housingState.totalDownPaymentFunded,
      initialMortgagePrincipal: housingParams.initialMortgagePrincipal,
      futureActualLoanPrincipal: housingState.futureActualLoanPrincipal
    },
    runRetirementSimulation
  );

  const summary: SimulationSummary = {
    portfolioDepletionAge: depletionAge,
    yearsFunded,
    totalYearsInRetirement,
    isFullyFunded,
    readinessScore,
    netWorthAtRetirement: Math.round(netWorthAtRetirement),
    netWorthAtLifeExpectancy: Math.round(netWorthAtLifeExpectancy),
    peakNetWorth: Math.round(peakNetWorth),
    peakNetWorthAge,
    ownsHome: housingParams.ownsHome,
    isFutureHomeBuyer: housingParams.isFuturePurchase,
    futurePurchaseAge: housingParams.isFuturePurchase ? housingParams.futurePurchaseAge : null,
    futurePurchaseYear: housingParams.isFuturePurchase ? housingParams.futurePurchaseYear : null,
    homeEquityAtRetirement: Math.round(homeEquityAtRetirement),
    homeSoldAge: housingState.homeSoldAge,
    homeNetProceedsAtSale: Math.round(housingState.homeNetProceedsAtSale),
    liquidNetWorthAtRetirement: Math.round(liquidNetWorthAtRetirement),
    lifetimeEmploymentIncome: Math.round(contributionState.lifetimeEmploymentIncome),
    lifetimeCppReceived: Math.round(lifetimeCppReceived),
    lifetimeOasReceived: Math.round(lifetimeOasReceived),
    lifetimeTaxesPaid: Math.round(lifetimeTaxesPaid),
    lifetimeInvestmentGrowth: Math.round(lifetimeInvestmentGrowth),
    averageAnnualRetirementSpendNominal: totalRetirementYears > 0 ? Math.round(sumAnnualRetirementSpend / totalRetirementYears) : 0,
    averageEffectiveTaxInRetirement: totalRetirementYears > 0 ? sumEffectiveTaxInRetirement / totalRetirementYears : 0,
    retirementAge,
    firstRrifMandatoryYear: 72,
    cppStartAge: inputs.cppStartAge,
    oasStartAge: inputs.oasStartAge,
    crossoverAge: milestoneResults.crossoverAge,
    crossoverYear: milestoneResults.crossoverYear,
    crossoverInvestmentGrowth: Math.round(milestoneResults.crossoverInvestmentGrowth),
    crossoverLivingExpenses: Math.round(milestoneResults.crossoverLivingExpenses),
    coastFireAge: milestoneResults.coastFireAge,
    coastFireYear: milestoneResults.coastFireYear,
    coastFireNetWorth: Math.round(milestoneResults.coastFireNetWorth),
    millionaireAge: milestoneResults.millionaireAge,
    millionaireYear: milestoneResults.millionaireYear,
    mortgagePayoffAge: milestoneResults.mortgagePayoffAge,
    mortgagePayoffYear: milestoneResults.mortgagePayoffYear,
    isCouple,
    spouseRetirementAge: isCouple && spouse ? spouse.retirementAge : undefined
  };

  return { yearlyResults, summary };
}

export interface SavingsPulseResult {
  currentMonthlySavings: number;
  requiredMonthlySavings: number;
  monthlyGap: number;
  status: 'surplus' | 'on_track' | 'underfunded' | 'critical';
  currentSavingsRate: number;
  requiredSavingsRate: number;
  projectedNestEggAtRetire: number;
  targetNestEggNeeded: number;
  recommendedAction: string;
  rrspTaxSavingsMonthly: number;
  workingYearsRemaining: number;
  monthlyBreakdown: {
    rrsp: number;
    tfsa: number;
    fhsa: number;
    nonReg: number;
  };
}

export function calculateSavingsPulse(
  inputs: RetirementInputs,
  currentSummary: SimulationSummary
): SavingsPulseResult {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;
  const workingYears = Math.max(1, inputs.retirementAge - inputs.currentAge);

  const primaryAnnualSavings = 
    inputs.rrspAnnualContribution + 
    inputs.tfsaAnnualContribution + 
    inputs.fhsaAnnualContribution + 
    inputs.nonRegAnnualContribution;

  const spouseAnnualSavings = isCouple && spouse
    ? (spouse.rrspAnnualContribution + spouse.tfsaAnnualContribution + spouse.fhsaAnnualContribution + spouse.nonRegAnnualContribution)
    : 0;

  const currentAnnualSavings = primaryAnnualSavings + spouseAnnualSavings;
  const currentMonthlySavings = Math.round(currentAnnualSavings / 12);

  const totalHouseholdIncome = inputs.currentAnnualIncome + (isCouple && spouse ? spouse.annualIncome : 0);
  const currentSavingsRate = totalHouseholdIncome > 0
    ? (currentAnnualSavings / totalHouseholdIncome) * 100
    : 0;

  const monthlyBreakdown = {
    rrsp: Math.round((inputs.rrspAnnualContribution + (isCouple && spouse ? spouse.rrspAnnualContribution : 0)) / 12),
    tfsa: Math.round((inputs.tfsaAnnualContribution + (isCouple && spouse ? spouse.tfsaAnnualContribution : 0)) / 12),
    fhsa: Math.round((inputs.fhsaAnnualContribution + (isCouple && spouse ? spouse.fhsaAnnualContribution : 0)) / 12),
    nonReg: Math.round((inputs.nonRegAnnualContribution + (isCouple && spouse ? spouse.nonRegAnnualContribution : 0)) / 12)
  };

  let requiredMonthlySavings = currentMonthlySavings;
  let targetNestEggNeeded = currentSummary.netWorthAtRetirement;

  if (currentSummary.isFullyFunded) {
    let low = 0.0;
    let high = 1.0;
    let minScale = 1.0;

    for (let iter = 0; iter < 12; iter++) {
      const mid = (low + high) / 2;
      const testInputs: RetirementInputs = {
        ...inputs,
        rrspAnnualContribution: inputs.rrspAnnualContribution * mid,
        tfsaAnnualContribution: inputs.tfsaAnnualContribution * mid,
        fhsaAnnualContribution: inputs.fhsaAnnualContribution * mid,
        nonRegAnnualContribution: inputs.nonRegAnnualContribution * mid,
        spouse: isCouple && spouse ? {
          ...spouse,
          rrspAnnualContribution: spouse.rrspAnnualContribution * mid,
          tfsaAnnualContribution: spouse.tfsaAnnualContribution * mid,
          fhsaAnnualContribution: spouse.fhsaAnnualContribution * mid,
          nonRegAnnualContribution: spouse.nonRegAnnualContribution * mid
        } : undefined
      };

      const testRes = fastSimulateEndNetWorth(testInputs);
      if (testRes.isFullyFunded && testRes.netWorthAtLifeExpectancy >= 0) {
        minScale = mid;
        high = mid;
        targetNestEggNeeded = testRes.netWorthAtRetirement;
      } else {
        low = mid;
      }
    }

    requiredMonthlySavings = Math.round((currentAnnualSavings * minScale) / 12);
  } else {
    let low = 0;
    let high = Math.max(180000, totalHouseholdIncome * 1.5);
    let bestDelta = high;

    for (let iter = 0; iter < 16; iter++) {
      const mid = (low + high) / 2;
      const addRrsp = Math.min(mid, Math.max(0, 32490 - inputs.rrspAnnualContribution));
      const addNonReg = mid - addRrsp;

      const testInputs: RetirementInputs = {
        ...inputs,
        rrspAnnualContribution: inputs.rrspAnnualContribution + addRrsp,
        nonRegAnnualContribution: inputs.nonRegAnnualContribution + addNonReg
      };

      const testRes = fastSimulateEndNetWorth(testInputs);
      if (testRes.isFullyFunded && testRes.netWorthAtLifeExpectancy >= 0) {
        bestDelta = mid;
        targetNestEggNeeded = testRes.netWorthAtRetirement;
        high = mid;
      } else {
        low = mid;
      }
    }

    requiredMonthlySavings = Math.round((currentAnnualSavings + bestDelta) / 12);
  }

  const monthlyGap = requiredMonthlySavings - currentMonthlySavings;
  const requiredSavingsRate = totalHouseholdIncome > 0
    ? ((requiredMonthlySavings * 12) / totalHouseholdIncome) * 100
    : 0;

  let status: 'surplus' | 'on_track' | 'underfunded' | 'critical' = 'on_track';
  if (monthlyGap < -50) {
    status = 'surplus';
  } else if (Math.abs(monthlyGap) <= 50) {
    status = 'on_track';
  } else if (monthlyGap > 0 && currentSummary.yearsFunded >= currentSummary.totalYearsInRetirement * 0.75) {
    status = 'underfunded';
  } else {
    status = 'critical';
  }

  const approxMarginalRate = totalHouseholdIncome > 140000 ? 0.43 : totalHouseholdIncome > 70000 ? 0.31 : 0.20;
  const rrspTaxSavingsMonthly = monthlyGap > 0 ? Math.round(monthlyGap * approxMarginalRate) : 0;

  let recommendedAction = '';
  if (status === 'surplus') {
    const surplusAmt = Math.abs(monthlyGap);
    recommendedAction = `Your ${isCouple ? 'household has' : 'you have'} a $${surplusAmt.toLocaleString()}/mo safety buffer! You could retire earlier, increase lifestyle spending, or build generational wealth.`;
  } else if (status === 'on_track') {
    recommendedAction = `Pacing reliably. Continue your scheduled contributions across ${isCouple ? 'both partners’ ' : ''}registered and non-registered accounts.`;
  } else {
    recommendedAction = `Bridge the $${monthlyGap.toLocaleString()}/mo gap by maximizing ${isCouple ? 'both TFSA and RRSP rooms' : 'RRSP and TFSA contributions'}.`;
  }

  return {
    currentMonthlySavings,
    requiredMonthlySavings,
    monthlyGap,
    status,
    currentSavingsRate: Math.round(currentSavingsRate * 10) / 10,
    requiredSavingsRate: Math.round(requiredSavingsRate * 10) / 10,
    projectedNestEggAtRetire: currentSummary.netWorthAtRetirement,
    targetNestEggNeeded: Math.round(targetNestEggNeeded),
    recommendedAction,
    rrspTaxSavingsMonthly,
    workingYearsRemaining: workingYears,
    monthlyBreakdown
  };
}
