import { RetirementInputs, PropertyType, AdditionalPropertyTiming, AdditionalPropertyRole } from '../../types/retirement';
import {
  calculateRealtorMonthlyProjection,
  calculateEstimatedCashNeededToBuy,
  calculateCanadianLandTransferTax,
  calculatePropertyTax
} from '../canadianRealEstate';
import { getActiveAdditionalProperties } from '../mortgage';

export interface AdditionalPropertyParams {
  id: string;
  name: string;
  timing: AdditionalPropertyTiming;
  role: AdditionalPropertyRole;
  isPaidOff: boolean;
  purchaseAge: number;
  costOfHome: number;
  currentMarketVal: number;
  downPayment: number;
  downPaymentRatio: number;
  mortgageRate: number;
  mortgageTermYears: number;
  mortgageStartYear: number;
  ownershipShare: number;
  appreciationRate: number;
  monthlyRate: number;
  totalMortgageMonths: number;
  initialMortgagePrincipal: number;
  monthlyMortgagePmt: number;
  nominalPurchasePrice: number;
  targetFutureDownPayment: number;
  oneTimeLandTransferTax: number;
  legalAndClosingFees: number;
  otherClosingCosts: number;
  taxOnMortgageInsurance: number;
  totalClosingCosts: number;
  monthlyPropertyTax: number;
  monthlyCondoFee: number;
  monthlyRentalIncome: number;
  planToSell: boolean;
  sellAge: number;
  sellingCostRate: number;
  fundWithTfsa: boolean;
  fundWithNonReg: boolean;
  calcMonthlyPmtForLoan: (loan: number) => number;
}

export interface AdditionalPropertyYearState {
  id: string;
  purchased: boolean;
  sold: boolean;
  soldAge: number | null;
  netProceedsAtSale: number;
  futureActualLoanPrincipal: number;
  futureActualMonthlyPmt: number;
  totalDownPaymentFunded: number;
}

export interface MortgageAndHousingParams {
  ownsHome: boolean;
  isPaidOff: boolean;
  purchaseType: 'current' | 'future' | 'rent';
  isFuturePurchase: boolean;
  futurePurchaseAge: number;
  futurePurchaseYear: number;
  fundWithFhsa: boolean;
  fundWithHbp: boolean;
  fundWithTfsa: boolean;
  fundWithNonReg: boolean;
  homeCost: number;
  currentHomeMarketVal: number;
  downPayment: number;
  downPaymentRatio: number;
  mortgageRate: number;
  mortgageTermYears: number;
  mortgageStartYear: number;
  ownershipShare: number;
  appreciationRate: number;
  planToSell: boolean;
  sellAge: number;
  sellingCostRate: number;
  initialMortgagePrincipal: number;
  monthlyMortgagePmt: number;
  totalMortgageMonths: number;
  monthlyRate: number;
  nominalPurchasePrice: number;
  targetFutureDownPayment: number;
  calcMonthlyPmtForLoan: (loan: number) => number;
  currentRentMonthly: number;
  utilitiesMonthly: number;
  discretionaryMonthly: number;
  nonHousingMonthly: number;
  initialAnnualExpenses: number;

  // Realtor.ca Ownership & Closing Cost Fields
  propertyType: PropertyType;
  isFirstTimeHomeBuyer: boolean;
  cityOrMunicipality: string;
  oneTimeLandTransferTax: number;
  monthlyPropertyTax: number;
  monthlyCondoFee: number;
  otherOwnershipCostsMonthly: number; // property tax + condo fees

  // Realtor.ca Estimated Cash Needed to Buy Closing Costs
  legalAndClosingFees: number;
  homeInspectionCost: number;
  otherClosingCosts: number;
  taxOnMortgageInsurance: number;
  totalClosingCosts: number;
  totalCashNeededToBuy: number;

  // Additional Properties (Current + Future)
  additionalProperties: AdditionalPropertyParams[];
}

export interface HousingYearState {
  homeSold: boolean;
  homeSoldAge: number | null;
  homeNetProceedsAtSale: number;
  futurePurchaseExecuted: boolean;
  futureActualLoanPrincipal: number;
  futureActualMonthlyPmt: number;
  totalDownPaymentFunded: number;
  pFhsaActive: boolean;
  sFhsaActive: boolean;
  additionalStates: AdditionalPropertyYearState[];
}

export interface HousingYearBalances {
  pRrsp: number;
  sRrsp: number;
  pTfsa: number;
  sTfsa: number;
  pFhsa: number;
  sFhsa: number;
  pNonReg: number;
  sNonReg: number;
  customAccountsState: Array<{
    id: string;
    name: string;
    category: string;
    balance: number;
    annualContribution: number;
    expectedReturn: number;
    gicCloseYear?: number;
    matured: boolean;
    currentContribution: number;
  }>;
}

export interface HousingYearResult {
  yearHomeValue: number;
  remainingMortgage: number;
  yearHomeEquity: number;
  userRealEstateShare: number;
  homeSoldThisYear: boolean;
  homeSaleProceeds: number;
  isHomePurchasedThisYear: boolean;
  downPaymentPaidThisYear: number;
  totalClosingCostsPaidThisYear: number;
  totalCashNeededToBuyPaidThisYear: number;
  legalFeesPaidThisYear: number;
  inspectionPaidThisYear: number;
  otherClosingPaidThisYear: number;
  taxOnMortgageInsurancePaidThisYear: number;
  yearFhsaWithdrawalOrTransfer: number;
  housingStatus: 'renting' | 'mortgage' | 'mortgage_free';
  landTransferTaxPaidThisYear: number;
  propertyTaxPaidThisYear: number;
  condoFeesPaidThisYear: number;
  rentPaidThisYear: number;
  mortgagePaidThisYear: number;
  yearHousingCost: number;
  activePropertyCount: number;
  rentalIncomeThisYear: number;
  notes: string[];
}

/**
 * Initializes static mortgage and real estate parameters before the multi-year simulation loop
 */
