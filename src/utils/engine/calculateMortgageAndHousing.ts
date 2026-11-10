import { RetirementInputs, PropertyType } from '../../types/retirement';
import { calculateRealtorMonthlyProjection, calculateEstimatedCashNeededToBuy } from '../canadianRealEstate';

export interface MortgageAndHousingParams {
  ownsHome: boolean;
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
  yearHousingCost: number;
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
  const futurePurchaseAge = Math.max(inputs.currentAge + 1, re?.futurePurchaseAge ?? (inputs.currentAge + 5));
  const yearsToPurchase = Math.max(1, futurePurchaseAge - inputs.currentAge);
  const futurePurchaseYear = 2026 + yearsToPurchase;
  const fundWithFhsa = re?.fundWithFhsa !== false;
  const fundWithHbp = re?.fundWithHbp !== false && re?.useHbp !== false;
  const fundWithTfsa = re?.fundWithTfsa !== false;
  const fundWithNonReg = re?.fundWithNonReg !== false;

  const homeCost = re?.costOfHome ?? 650000;
  const currentHomeMarketVal = re?.currentMarketValue ?? homeCost;
  const downPayment = re?.downPayment ?? 130000;
  const downPaymentRatio = homeCost > 0 ? Math.min(0.9, Math.max(0.05, downPayment / homeCost)) : 0.20;
  const mortgageRate = (re?.mortgageInterestRate ?? 4.79) / 100;
  const mortgageTermYears = re?.mortgageTermYears ?? 25;
  const mortgageStartYear = re?.mortgageStartYear ?? 2021;
  const ownershipShare = (re?.ownershipSharePercent ?? (isCouple ? 50 : 100)) / 100;
  const appreciationRate = (re?.annualAppreciationRate ?? 3.2) / 100;
  const planToSell = Boolean(re?.planToSellHome);
  const sellAge = re?.sellHomeAge ?? 72;
  const sellingCostRate = (re?.sellingCostPercent ?? 4.5) / 100;

  // Canadian Mortgage Amortization math (semi-annual compounding converted to monthly)
  const initialMortgagePrincipal = Math.max(0, homeCost - downPayment);
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
    : (me?.rentOrMortgage ?? re?.currentRent ?? 2200);
  const nonHousingMonthly = (me?.utilities || 0) + (me?.creditCard || 0) + (me?.otherExpenses || 0);

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

  // Effective baseline monthly housing expense (rent for renters, mortgage + property tax + condo fee for current owners)
  const effectiveMonthlyHousing = (ownsHome && !isFuturePurchase)
    ? monthlyMortgagePmt + otherOwnershipCostsMonthly
    : currentRentMonthly;

  const initialMonthlyExpenses = me
    ? (me.rentOrMortgage !== undefined && !me.autoSyncMortgage ? me.rentOrMortgage : effectiveMonthlyHousing) + nonHousingMonthly
    : effectiveMonthlyHousing + nonHousingMonthly;
  const initialAnnualExpenses = initialMonthlyExpenses * 12;

