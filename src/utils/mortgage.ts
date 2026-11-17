import { AdditionalPropertyItem, RealEstateInputs, RetirementInputs } from '../types/retirement';

/**
 * Calculates standard Canadian semi-annually compounded monthly mortgage payment
 * for an existing homeowner. Returns 0 if renting, fully paid off, or if future home purchase has not yet occurred.
 */
export function calculateMonthlyMortgagePayment(re?: RealEstateInputs): number {
  if (!re || !re.ownsHome || re.purchaseType === 'future' || re.isPaidOff) return 0;
  const costOfHome = re.costOfHome || 650000;
  const downPayment = re.downPayment ?? 130000;
  const initialLoan = Math.max(0, costOfHome - downPayment);
  if (initialLoan <= 0) return 0;

  const mortgageInterestRate = re.mortgageInterestRate ?? 4.79;
  const mortgageTermYears = re.mortgageTermYears ?? 25;
  return calculateFutureMonthlyMortgagePayment(initialLoan, mortgageInterestRate, mortgageTermYears);
}

/**
 * Calculates standard Canadian semi-annually compounded monthly mortgage payment for any loan principal
 */
export function calculateFutureMonthlyMortgagePayment(
  principal: number,
  interestRate: number = 4.79,
  termYears: number = 25
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const semiAnnualRate = (interestRate / 100) / 2;
  const monthlyRate = interestRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
  const totalMonths = termYears * 12;
  if (totalMonths <= 0) return 0;

  const monthlyPayment =
    monthlyRate > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : principal / totalMonths;

  return Math.round(monthlyPayment);
}

/**
 * Calculates remaining mortgage balance after elapsedMonths using Canadian semi-annual compounding
 */
export function calculateRemainingMortgageBalance(
  principal: number,
  interestRate: number,
  termYears: number,
  elapsedMonths: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const totalMonths = termYears * 12;
  if (elapsedMonths >= totalMonths) return 0;
  if (elapsedMonths <= 0) return Math.round(principal);

  const semiAnnualRate = (interestRate / 100) / 2;
  const monthlyRate = interestRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
  if (monthlyRate <= 0) {
    return Math.max(0, Math.round(principal * (1 - elapsedMonths / totalMonths)));
  }

  const exactPmt =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1);

  const balance =
    principal * Math.pow(1 + monthlyRate, elapsedMonths) -
    exactPmt * ((Math.pow(1 + monthlyRate, elapsedMonths) - 1) / monthlyRate);

  return Math.max(0, Math.round(balance));
}

/**
 * Resolves currently active additional real estate properties based on onboarding toggles.
 * Keeps existing properties cleanly filtered when user turns off multiple/future property flags.
 */
export function getActiveAdditionalProperties(inputs: RetirementInputs): AdditionalPropertyItem[] {
  const re = inputs.realEstate;
  const list = re?.additionalProperties;
  if (!list || list.length === 0) return [];

  const hStatus: 'own' | 'rent' =
    inputs.housingStatus ??
    (re?.ownsHome && re?.purchaseType !== 'future'
      ? 'own'
      : re?.purchaseType === 'future'
      ? 'rent'
      : re?.ownsHome === false
      ? 'rent'
      : 'own');

  const planFuturePrimary =
    inputs.planFutureHomePurchase ?? Boolean(re?.ownsHome && re?.purchaseType === 'future');

  return list.filter((p) => {
    if (p.timing === 'current') {
      return hStatus === 'own' && re?.ownsMultipleProperties !== false;
    }
    if (hStatus === 'rent' && !planFuturePrimary) {
      return false;
    }
    return re?.planFutureAdditionalProperties !== false;
  });
}