export function initializeMortgageAndHousingParams(
  inputs: RetirementInputs,
  isCouple: boolean
): MortgageAndHousingParams {
  const re = inputs.realEstate;
  let ownsHome = Boolean(re && re.ownsHome);
  let purchaseType: 'current' | 'future' | 'rent' = (re?.purchaseType as ('current' | 'future' | undefined)) ?? (ownsHome ? 'current' : 'rent');

  if (inputs.housingStatus === 'rent') {
    if (inputs.planFutureHomePurchase) {
      ownsHome = true;
      purchaseType = 'future';
    } else {
      ownsHome = false;
      purchaseType = 'rent';
    }
  } else if (inputs.housingStatus === 'own') {
    ownsHome = true;
    purchaseType = 'current';
  }

  const isFuturePurchase = Boolean(ownsHome && purchaseType === 'future');
  const isPaidOff = Boolean(ownsHome && !isFuturePurchase && re?.isPaidOff);
  const futurePurchaseAge = Math.max(inputs.currentAge + 1, re?.futurePurchaseAge ?? (inputs.currentAge + 5));
  const yearsToPurchase = Math.max(1, futurePurchaseAge - inputs.currentAge);
  const futurePurchaseYear = 2026 + yearsToPurchase;
  const isBlankHomeFallback = ownsHome && (re?.costOfHome ?? 0) <= 0;
  const fundWithFhsa = isBlankHomeFallback ? true : re?.fundWithFhsa !== false;
  const fundWithHbp = isBlankHomeFallback ? true : (re?.fundWithHbp !== false && re?.useHbp !== false);
  const fundWithTfsa = isBlankHomeFallback ? true : re?.fundWithTfsa !== false;
  const fundWithNonReg = isBlankHomeFallback ? true : re?.fundWithNonReg !== false;

  const homeCost = (ownsHome && (re?.costOfHome ?? 0) > 0) ? re!.costOfHome : (ownsHome ? 650000 : (re?.costOfHome ?? 650000));
  const currentHomeMarketVal = (ownsHome && (re?.currentMarketValue ?? 0) > 0) ? re!.currentMarketValue : homeCost;
  const downPayment = isBlankHomeFallback ? 130000 : (re?.downPayment ?? 130000);
  const downPaymentRatio = homeCost > 0 ? Math.min(1.0, Math.max(0.05, downPayment / homeCost)) : 0.20;
  const mortgageRate = (re?.mortgageInterestRate ?? 4.79) / 100;
  const mortgageTermYears = re?.mortgageTermYears ?? 25;
  const mortgageStartYear = re?.mortgageStartYear ?? 2021;
  const ownershipShare = (re?.ownershipSharePercent ?? (isCouple ? 50 : 100)) / 100;
  const appreciationRate = (re?.annualAppreciationRate ?? 3.2) / 100;
  const planToSell = Boolean(re?.planToSellHome);
  const sellAge = re?.sellHomeAge ?? 72;
  const sellingCostRate = (re?.sellingCostPercent ?? 4.5) / 100;

  // Canadian Mortgage Amortization math (semi-annual compounding converted to monthly)
  const initialMortgagePrincipal = isPaidOff ? 0 : Math.max(0, homeCost - downPayment);
  const semiAnnualRate = mortgageRate / 2;
  const monthlyRate = mortgageRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
  const totalMortgageMonths = mortgageTermYears * 12;
  const monthlyMortgagePmt = (initialMortgagePrincipal > 0 && totalMortgageMonths > 0)
    ? (monthlyRate > 0
        ? (initialMortgagePrincipal * monthlyRate * Math.pow(1 + monthlyRate, totalMortgageMonths)) / (Math.pow(1 + monthlyRate, totalMortgageMonths) - 1)
        : initialMortgagePrincipal / totalMortgageMonths)
    : 0;

  // Future purchase projections
  const nominalPurchasePrice = Math.round(homeCost * Math.pow(1 + appreciationRate, yearsToPurchase));
  const targetFutureDownPayment = Math.round(nominalPurchasePrice * downPaymentRatio);

  const calcMonthlyPmtForLoan = (loan: number) => {
    if (loan <= 0 || totalMortgageMonths <= 0) return 0;
    return monthlyRate > 0
      ? (loan * monthlyRate * Math.pow(1 + monthlyRate, totalMortgageMonths)) / (Math.pow(1 + monthlyRate, totalMortgageMonths) - 1)
      : loan / totalMortgageMonths;
  };

  const me = inputs.monthlyExpenses;
  const currentRentMonthly = (re?.rentOverridden && re?.currentRent !== undefined)
    ? re.currentRent
    : (me?.rentOrMortgage && me.rentOrMortgage > 0 ? me.rentOrMortgage : (re?.currentRent ?? (me?.rentOrMortgage ?? 2200)));
  const utilitiesMonthly = me?.utilities || 0;
  const discretionaryMonthly = (me?.creditCard || 0) + (me?.otherExpenses || 0);
  const nonHousingMonthly = utilitiesMonthly + discretionaryMonthly;

  // Realtor.ca Ownership & Closing Cost Projection
  const realtorProjection = calculateRealtorMonthlyProjection(re, inputs.province, isFuturePurchase);
  const propertyType = realtorProjection.propertyType;
  const isFirstTimeHomeBuyer = realtorProjection.isFirstTimeHomeBuyer;
  const cityOrMunicipality = re?.cityOrMunicipality ?? (inputs.province === 'ON' ? 'other_ontario' : 'other');
  const oneTimeLandTransferTax = realtorProjection.oneTimeLandTransferTax;
  const monthlyPropertyTax = realtorProjection.propertyTaxMonthly;
  const monthlyCondoFee = realtorProjection.condoFeeMonthly;
  const otherOwnershipCostsMonthly = realtorProjection.otherOwnershipCostsMonthly;

  // Closing Costs breakdown for future purchase (or baseline)
  const cashNeededCalc = calculateEstimatedCashNeededToBuy(
    re,
    inputs.province,
    isFuturePurchase,
    nominalPurchasePrice,
    targetFutureDownPayment
  );
  const legalAndClosingFees = cashNeededCalc.legalAndClosingFees;
  const homeInspectionCost = cashNeededCalc.homeInspectionCost;
  const otherClosingCosts = cashNeededCalc.otherClosingCosts;
  const taxOnMortgageInsurance = cashNeededCalc.taxOnMortgageInsurance;
  const totalClosingCosts = cashNeededCalc.totalClosingCosts;
  const totalCashNeededToBuy = cashNeededCalc.totalCashNeededToBuy;

  // Initialize active Additional Real Estate Properties (current & future)
  const activeAdditional = getActiveAdditionalProperties(inputs);
  const additionalProperties: AdditionalPropertyParams[] = activeAdditional.map((prop) => {
    const pTiming = prop.timing || 'current';
    const pPaidOff = Boolean(prop.isPaidOff);
    const pPurchaseAge = Math.max(inputs.currentAge + 1, prop.purchaseAge ?? inputs.currentAge + 6);
    const pYearsToBuy = Math.max(1, pPurchaseAge - inputs.currentAge);
    const pCost = Math.max(0, prop.costOfHome || 500000);
    const pMarketVal = Math.max(0, prop.currentMarketValue || pCost);
    const pDown = pPaidOff ? pCost : Math.max(0, prop.downPayment ?? Math.round(pCost * 0.2));
    const pDownRatio = pPaidOff ? 1.0 : (pCost > 0 ? Math.min(1.0, Math.max(0.05, pDown / pCost)) : 0.2);
    const pMortRate = (prop.mortgageInterestRate ?? 4.79) / 100;
    const pTermYrs = prop.mortgageTermYears ?? 25;
    const pStartYr = prop.mortgageStartYear ?? 2021;
    const pShare = (prop.ownershipSharePercent ?? (isCouple ? 50 : 100)) / 100;
    const pAppRate = (prop.annualAppreciationRate ?? 3.2) / 100;
    const pSemiAnnual = pMortRate / 2;
    const pMonthlyRate = pMortRate > 0 ? Math.pow(1 + pSemiAnnual, 2 / 12) - 1 : 0;
    const pTotalMonths = pTermYrs * 12;

    const pInitialLoan = pTiming === 'current' && !pPaidOff ? Math.max(0, pCost - pDown) : 0;
    const pCalcPmt = (loan: number) => {
      if (loan <= 0 || pTotalMonths <= 0) return 0;
      return pMonthlyRate > 0
        ? (loan * pMonthlyRate * Math.pow(1 + pMonthlyRate, pTotalMonths)) /
            (Math.pow(1 + pMonthlyRate, pTotalMonths) - 1)
        : loan / pTotalMonths;
    };
    const pMonthlyPmt = pCalcPmt(pInitialLoan);

    const pNominalPrice =
      pTiming === 'future'
        ? Math.round(pCost * Math.pow(1 + pAppRate, pYearsToBuy))
        : pMarketVal;
    const pTargetDown = pTiming === 'future' ? Math.round(pNominalPrice * pDownRatio) : pDown;

    // Closing costs for future additional property (FTHB rebates do NOT apply to additional properties)
    const pLtt =
      pTiming === 'future'
        ? calculateCanadianLandTransferTax(pNominalPrice, inputs.province, false, cityOrMunicipality).netLandTransferTax
        : 0;
    const pLegal = pTiming === 'future' ? 2100 : 0;
    const pOtherClosing = pTiming === 'future' ? 1500 : 0;
    let pTaxMortIns = 0;
    if (pTiming === 'future' && !pPaidOff && pDownRatio < 0.2) {
      const loanEst = Math.max(0, pNominalPrice - pTargetDown);
      const pct = pDownRatio * 100;
      const premRate = pct >= 15 ? 0.028 : pct >= 10 ? 0.031 : 0.04;
      const taxRate = inputs.province === 'ON' ? 0.08 : inputs.province === 'QC' ? 0.09 : inputs.province === 'SK' ? 0.06 : 0;
      pTaxMortIns = Math.round(loanEst * premRate * taxRate);
    }
    const pTotalClosing = pLtt + pLegal + pOtherClosing + pTaxMortIns;

    const propTaxCalc = calculatePropertyTax(
      pTiming === 'future' ? pCost : pMarketVal,
      prop.annualPropertyTaxRatePercent ?? 0.522,
      prop.monthlyPropertyTaxOverride
    );
    const pMonthlyCondo = (prop.propertyType ?? 'freehold') === 'condo' ? (prop.monthlyCondoFee ?? 385) : 0;

    return {
      id: prop.id,
      name: prop.name || 'Additional Property',
      timing: pTiming,
      role: prop.role || 'secondary_home',
      isPaidOff: pPaidOff,
      purchaseAge: pPurchaseAge,
      costOfHome: pCost,
      currentMarketVal: pMarketVal,
      downPayment: pDown,
      downPaymentRatio: pDownRatio,
      mortgageRate: pMortRate,
      mortgageTermYears: pTermYrs,
      mortgageStartYear: pStartYr,
      ownershipShare: pShare,
      appreciationRate: pAppRate,
      monthlyRate: pMonthlyRate,
      totalMortgageMonths: pTotalMonths,
      initialMortgagePrincipal: pInitialLoan,
      monthlyMortgagePmt: pMonthlyPmt,
      nominalPurchasePrice: pNominalPrice,
      targetFutureDownPayment: pTargetDown,
      oneTimeLandTransferTax: pLtt,
      legalAndClosingFees: pLegal,
      otherClosingCosts: pOtherClosing,
      taxOnMortgageInsurance: pTaxMortIns,
      totalClosingCosts: pTotalClosing,
      monthlyPropertyTax: propTaxCalc.monthlyPropertyTax,
      monthlyCondoFee: pMonthlyCondo,
      monthlyRentalIncome: Math.max(0, prop.monthlyRentalIncome || 0),
      planToSell: Boolean(prop.planToSellHome),
      sellAge: prop.sellHomeAge ?? 75,
      sellingCostRate: (prop.sellingCostPercent ?? 4.5) / 100,
      fundWithTfsa: prop.fundWithTfsa !== false,
      fundWithNonReg: prop.fundWithNonReg !== false,
      calcMonthlyPmtForLoan: pCalcPmt
    };
  });

  const additionalCurrentHousingMonthly = additionalProperties
    .filter((p) => p.timing === 'current')
    .reduce((sum, p) => sum + p.monthlyMortgagePmt + p.monthlyPropertyTax + p.monthlyCondoFee, 0);

  // Effective baseline monthly housing expense (rent for renters, mortgage + property tax + condo fee for current owners)
  const effectiveMonthlyHousing =
    ((ownsHome && !isFuturePurchase)
      ? monthlyMortgagePmt + otherOwnershipCostsMonthly
      : currentRentMonthly) + additionalCurrentHousingMonthly;

  const initialMonthlyExpenses = me
    ? (me.rentOrMortgage !== undefined && !me.autoSyncMortgage ? me.rentOrMortgage : effectiveMonthlyHousing) + nonHousingMonthly
    : effectiveMonthlyHousing + nonHousingMonthly;
  const initialAnnualExpenses = initialMonthlyExpenses * 12;

  return {
    ownsHome,
    isPaidOff,
    purchaseType,
    isFuturePurchase,
    futurePurchaseAge,
    futurePurchaseYear,
    fundWithFhsa,
    fundWithHbp,
    fundWithTfsa,
    fundWithNonReg,
    homeCost,
    currentHomeMarketVal,
    downPayment,
    downPaymentRatio,
    mortgageRate,
    mortgageTermYears,
    mortgageStartYear,
    ownershipShare,
    appreciationRate,
    planToSell,
    sellAge,
    sellingCostRate,
    initialMortgagePrincipal,
    monthlyMortgagePmt,
    totalMortgageMonths,
    monthlyRate,
    nominalPurchasePrice,
    targetFutureDownPayment,
    calcMonthlyPmtForLoan,
    currentRentMonthly,
    utilitiesMonthly,
    discretionaryMonthly,
    nonHousingMonthly,
    initialAnnualExpenses,
    propertyType,
    isFirstTimeHomeBuyer,
    cityOrMunicipality,
    oneTimeLandTransferTax,
    monthlyPropertyTax,
    monthlyCondoFee,
    otherOwnershipCostsMonthly,
    legalAndClosingFees,
    homeInspectionCost,
    otherClosingCosts,
    taxOnMortgageInsurance,
    totalClosingCosts,
    totalCashNeededToBuy,
    additionalProperties
  };
}

