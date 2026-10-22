import { RetirementInputs } from '../../types/retirement';

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
  yearFhsaWithdrawalOrTransfer: number;
  housingStatus: 'renting' | 'mortgage' | 'mortgage_free';
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
  const ownsHome = Boolean(re && re.ownsHome);
  const purchaseType = re?.purchaseType ?? (ownsHome ? 'current' : 'rent');
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
  const initialMonthlyExpenses = me
    ? (me.rentOrMortgage || 0) + nonHousingMonthly
    : Math.round((inputs.targetRetirementSpendingToday / 12) * 1.25);
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
    initialAnnualExpenses
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
  let yearFhsaWithdrawalOrTransfer = 0;
  let housingStatus: 'renting' | 'mortgage' | 'mortgage_free' = params.ownsHome ? 'mortgage' : 'renting';

  if (!params.ownsHome) {
    housingStatus = 'renting';
  } else if (!params.isFuturePurchase) {
    // CURRENT HOMEOWNER (Purchased in past)
    if (!state.homeSold) {
      const currentSimYear = 2026 + yearIndex;
      const elapsedMonths = Math.max(0, (currentSimYear - params.mortgageStartYear) * 12);
      if (params.initialMortgagePrincipal <= 0 || elapsedMonths >= params.totalMortgageMonths) {
        remainingMortgage = 0;
        housingStatus = 'mortgage_free';
      } else {
        remainingMortgage = Math.max(
          0,
          params.initialMortgagePrincipal * Math.pow(1 + params.monthlyRate, elapsedMonths) -
            params.monthlyMortgagePmt * ((Math.pow(1 + params.monthlyRate, elapsedMonths) - 1) / (params.monthlyRate || 1))
        );
        housingStatus = 'mortgage';
      }

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
    }
  } else {
    // FUTURE HOME PURCHASE
    if (age < params.futurePurchaseAge) {
      housingStatus = 'renting';
      if (yearIndex === 0) {
        notes.push(
          `🏢 Currently Renting: Paying $${Math.round(params.currentRentMonthly).toLocaleString()}/month while saving toward planned home purchase at Age ${params.futurePurchaseAge} (Year ${params.futurePurchaseYear}).`
        );
      }
    } else if (age === params.futurePurchaseAge && !state.futurePurchaseExecuted) {
      state.futurePurchaseExecuted = true;
      isHomePurchasedThisYear = true;
      housingStatus = 'mortgage';

      let downPaymentNeeded = params.targetFutureDownPayment;
      state.totalDownPaymentFunded = 0;

      // 1. Primary FHSA
      if (params.fundWithFhsa && balances.pFhsa > 0 && downPaymentNeeded > 0) {
        const used = Math.min(balances.pFhsa, downPaymentNeeded);
        balances.pFhsa -= used;
        downPaymentNeeded -= used;
        state.totalDownPaymentFunded += used;
        state.pFhsaActive = false;
        yearFhsaWithdrawalOrTransfer += used;
        notes.push(`🏠 Age ${age}: First Home Savings Account (FHSA) fully deployed tax-free ($${Math.round(used).toLocaleString()}) for qualifying home purchase down payment.`);
      }

      // 2. Spouse FHSA
      if (params.fundWithFhsa && isCouple && balances.sFhsa > 0 && downPaymentNeeded > 0) {
        const used = Math.min(balances.sFhsa, downPaymentNeeded);
        balances.sFhsa -= used;
        downPaymentNeeded -= used;
        state.totalDownPaymentFunded += used;
        state.sFhsaActive = false;
        yearFhsaWithdrawalOrTransfer += used;
        notes.push(`🏠 Spouse Age ${spouseAge}: Spouse FHSA deployed tax-free ($${Math.round(used).toLocaleString()}) for qualifying home purchase down payment.`);
      }

      // 3. RRSP HBP
      if (params.fundWithHbp && balances.pRrsp > 0 && downPaymentNeeded > 0) {
        const hbp = Math.min(60000, balances.pRrsp, downPaymentNeeded);
        balances.pRrsp -= hbp;
        downPaymentNeeded -= hbp;
        state.totalDownPaymentFunded += hbp;
        notes.push(`🍁 Age ${age}: CRA Home Buyers' Plan (HBP) tax-free RRSP withdrawal of $${Math.round(hbp).toLocaleString()} applied to down payment.`);
      }
      if (params.fundWithHbp && isCouple && balances.sRrsp > 0 && downPaymentNeeded > 0) {
        const hbp = Math.min(60000, balances.sRrsp, downPaymentNeeded);
        balances.sRrsp -= hbp;
        downPaymentNeeded -= hbp;
        state.totalDownPaymentFunded += hbp;
        notes.push(`🍁 Spouse Age ${spouseAge}: Spouse CRA Home Buyers' Plan (HBP) withdrawal of $${Math.round(hbp).toLocaleString()} applied to down payment.`);
      }

      // 4. Non-Registered taxable savings
      if (params.fundWithNonReg && balances.pNonReg > 0 && downPaymentNeeded > 0) {
        const used = Math.min(balances.pNonReg, downPaymentNeeded);
        balances.pNonReg -= used;
        downPaymentNeeded -= used;
        state.totalDownPaymentFunded += used;
        if (balances.customAccountsState.length > 0) {
          let rem = used;
          for (const acc of balances.customAccountsState) {
            const deduct = Math.min(acc.balance, rem);
            acc.balance -= deduct;
            rem -= deduct;
            if (rem <= 0) break;
          }
        }
        notes.push(`💵 Age ${age}: Deployed $${Math.round(used).toLocaleString()} from Non-Registered taxable savings for down payment.`);
      }
      if (params.fundWithNonReg && isCouple && balances.sNonReg > 0 && downPaymentNeeded > 0) {
        const used = Math.min(balances.sNonReg, downPaymentNeeded);
        balances.sNonReg -= used;
        downPaymentNeeded -= used;
        state.totalDownPaymentFunded += used;
      }

      // 5. TFSA
      if (params.fundWithTfsa && balances.pTfsa > 0 && downPaymentNeeded > 0) {
        const used = Math.min(balances.pTfsa, downPaymentNeeded);
        balances.pTfsa -= used;
        downPaymentNeeded -= used;
        state.totalDownPaymentFunded += used;
        notes.push(`🛡️ Age ${age}: Deployed $${Math.round(used).toLocaleString()} from TFSA tax-free for down payment.`);
      }
      if (params.fundWithTfsa && isCouple && balances.sTfsa > 0 && downPaymentNeeded > 0) {
        const used = Math.min(balances.sTfsa, downPaymentNeeded);
        balances.sTfsa -= used;
        downPaymentNeeded -= used;
        state.totalDownPaymentFunded += used;
      }

      downPaymentPaidThisYear = state.totalDownPaymentFunded;
      state.futureActualLoanPrincipal = Math.max(0, params.nominalPurchasePrice - state.totalDownPaymentFunded);
      state.futureActualMonthlyPmt = params.calcMonthlyPmtForLoan(state.futureActualLoanPrincipal);

      remainingMortgage = state.futureActualLoanPrincipal;
      yearHomeValue = params.nominalPurchasePrice;
      yearHomeEquity = Math.max(0, yearHomeValue - remainingMortgage);
      userRealEstateShare = yearHomeEquity * params.ownershipShare;

      notes.push(
        `🏡 Age ${age}: Purchased primary residence for $${Math.round(params.nominalPurchasePrice).toLocaleString()}! Down payment of $${Math.round(state.totalDownPaymentFunded).toLocaleString()} funded from savings. Originated ${params.mortgageTermYears}-yr mortgage of $${Math.round(state.futureActualLoanPrincipal).toLocaleString()} ($${Math.round(state.futureActualMonthlyPmt).toLocaleString()}/month).`
      );
    } else if (state.futurePurchaseExecuted && !state.homeSold) {
      // Post-purchase years
      const elapsedMonths = Math.max(0, (age - params.futurePurchaseAge) * 12);
      if (state.futureActualLoanPrincipal <= 0 || elapsedMonths >= params.totalMortgageMonths) {
        remainingMortgage = 0;
        housingStatus = 'mortgage_free';
      } else {
        remainingMortgage = Math.max(
          0,
          state.futureActualLoanPrincipal * Math.pow(1 + params.monthlyRate, elapsedMonths) -
            state.futureActualMonthlyPmt * ((Math.pow(1 + params.monthlyRate, elapsedMonths) - 1) / (params.monthlyRate || 1))
        );
        housingStatus = 'mortgage';
      }

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
    yearFhsaWithdrawalOrTransfer,
    housingStatus,
    notes
  };
}