export interface AdditionalPropertySummaryStats {
  isPaidOff: boolean;
  initialLoan: number;
  remainingMortgageToday: number;
  monthlyPayment: number;
  currentMarketValue: number;
  equityToday: number;
  userEquityToday: number;
  projectedPurchasePrice: number;
  projectedDownPayment: number;
  futureInitialLoan: number;
  futureMonthlyPayment: number;
  mortgageFreeAge: number;
  yearsToPurchase: number;
  purchaseAge: number;
}

export function calculateAdditionalPropertySummary(
  prop: AdditionalPropertyItem,
  currentAge: number = 35,
  currentCalendarYear: number = 2026
): AdditionalPropertySummaryStats {
  const cost = Math.max(0, prop.costOfHome || 0);
  const marketVal = Math.max(0, prop.currentMarketValue || cost);
  const downPmt = Math.max(0, prop.downPayment || 0);
  const rate = prop.mortgageInterestRate ?? 4.79;
  const term = prop.mortgageTermYears ?? 25;
  const startYear = prop.mortgageStartYear ?? 2021;
  const share = (prop.ownershipSharePercent ?? 100) / 100;
  const appRate = (prop.annualAppreciationRate ?? 3.2) / 100;
  const isPaidOff = Boolean(prop.isPaidOff);

  if (prop.timing === 'current') {
    const initialLoan = isPaidOff ? 0 : Math.max(0, cost - downPmt);
    const elapsedMonths = Math.max(0, (currentCalendarYear - startYear) * 12);
    const remainingMortgageToday = isPaidOff
      ? 0
      : calculateRemainingMortgageBalance(initialLoan, rate, term, elapsedMonths);
    const monthlyPayment =
      isPaidOff || initialLoan <= 0 || remainingMortgageToday <= 0
        ? 0
        : calculateFutureMonthlyMortgagePayment(initialLoan, rate, term);
    const equityToday = Math.max(0, marketVal - remainingMortgageToday);
    const userEquityToday = Math.round(equityToday * share);
    const mortgageFreeAge =
      isPaidOff || remainingMortgageToday <= 0
        ? currentAge
        : currentAge + Math.max(0, startYear + term - currentCalendarYear);

    return {
      isPaidOff: isPaidOff || remainingMortgageToday <= 0,
      initialLoan,
      remainingMortgageToday,
      monthlyPayment,
      currentMarketValue: marketVal,
      equityToday,
      userEquityToday,
      projectedPurchasePrice: marketVal,
      projectedDownPayment: downPmt,
      futureInitialLoan: 0,
      futureMonthlyPayment: 0,
      mortgageFreeAge,
      yearsToPurchase: 0,
      purchaseAge: currentAge
    };
  }

  // Future acquisition
  const purchaseAge = Math.max(currentAge + 1, prop.purchaseAge ?? currentAge + 6);
  const yearsToPurchase = Math.max(1, purchaseAge - currentAge);
  const projectedPurchasePrice = Math.round(cost * Math.pow(1 + appRate, yearsToPurchase));
  const downRatio = isPaidOff
    ? 1.0
    : cost > 0
    ? Math.min(1.0, Math.max(0.05, downPmt / cost))
    : 0.2;
  const projectedDownPayment = Math.round(projectedPurchasePrice * downRatio);
  const futureInitialLoan = isPaidOff ? 0 : Math.max(0, projectedPurchasePrice - projectedDownPayment);
  const futureMonthlyPayment = isPaidOff
    ? 0
    : calculateFutureMonthlyMortgagePayment(futureInitialLoan, rate, term);
  const mortgageFreeAge = isPaidOff ? purchaseAge : purchaseAge + term;

  return {
    isPaidOff,
    initialLoan: 0,
    remainingMortgageToday: 0,
    monthlyPayment: 0,
    currentMarketValue: 0,
    equityToday: 0,
    userEquityToday: 0,
    projectedPurchasePrice,
    projectedDownPayment,
    futureInitialLoan,
    futureMonthlyPayment,
    mortgageFreeAge,
    yearsToPurchase,
    purchaseAge
  };
}