/**
 * Helper to create initial multi-property HousingYearState for simulator and fastSimulator
 */
export function createInitialHousingState(
  params: MortgageAndHousingParams,
  pFhsaActive: boolean,
  sFhsaActive: boolean
): HousingYearState {
  return {
    homeSold: false,
    homeSoldAge: null,
    homeNetProceedsAtSale: 0,
    futurePurchaseExecuted: false,
    futureActualLoanPrincipal: params.targetFutureDownPayment > 0
      ? Math.max(0, params.nominalPurchasePrice - params.targetFutureDownPayment)
      : 0,
    futureActualMonthlyPmt: params.calcMonthlyPmtForLoan(
      Math.max(0, params.nominalPurchasePrice - params.targetFutureDownPayment)
    ),
    totalDownPaymentFunded: 0,
    pFhsaActive,
    sFhsaActive,
    additionalStates: params.additionalProperties.map((p) => ({
      id: p.id,
      purchased: p.timing === 'current',
      sold: false,
      soldAge: null,
      netProceedsAtSale: 0,
      futureActualLoanPrincipal:
        p.timing === 'future' && !p.isPaidOff
          ? Math.max(0, p.nominalPurchasePrice - p.targetFutureDownPayment)
          : 0,
      futureActualMonthlyPmt:
        p.timing === 'future' && !p.isPaidOff
          ? p.calcMonthlyPmtForLoan(Math.max(0, p.nominalPurchasePrice - p.targetFutureDownPayment))
          : 0,
      totalDownPaymentFunded: 0
    }))
  };
}