  return {
    ownsHome,
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
    totalCashNeededToBuy
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
  let yearHousingCost = 0;

  if (!params.ownsHome) {
    housingStatus = 'renting';
    yearHousingCost = params.currentRentMonthly * 12;
  } else if (!params.isFuturePurchase) {
    // CURRENT HOMEOWNER (Purchased in past)
    if (!state.homeSold) {
      const currentSimYear = 2026 + yearIndex;
      const elapsedMonths = Math.max(0, (currentSimYear - params.mortgageStartYear) * 12);
      if (params.initialMortgagePrincipal <= 0 || elapsedMonths >= params.totalMortgageMonths) {
        remainingMortgage = 0;
        housingStatus = 'mortgage_free';
        yearHousingCost = params.otherOwnershipCostsMonthly * 12;
      } else {
        remainingMortgage = Math.max(
          0,
          params.initialMortgagePrincipal * Math.pow(1 + params.monthlyRate, elapsedMonths) -
            params.monthlyMortgagePmt * ((Math.pow(1 + params.monthlyRate, elapsedMonths) - 1) / (params.monthlyRate || 1))
        );
        housingStatus = 'mortgage';
        yearHousingCost = (params.monthlyMortgagePmt + params.otherOwnershipCostsMonthly) * 12;
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
          `🏡 Age ${age}: Home sold for $${Math.round(grossSalePrice).toLocaleString()}! Net equity proceeds of $${Math.round(
            homeSaleProceeds
          ).toLocaleString()} deposited into Taxable Non-Reg Account (100% Tax-Free under CRA Principal Residence Exemption).`
        );
      }
    } else {
      housingStatus = 'renting';
      yearHousingCost = params.currentRentMonthly * 12;
    }
  } else {
    // FUTURE HOME PURCHASE
    if (age < params.futurePurchaseAge) {
      housingStatus = 'renting';
      yearHousingCost = params.currentRentMonthly * 12;
      if (yearIndex === 0) {
        notes.push(
          `🏢 Currently Renting: Paying $${Math.round(params.currentRentMonthly).toLocaleString()}/month while saving toward planned home purchase at Age ${params.futurePurchaseAge} (Year ${params.futurePurchaseYear}).`
        );
      }
    } else if (age === params.futurePurchaseAge && !state.futurePurchaseExecuted) {
      state.futurePurchaseExecuted = true;
      isHomePurchasedThisYear = true;
      housingStatus = 'mortgage';

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
      yearHousingCost = (state.futureActualMonthlyPmt + params.otherOwnershipCostsMonthly) * 12;

      notes.push(
        `🏡 Age ${age}: Purchased primary residence for $${Math.round(params.nominalPurchasePrice).toLocaleString()}! Deployed $${Math.round(totalCashDrawn).toLocaleString()} total cash at closing ($${Math.round(downPaymentFunded).toLocaleString()} down payment + $${Math.round(closingFunded).toLocaleString()} closing costs: $${Math.round(landTransferTaxPaidThisYear).toLocaleString()} Land Transfer Tax, $${Math.round(params.legalAndClosingFees).toLocaleString()} legal fees, $${Math.round(params.otherClosingCosts).toLocaleString()} other closing${params.taxOnMortgageInsurance > 0 ? `, $${Math.round(params.taxOnMortgageInsurance).toLocaleString()} tax on mortgage insurance` : ''}${params.homeInspectionCost > 0 ? `, $${Math.round(params.homeInspectionCost).toLocaleString()} inspection` : ''}). Originated ${params.mortgageTermYears}-yr mortgage of $${Math.round(state.futureActualLoanPrincipal).toLocaleString()} ($${Math.round(state.futureActualMonthlyPmt).toLocaleString()}/month). Ongoing: $${params.monthlyPropertyTax}/mo property taxes${params.monthlyCondoFee > 0 ? ` + $${params.monthlyCondoFee}/mo condo fees` : ''}.`
      );
    } else if (state.futurePurchaseExecuted && !state.homeSold) {
      // Post-purchase years
      const elapsedMonths = Math.max(0, (age - params.futurePurchaseAge) * 12);
      if (state.futureActualLoanPrincipal <= 0 || elapsedMonths >= params.totalMortgageMonths) {
        remainingMortgage = 0;
        housingStatus = 'mortgage_free';
        yearHousingCost = params.otherOwnershipCostsMonthly * 12;
      } else {
        remainingMortgage = Math.max(
          0,
          state.futureActualLoanPrincipal * Math.pow(1 + params.monthlyRate, elapsedMonths) -
            state.futureActualMonthlyPmt * ((Math.pow(1 + params.monthlyRate, elapsedMonths) - 1) / (params.monthlyRate || 1))
        );
        housingStatus = 'mortgage';
        yearHousingCost = (state.futureActualMonthlyPmt + params.otherOwnershipCostsMonthly) * 12;
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
          `🏡 Age ${age}: Home sold for $${Math.round(grossSalePrice).toLocaleString()}! Net equity proceeds of $${Math.round(
            homeSaleProceeds
          ).toLocaleString()} deposited into Taxable Non-Reg Account (100% Tax-Free under CRA Principal Residence Exemption).`
        );
      }
    }
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
    yearHousingCost,
    notes
  };
}