/**
 * Calculates mortgage amortization, home appreciation, down payment funding, and dispositions for a single simulation year
 */
export function calculateMortgageAndHousingForYear(
  age: number,
  spouseAge: number | undefined,
  yearIndex: number,
  params: MortgageAndHousingParams,
  state: HousingYearState,
  balances: HousingYearBalances,
  isCouple: boolean
): HousingYearResult {
  const notes: string[] = [];
  let yearHomeValue = 0;
  let remainingMortgage = 0;
  let yearHomeEquity = 0;
  let userRealEstateShare = 0;
  let homeSoldThisYear = false;
  let homeSaleProceeds = 0;
  let isHomePurchasedThisYear = false;
  let downPaymentPaidThisYear = 0;
  let totalClosingCostsPaidThisYear = 0;
  let totalCashNeededToBuyPaidThisYear = 0;
  let legalFeesPaidThisYear = 0;
  let inspectionPaidThisYear = 0;
  let otherClosingPaidThisYear = 0;
  let taxOnMortgageInsurancePaidThisYear = 0;
  let yearFhsaWithdrawalOrTransfer = 0;
  let housingStatus: 'renting' | 'mortgage' | 'mortgage_free' = params.ownsHome ? 'mortgage' : 'renting';
  let landTransferTaxPaidThisYear = 0;
  let propertyTaxPaidThisYear = 0;
  let condoFeesPaidThisYear = 0;
  let rentPaidThisYear = 0;
  let mortgagePaidThisYear = 0;
  let yearHousingCost = 0;
  let activePropertyCount = 0;
  let rentalIncomeThisYear = 0;

  if (!params.ownsHome) {
    housingStatus = 'renting';
    rentPaidThisYear = params.currentRentMonthly * 12;
    yearHousingCost = rentPaidThisYear;
  } else if (!params.isFuturePurchase) {
    // CURRENT HOMEOWNER (Purchased in past)
    if (!state.homeSold) {
      activePropertyCount += 1;
      const currentSimYear = 2026 + yearIndex;
      const elapsedMonths = Math.max(0, (currentSimYear - params.mortgageStartYear) * 12);
      if (params.isPaidOff || params.initialMortgagePrincipal <= 0 || elapsedMonths >= params.totalMortgageMonths) {
        remainingMortgage = 0;
        housingStatus = 'mortgage_free';
        mortgagePaidThisYear = 0;
        yearHousingCost = params.otherOwnershipCostsMonthly * 12;
      } else {
        remainingMortgage = Math.max(
          0,
          params.initialMortgagePrincipal * Math.pow(1 + params.monthlyRate, elapsedMonths) -
            params.monthlyMortgagePmt * ((Math.pow(1 + params.monthlyRate, elapsedMonths) - 1) / (params.monthlyRate || 1))
        );
        housingStatus = 'mortgage';
        mortgagePaidThisYear = params.monthlyMortgagePmt * 12;
        yearHousingCost = mortgagePaidThisYear + params.otherOwnershipCostsMonthly * 12;
      }

      propertyTaxPaidThisYear = params.monthlyPropertyTax * 12;
      condoFeesPaidThisYear = params.monthlyCondoFee * 12;

      yearHomeValue = params.currentHomeMarketVal * Math.pow(1 + params.appreciationRate, yearIndex);
      yearHomeEquity = Math.max(0, yearHomeValue - remainingMortgage);
      userRealEstateShare = yearHomeEquity * params.ownershipShare;

      // Disposition / Sale
      if (params.planToSell && age === params.sellAge) {
        homeSoldThisYear = true;
        state.homeSold = true;
        state.homeSoldAge = age;
        activePropertyCount = Math.max(0, activePropertyCount - 1);

        const grossSalePrice = yearHomeValue;
        const netAfterClosing = grossSalePrice * (1 - params.sellingCostRate);
        const equityProceeds = Math.max(0, netAfterClosing - remainingMortgage);
        homeSaleProceeds = equityProceeds * params.ownershipShare;
        state.homeNetProceedsAtSale = homeSaleProceeds;

        balances.pNonReg += homeSaleProceeds;
        if (balances.customAccountsState.length > 0) {
          const targetAcc =
            balances.customAccountsState.find((a) => a.category === 'investment') ||
            balances.customAccountsState.find((a) => a.category === 'savings') ||
            balances.customAccountsState[0];
          if (targetAcc) {
            targetAcc.balance += homeSaleProceeds;
          }
        }

        yearHomeValue = 0;
        remainingMortgage = 0;
        yearHomeEquity = 0;
        userRealEstateShare = 0;

        notes.push(
          `🏡 Age ${age}: Primary home sold for $${Math.round(grossSalePrice).toLocaleString()}! Net equity proceeds of $${Math.round(
            homeSaleProceeds
          ).toLocaleString()} deposited into Taxable Non-Reg Account (100% Tax-Free under CRA Principal Residence Exemption).`
        );
      }
    } else {
      housingStatus = 'renting';
      rentPaidThisYear = params.currentRentMonthly * 12;
      mortgagePaidThisYear = 0;
      yearHousingCost = rentPaidThisYear;
    }
  } else {
    // FUTURE HOME PURCHASE (Primary #1)
    if (age < params.futurePurchaseAge) {
      housingStatus = 'renting';
      rentPaidThisYear = params.currentRentMonthly * 12;
      mortgagePaidThisYear = 0;
      yearHousingCost = rentPaidThisYear;
      if (yearIndex === 0) {
        notes.push(
          `🏢 Currently Renting: Paying $${Math.round(params.currentRentMonthly).toLocaleString()}/month while saving toward planned home purchase at Age ${params.futurePurchaseAge} (Year ${params.futurePurchaseYear}).`
        );
      }
    } else if (age === params.futurePurchaseAge && !state.futurePurchaseExecuted) {
      state.futurePurchaseExecuted = true;
      isHomePurchasedThisYear = true;
      housingStatus = 'mortgage';
      activePropertyCount += 1;

      const downPaymentTarget = params.targetFutureDownPayment;
      const closingCostsNeeded = params.totalClosingCosts;
      let totalCashNeeded = downPaymentTarget + closingCostsNeeded;
      let totalCashDrawn = 0;

      // 1. Primary FHSA
      if (params.fundWithFhsa && balances.pFhsa > 0 && totalCashNeeded > 0) {
        const used = Math.min(balances.pFhsa, totalCashNeeded);
        balances.pFhsa -= used;
        totalCashNeeded -= used;
        totalCashDrawn += used;
        state.pFhsaActive = false;
        yearFhsaWithdrawalOrTransfer += used;
        notes.push(`🏠 Age ${age}: First Home Savings Account (FHSA) fully deployed tax-free ($${Math.round(used).toLocaleString()}) for home down payment and closing costs.`);
      }

      // 2. Spouse FHSA
      if (params.fundWithFhsa && isCouple && balances.sFhsa > 0 && totalCashNeeded > 0) {
        const used = Math.min(balances.sFhsa, totalCashNeeded);
        balances.sFhsa -= used;
        totalCashNeeded -= used;
        totalCashDrawn += used;
        state.sFhsaActive = false;
        yearFhsaWithdrawalOrTransfer += used;
        notes.push(`🏠 Spouse Age ${spouseAge}: Spouse FHSA deployed tax-free ($${Math.round(used).toLocaleString()}) for qualifying home purchase & closing.`);
      }

      // 3. RRSP HBP
      if (params.fundWithHbp && balances.pRrsp > 0 && totalCashNeeded > 0) {
        const hbp = Math.min(60000, balances.pRrsp, totalCashNeeded);
        balances.pRrsp -= hbp;
        totalCashNeeded -= hbp;
        totalCashDrawn += hbp;
        notes.push(`🍁 Age ${age}: CRA Home Buyers' Plan (HBP) tax-free RRSP withdrawal of $${Math.round(hbp).toLocaleString()} applied to purchase.`);
      }
      if (params.fundWithHbp && isCouple && balances.sRrsp > 0 && totalCashNeeded > 0) {
        const hbp = Math.min(60000, balances.sRrsp, totalCashNeeded);
        balances.sRrsp -= hbp;
        totalCashNeeded -= hbp;
        totalCashDrawn += hbp;
        notes.push(`🍁 Spouse Age ${spouseAge}: Spouse CRA Home Buyers' Plan (HBP) withdrawal of $${Math.round(hbp).toLocaleString()} applied to purchase.`);
      }

      // 4. Non-Registered taxable savings
      if (params.fundWithNonReg && balances.pNonReg > 0 && totalCashNeeded > 0) {
        const used = Math.min(balances.pNonReg, totalCashNeeded);
        balances.pNonReg -= used;
        totalCashNeeded -= used;
        totalCashDrawn += used;
        if (balances.customAccountsState.length > 0) {
          let rem = used;
          for (const acc of balances.customAccountsState) {
            const deduct = Math.min(acc.balance, rem);
            acc.balance -= deduct;
            rem -= deduct;
            if (rem <= 0) break;
          }
        }
        notes.push(`💵 Age ${age}: Deployed $${Math.round(used).toLocaleString()} from Non-Registered taxable savings for home purchase.`);
      }
      if (params.fundWithNonReg && isCouple && balances.sNonReg > 0 && totalCashNeeded > 0) {
        const used = Math.min(balances.sNonReg, totalCashNeeded);
        balances.sNonReg -= used;
        totalCashNeeded -= used;
        totalCashDrawn += used;
      }

      // 5. TFSA
      if (params.fundWithTfsa && balances.pTfsa > 0 && totalCashNeeded > 0) {
        const used = Math.min(balances.pTfsa, totalCashNeeded);
        balances.pTfsa -= used;
        totalCashNeeded -= used;
        totalCashDrawn += used;
        notes.push(`🛡️ Age ${age}: Deployed $${Math.round(used).toLocaleString()} from TFSA tax-free for home purchase.`);
      }
      if (params.fundWithTfsa && isCouple && balances.sTfsa > 0 && totalCashNeeded > 0) {
        const used = Math.min(balances.sTfsa, totalCashNeeded);
        balances.sTfsa -= used;
        totalCashNeeded -= used;
        totalCashDrawn += used;
      }

      const closingFunded = Math.min(closingCostsNeeded, totalCashDrawn);
      const downPaymentFunded = Math.max(0, totalCashDrawn - closingFunded);
      state.totalDownPaymentFunded = downPaymentFunded;
      downPaymentPaidThisYear = downPaymentFunded;
      totalClosingCostsPaidThisYear = closingFunded;
      totalCashNeededToBuyPaidThisYear = totalCashDrawn;
      landTransferTaxPaidThisYear = Math.min(params.oneTimeLandTransferTax, closingFunded);
      legalFeesPaidThisYear = params.legalAndClosingFees;
      inspectionPaidThisYear = params.homeInspectionCost;
      otherClosingPaidThisYear = params.otherClosingCosts;
      taxOnMortgageInsurancePaidThisYear = params.taxOnMortgageInsurance;

      state.futureActualLoanPrincipal = Math.max(0, params.nominalPurchasePrice - downPaymentFunded);
      state.futureActualMonthlyPmt = params.calcMonthlyPmtForLoan(state.futureActualLoanPrincipal);

      remainingMortgage = state.futureActualLoanPrincipal;
      yearHomeValue = params.nominalPurchasePrice;
      yearHomeEquity = Math.max(0, yearHomeValue - remainingMortgage);
      userRealEstateShare = yearHomeEquity * params.ownershipShare;

      propertyTaxPaidThisYear = params.monthlyPropertyTax * 12;
      condoFeesPaidThisYear = params.monthlyCondoFee * 12;
      rentPaidThisYear = 0;
      mortgagePaidThisYear = state.futureActualMonthlyPmt * 12;
      if (state.futureActualLoanPrincipal <= 0) {
        housingStatus = 'mortgage_free';
      }
      yearHousingCost = mortgagePaidThisYear + params.otherOwnershipCostsMonthly * 12;

      notes.push(
        `🏡 Age ${age}: Purchased primary residence for $${Math.round(params.nominalPurchasePrice).toLocaleString()}! Deployed $${Math.round(totalCashDrawn).toLocaleString()} total cash at closing ($${Math.round(downPaymentFunded).toLocaleString()} down payment + $${Math.round(closingFunded).toLocaleString()} closing costs: $${Math.round(landTransferTaxPaidThisYear).toLocaleString()} Land Transfer Tax, $${Math.round(params.legalAndClosingFees).toLocaleString()} legal fees, $${Math.round(params.otherClosingCosts).toLocaleString()} other closing${params.taxOnMortgageInsurance > 0 ? `, $${Math.round(params.taxOnMortgageInsurance).toLocaleString()} tax on mortgage insurance` : ''}${params.homeInspectionCost > 0 ? `, $${Math.round(params.homeInspectionCost).toLocaleString()} inspection` : ''}). Originated ${params.mortgageTermYears}-yr mortgage of $${Math.round(state.futureActualLoanPrincipal).toLocaleString()} ($${Math.round(state.futureActualMonthlyPmt).toLocaleString()}/month). Ongoing: $${params.monthlyPropertyTax}/mo property taxes${params.monthlyCondoFee > 0 ? ` + $${params.monthlyCondoFee}/mo condo fees` : ''}.`
      );
    } else if (state.futurePurchaseExecuted && !state.homeSold) {
      // Post-purchase years
      activePropertyCount += 1;
      const elapsedMonths = Math.max(0, (age - params.futurePurchaseAge) * 12);
      if (state.futureActualLoanPrincipal <= 0 || elapsedMonths >= params.totalMortgageMonths) {
        remainingMortgage = 0;
        housingStatus = 'mortgage_free';
        rentPaidThisYear = 0;
        mortgagePaidThisYear = 0;
        yearHousingCost = params.otherOwnershipCostsMonthly * 12;
      } else {
        remainingMortgage = Math.max(
          0,
          state.futureActualLoanPrincipal * Math.pow(1 + params.monthlyRate, elapsedMonths) -
            state.futureActualMonthlyPmt * ((Math.pow(1 + params.monthlyRate, elapsedMonths) - 1) / (params.monthlyRate || 1))
        );
        housingStatus = 'mortgage';
        rentPaidThisYear = 0;
        mortgagePaidThisYear = state.futureActualMonthlyPmt * 12;
        yearHousingCost = mortgagePaidThisYear + params.otherOwnershipCostsMonthly * 12;
      }

      propertyTaxPaidThisYear = params.monthlyPropertyTax * 12;
      condoFeesPaidThisYear = params.monthlyCondoFee * 12;

      yearHomeValue = params.nominalPurchasePrice * Math.pow(1 + params.appreciationRate, age - params.futurePurchaseAge);
      yearHomeEquity = Math.max(0, yearHomeValue - remainingMortgage);
      userRealEstateShare = yearHomeEquity * params.ownershipShare;

      // Sale / downsizing
      if (params.planToSell && age === params.sellAge) {
        homeSoldThisYear = true;
        state.homeSold = true;
        state.homeSoldAge = age;
        activePropertyCount = Math.max(0, activePropertyCount - 1);

        const grossSalePrice = yearHomeValue;
        const netAfterClosing = grossSalePrice * (1 - params.sellingCostRate);
        const equityProceeds = Math.max(0, netAfterClosing - remainingMortgage);
        homeSaleProceeds = equityProceeds * params.ownershipShare;
        state.homeNetProceedsAtSale = homeSaleProceeds;

        balances.pNonReg += homeSaleProceeds;
        if (balances.customAccountsState.length > 0) {
          const targetAcc =
            balances.customAccountsState.find((a) => a.category === 'investment') ||
            balances.customAccountsState.find((a) => a.category === 'savings') ||
            balances.customAccountsState[0];
          if (targetAcc) {
            targetAcc.balance += homeSaleProceeds;
          }
        }

        yearHomeValue = 0;
        remainingMortgage = 0;
        yearHomeEquity = 0;
        userRealEstateShare = 0;

        notes.push(
          `🏡 Age ${age}: Primary home sold for $${Math.round(grossSalePrice).toLocaleString()}! Net equity proceeds of $${Math.round(
            homeSaleProceeds
          ).toLocaleString()} deposited into Taxable Non-Reg Account (100% Tax-Free under CRA Principal Residence Exemption).`
        );
      }
    } else if (state.futurePurchaseExecuted && state.homeSold) {
      // Years after selling a home purchased in the future -> renting again
      housingStatus = 'renting';
      rentPaidThisYear = params.currentRentMonthly * 12;
      mortgagePaidThisYear = 0;
      yearHousingCost = rentPaidThisYear;
    }
  }

  // SUB-LOOP: Simulate All Active Additional Properties (Current + Future Acquisitions)
  if (params.additionalProperties && params.additionalProperties.length > 0) {
    params.additionalProperties.forEach((prop, idx) => {
      const propState = state.additionalStates[idx];
      if (!propState || propState.sold) return;

      if (prop.timing === 'current') {
        const currentSimYear = 2026 + yearIndex;
        const elapsedMonths = Math.max(0, (currentSimYear - prop.mortgageStartYear) * 12);
        let propRemMtg = 0;
        let propMtgPaid = 0;

        if (!prop.isPaidOff && prop.initialMortgagePrincipal > 0 && elapsedMonths < prop.totalMortgageMonths) {
          propRemMtg = Math.max(
            0,
            prop.initialMortgagePrincipal * Math.pow(1 + prop.monthlyRate, elapsedMonths) -
              prop.monthlyMortgagePmt * ((Math.pow(1 + prop.monthlyRate, elapsedMonths) - 1) / (prop.monthlyRate || 1))
          );
          propMtgPaid = prop.monthlyMortgagePmt * 12;
        }

        const propVal = prop.currentMarketVal * Math.pow(1 + prop.appreciationRate, yearIndex);
        const propTaxYr = prop.monthlyPropertyTax * 12;
        const condoYr = prop.monthlyCondoFee * 12;
        const rentIncYr = prop.monthlyRentalIncome * 12;

        propertyTaxPaidThisYear += propTaxYr;
        condoFeesPaidThisYear += condoYr;
        mortgagePaidThisYear += propMtgPaid;
        yearHousingCost += propMtgPaid + propTaxYr + condoYr;
        rentalIncomeThisYear += rentIncYr;

        if (prop.planToSell && age === prop.sellAge) {
          propState.sold = true;
          propState.soldAge = age;
          homeSoldThisYear = true;

          const grossSalePrice = propVal;
          const netAfterClosing = grossSalePrice * (1 - prop.sellingCostRate);
          // Secondary / non-primary property capital gains estimate (50% inclusion * ~35% effective cap-gains tax on gain above cost)
          const capGain = Math.max(0, netAfterClosing - prop.costOfHome);
          const estCapGainsTax = Math.round(capGain * 0.5 * 0.35);
          const equityProceeds = Math.max(0, netAfterClosing - propRemMtg - estCapGainsTax);
          const propSaleNet = equityProceeds * prop.ownershipShare;
          propState.netProceedsAtSale = propSaleNet;
          homeSaleProceeds += propSaleNet;

          balances.pNonReg += propSaleNet;
          if (balances.customAccountsState.length > 0) {
            const targetAcc =
              balances.customAccountsState.find((a) => a.category === 'investment') ||
              balances.customAccountsState.find((a) => a.category === 'savings') ||
              balances.customAccountsState[0];
            if (targetAcc) {
              targetAcc.balance += propSaleNet;
            }
          }

          notes.push(
            `🏢 Age ${age}: Sold "${prop.name}" for $${Math.round(grossSalePrice).toLocaleString()}! Deposited $${Math.round(
              propSaleNet
            ).toLocaleString()} net equity into Non-Registered savings${estCapGainsTax > 0 ? ` (after ~$${estCapGainsTax.toLocaleString()} est. capital gains tax)` : ''}.`
          );
        } else {
          const propEq = Math.max(0, propVal - propRemMtg);
          yearHomeValue += propVal;
          remainingMortgage += propRemMtg;
          yearHomeEquity += propEq;
          userRealEstateShare += propEq * prop.ownershipShare;
          activePropertyCount += 1;
        }
      } else {
        // FUTURE ADDITIONAL PROPERTY
        if (age < prop.purchaseAge) return;

        if (age === prop.purchaseAge && !propState.purchased) {
          propState.purchased = true;
          isHomePurchasedThisYear = true;

          const downTarget = prop.targetFutureDownPayment;
          const closingNeeded = prop.totalClosingCosts;
          let cashNeeded = downTarget + closingNeeded;
          let cashDrawn = 0;

          // Draw from Non-Registered first, then TFSA (CRA FHSA/HBP only apply to first qualifying home)
          if (prop.fundWithNonReg && balances.pNonReg > 0 && cashNeeded > 0) {
            const used = Math.min(balances.pNonReg, cashNeeded);
            balances.pNonReg -= used;
            cashNeeded -= used;
            cashDrawn += used;
            if (balances.customAccountsState.length > 0) {
              let rem = used;
              for (const acc of balances.customAccountsState) {
                const deduct = Math.min(acc.balance, rem);
                acc.balance -= deduct;
                rem -= deduct;
                if (rem <= 0) break;
              }
            }
          }
          if (prop.fundWithNonReg && isCouple && balances.sNonReg > 0 && cashNeeded > 0) {
            const used = Math.min(balances.sNonReg, cashNeeded);
            balances.sNonReg -= used;
            cashNeeded -= used;
            cashDrawn += used;
          }
          if (prop.fundWithTfsa && balances.pTfsa > 0 && cashNeeded > 0) {
            const used = Math.min(balances.pTfsa, cashNeeded);
            balances.pTfsa -= used;
            cashNeeded -= used;
            cashDrawn += used;
          }
          if (prop.fundWithTfsa && isCouple && balances.sTfsa > 0 && cashNeeded > 0) {
            const used = Math.min(balances.sTfsa, cashNeeded);
            balances.sTfsa -= used;
            cashNeeded -= used;
            cashDrawn += used;
          }

          const closingFunded = Math.min(closingNeeded, cashDrawn);
          const downFunded = Math.max(0, cashDrawn - closingFunded);
          propState.totalDownPaymentFunded = downFunded;

          downPaymentPaidThisYear += downFunded;
          totalClosingCostsPaidThisYear += closingFunded;
          totalCashNeededToBuyPaidThisYear += cashDrawn;
          landTransferTaxPaidThisYear += Math.min(prop.oneTimeLandTransferTax, closingFunded);
          legalFeesPaidThisYear += prop.legalAndClosingFees;
          otherClosingPaidThisYear += prop.otherClosingCosts;
          taxOnMortgageInsurancePaidThisYear += prop.taxOnMortgageInsurance;

          propState.futureActualLoanPrincipal = Math.max(0, prop.nominalPurchasePrice - downFunded);
          propState.futureActualMonthlyPmt = prop.calcMonthlyPmtForLoan(propState.futureActualLoanPrincipal);

          const propRemMtg = propState.futureActualLoanPrincipal;
          const propVal = prop.nominalPurchasePrice;
          const propEq = Math.max(0, propVal - propRemMtg);
          const propTaxYr = prop.monthlyPropertyTax * 12;
          const condoYr = prop.monthlyCondoFee * 12;
          const propMtgPaid = propState.futureActualMonthlyPmt * 12;

          yearHomeValue += propVal;
          remainingMortgage += propRemMtg;
          yearHomeEquity += propEq;
          userRealEstateShare += propEq * prop.ownershipShare;
          propertyTaxPaidThisYear += propTaxYr;
          condoFeesPaidThisYear += condoYr;
          mortgagePaidThisYear += propMtgPaid;
          yearHousingCost += propMtgPaid + propTaxYr + condoYr;
          rentalIncomeThisYear += prop.monthlyRentalIncome * 12;
          activePropertyCount += 1;

          notes.push(
            `🏘️ Age ${age}: Acquired additional property "${prop.name}" for $${Math.round(prop.nominalPurchasePrice).toLocaleString()}! Deployed $${Math.round(
              cashDrawn
            ).toLocaleString()} cash at closing (${propState.futureActualLoanPrincipal > 0 ? `originated $${Math.round(propState.futureActualLoanPrincipal).toLocaleString()} mortgage @ $${Math.round(propState.futureActualMonthlyPmt).toLocaleString()}/mo` : '100% Paid Off / Cash Purchase'}).`
          );
        } else if (propState.purchased && !propState.sold) {
          const elapsedMonths = Math.max(0, (age - prop.purchaseAge) * 12);
          let propRemMtg = 0;
          let propMtgPaid = 0;
          if (propState.futureActualLoanPrincipal > 0 && elapsedMonths < prop.totalMortgageMonths) {
            propRemMtg = Math.max(
              0,
              propState.futureActualLoanPrincipal * Math.pow(1 + prop.monthlyRate, elapsedMonths) -
                propState.futureActualMonthlyPmt * ((Math.pow(1 + prop.monthlyRate, elapsedMonths) - 1) / (prop.monthlyRate || 1))
            );
            propMtgPaid = propState.futureActualMonthlyPmt * 12;
          }

          const propVal = prop.nominalPurchasePrice * Math.pow(1 + prop.appreciationRate, age - prop.purchaseAge);
          const propTaxYr = prop.monthlyPropertyTax * 12;
          const condoYr = prop.monthlyCondoFee * 12;

          propertyTaxPaidThisYear += propTaxYr;
          condoFeesPaidThisYear += condoYr;
          mortgagePaidThisYear += propMtgPaid;
          yearHousingCost += propMtgPaid + propTaxYr + condoYr;
          rentalIncomeThisYear += prop.monthlyRentalIncome * 12;

          if (prop.planToSell && age === prop.sellAge) {
            propState.sold = true;
            propState.soldAge = age;
            homeSoldThisYear = true;

            const grossSalePrice = propVal;
            const netAfterClosing = grossSalePrice * (1 - prop.sellingCostRate);
            const capGain = Math.max(0, netAfterClosing - prop.nominalPurchasePrice);
            const estCapGainsTax = Math.round(capGain * 0.5 * 0.35);
            const equityProceeds = Math.max(0, netAfterClosing - propRemMtg - estCapGainsTax);
            const propSaleNet = equityProceeds * prop.ownershipShare;
            propState.netProceedsAtSale = propSaleNet;
            homeSaleProceeds += propSaleNet;

            balances.pNonReg += propSaleNet;
            if (balances.customAccountsState.length > 0) {
              const targetAcc =
                balances.customAccountsState.find((a) => a.category === 'investment') ||
                balances.customAccountsState.find((a) => a.category === 'savings') ||
                balances.customAccountsState[0];
              if (targetAcc) {
                targetAcc.balance += propSaleNet;
              }
            }

            notes.push(
              `🏢 Age ${age}: Sold "${prop.name}" for $${Math.round(grossSalePrice).toLocaleString()}! Deposited $${Math.round(
                propSaleNet
              ).toLocaleString()} net equity into Non-Registered savings.`
            );
          } else {
            const propEq = Math.max(0, propVal - propRemMtg);
            yearHomeValue += propVal;
            remainingMortgage += propRemMtg;
            yearHomeEquity += propEq;
            userRealEstateShare += propEq * prop.ownershipShare;
            activePropertyCount += 1;
          }
        }
      }
    });
  }

  // Final unified household housing status across all properties
  if (remainingMortgage > 0 || mortgagePaidThisYear > 0) {
    housingStatus = 'mortgage';
  } else if (activePropertyCount > 0) {
    housingStatus = 'mortgage_free';
  } else {
    housingStatus = 'renting';
  }

  return {
    yearHomeValue,
    remainingMortgage,
    yearHomeEquity,
    userRealEstateShare,
    homeSoldThisYear,
    homeSaleProceeds,
    isHomePurchasedThisYear,
    downPaymentPaidThisYear,
    totalClosingCostsPaidThisYear,
    totalCashNeededToBuyPaidThisYear,
    legalFeesPaidThisYear,
    inspectionPaidThisYear,
    otherClosingPaidThisYear,
    taxOnMortgageInsurancePaidThisYear,
    yearFhsaWithdrawalOrTransfer,
    housingStatus,
    landTransferTaxPaidThisYear,
    propertyTaxPaidThisYear,
    condoFeesPaidThisYear,
    rentPaidThisYear,
    mortgagePaidThisYear,
    yearHousingCost,
    activePropertyCount,
    rentalIncomeThisYear,
    notes
  };
}
