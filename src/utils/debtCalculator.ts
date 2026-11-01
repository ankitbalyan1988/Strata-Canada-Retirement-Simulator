import { DebtItem, DebtCategory, DebtRepaymentStrategy } from '../types/retirement';

export interface DebtPreset {
  id: string;
  name: string;
  category: DebtCategory;
  initialBalance: number;
  interestRate: number;
  remainingTermMonths: number;
  description: string;
}

export const CANADIAN_DEBT_PRESETS: DebtPreset[] = [
  {
    id: 'csfa_student_loan',
    name: 'Canada Student Loan (CSFA)',
    category: 'student_loan',
    initialBalance: 22000,
    interestRate: 0.0, // 0% Federal interest eliminated by GoC since April 1, 2023
    remainingTermMonths: 114, // 9.5 years standard amortization
    description: 'Federal Canada Student Loans bear 0% interest under permanent statutory relief. Fixed repayment schedule.'
  },
  {
    id: 'auto_financing',
    name: 'Vehicle / Auto Financing',
    category: 'vehicle_loan',
    initialBalance: 26500,
    interestRate: 6.99,
    remainingTermMonths: 60, // 5 years
    description: 'Standard 5-year Canadian fixed automotive installment financing.'
  },
  {
    id: 'personal_consolidation',
    name: 'Personal Bank Loan',
    category: 'personal_loan',
    initialBalance: 14000,
    interestRate: 8.95,
    remainingTermMonths: 36, // 3 years
    description: 'Fixed-term personal bank loan or credit consolidation at bank prime + spread.'
  },
  {
    id: 'unsecured_loc',
    name: 'Personal Line of Credit (LOC)',
    category: 'line_of_credit',
    initialBalance: 16000,
    interestRate: 7.20,
    remainingTermMonths: 48, // 4 years
    description: 'Fixed amortizing repayment plan on an unsecured personal line of credit.'
  }
];

export interface DebtYearState {
  id: string;
  name: string;
  category: DebtCategory;
  remainingBalance: number;
  monthlyPayment: number;
  extraMonthlyPayment: number;
  interestRate: number;
  monthsRemaining: number;
  startAge: number;
  earlyPayoffAge?: number;
  lumpSumPrepaymentAmount?: number;
  lumpSumPrepaymentAge?: number;
  isPaidOff: boolean;
}

export interface DebtYearResult {
  totalRemainingBalance: number;
  totalAnnualPayment: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  activeDebtsCount: number;
  paidOffDebtsThisYear: string[];
  debtBreakdowns: Array<{
    id: string;
    name: string;
    startBalance: number;
    endBalance: number;
    annualPayment: number;
    principalPaid: number;
    interestPaid: number;
    isPaidOff: boolean;
  }>;
}

/**
 * Calculates standard monthly amortized loan payment.
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * For 0% interest loans (like Canada Student Loans), M = P / n
 */
export function calculateDebtMonthlyPayment(
  balance: number,
  annualInterestRate: number,
  termMonths: number
): number {
  if (balance <= 0 || termMonths <= 0) return 0;
  if (annualInterestRate <= 0) {
    return Math.round((balance / termMonths) * 100) / 100;
  }
  const r = (annualInterestRate / 100) / 12;
  const n = termMonths;
  const factor = Math.pow(1 + r, n);
  if (factor <= 1) return Math.round((balance / termMonths) * 100) / 100;
  const pmt = balance * (r * factor) / (factor - 1);
  return Math.round(pmt * 100) / 100;
}

/**
 * Calculates total estimated interest paid over the life of the debt with optional extra monthly payments.
 */
export function calculateTotalDebtInterest(
  balance: number,
  annualInterestRate: number,
  termMonths: number,
  customMonthlyPayment?: number,
  extraMonthlyPayment?: number
): number {
  if (balance <= 0 || termMonths <= 0 || annualInterestRate <= 0) return 0;
  const basePmt = (customMonthlyPayment && customMonthlyPayment > 0)
    ? customMonthlyPayment
    : calculateDebtMonthlyPayment(balance, annualInterestRate, termMonths);
  const totalPmt = basePmt + (extraMonthlyPayment || 0);

  let tempBal = balance;
  let totalInterest = 0;
  const r = (annualInterestRate / 100) / 12;

  for (let m = 0; m < termMonths * 2; m++) {
    if (tempBal <= 0.01) break;
    const monthlyInt = tempBal * r;
    const payoff = tempBal + monthlyInt;
    const actualPmt = Math.min(totalPmt, payoff);
    const princ = Math.max(0, actualPmt - monthlyInt);
    totalInterest += monthlyInt;
    tempBal = Math.max(0, tempBal - princ);
  }

  return Math.round(totalInterest);
}

/**
 * Initializes state trackers for all debts prior to simulation loop,
 * factoring in early repayment options and portfolio debt strategies.
 */
export function initializeDebtStates(
  debts: DebtItem[] = [],
  currentAge: number,
  strategy?: DebtRepaymentStrategy
): DebtYearState[] {
  return debts.map((d) => {
    const balance = Math.max(0, Number(d.initialBalance) || 0);
    const termMonths = Math.max(1, Number(d.remainingTermMonths) || 60);
    const rate = Math.max(0, Number(d.interestRate) || 0);
    const pmt = (d.monthlyPayment && d.monthlyPayment > 0)
      ? d.monthlyPayment
      : calculateDebtMonthlyPayment(balance, rate, termMonths);

    let extraPmt = Math.max(0, Number(d.extraMonthlyPayment) || 0);

    // If strategy has global extra payment and uses pro_rata
    if (strategy?.acceleratePayoff && strategy.extraMonthlyPayment > 0 && strategy.strategyType === 'pro_rata') {
      const totalBal = debts.reduce((s, item) => s + (Number(item.initialBalance) || 0), 0);
      const weight = totalBal > 0 ? balance / totalBal : 1 / debts.length;
      extraPmt += strategy.extraMonthlyPayment * weight;
    }

    return {
      id: d.id,
      name: d.name || 'Personal Loan',
      category: d.category || 'personal_loan',
      remainingBalance: balance,
      monthlyPayment: pmt,
      extraMonthlyPayment: extraPmt,
      interestRate: rate,
      monthsRemaining: termMonths,
      startAge: d.startAge !== undefined ? d.startAge : currentAge,
      earlyPayoffAge: d.earlyPayoffAge ?? strategy?.targetPayoffAge,
      lumpSumPrepaymentAmount: d.lumpSumPrepaymentAmount,
      lumpSumPrepaymentAge: d.lumpSumPrepaymentAge,
      isPaidOff: balance <= 0
    };
  });
}

/**
 * Advances all active debts by 12 months for a given simulation year,
 * executing monthly amortizations, early prepayments, and avalanche/snowball cascades.
 */
export function calculateDebtsForYear(
  states: DebtYearState[],
  age: number,
  strategy?: DebtRepaymentStrategy
): DebtYearResult {
  let totalAnnualPayment = 0;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  const paidOffDebtsThisYear: string[] = [];
  const debtBreakdowns: DebtYearResult['debtBreakdowns'] = [];

  // Track starting balances for reporting
  const startBalances = new Map<string, number>();
  for (const s of states) {
    startBalances.set(s.id, s.remainingBalance);
  }

  // Check for lump-sum prepayment or complete early payoff at the start of this year
  for (const s of states) {
    if (s.remainingBalance <= 0 || age < s.startAge) continue;

    // 1. Target Early Payoff in Full
    if (s.earlyPayoffAge !== undefined && age >= s.earlyPayoffAge) {
      const lump = s.remainingBalance;
      s.remainingBalance = 0;
      s.isPaidOff = true;
      totalAnnualPayment += lump;
      totalPrincipalPaid += lump;
      paidOffDebtsThisYear.push(s.name);
      continue;
    }

    // 2. One-Time Lump-Sum Prepayment
    if (s.lumpSumPrepaymentAge === age && (s.lumpSumPrepaymentAmount || 0) > 0) {
      const lump = Math.min(s.remainingBalance, s.lumpSumPrepaymentAmount!);
      s.remainingBalance = Math.max(0, s.remainingBalance - lump);
      totalAnnualPayment += lump;
      totalPrincipalPaid += lump;
      if (s.remainingBalance <= 0.01) {
        s.remainingBalance = 0;
        s.isPaidOff = true;
        paidOffDebtsThisYear.push(s.name);
      }
    }
  }

  // Month-by-month calculation for 12 months
  for (let m = 0; m < 12; m++) {
    // Determine dynamic avalanche or snowball priority if global strategy is active
    let avalancheTargetId: string | null = null;
    let snowballTargetId: string | null = null;
    const globalExtra = (strategy?.acceleratePayoff && strategy.extraMonthlyPayment > 0)
      ? strategy.extraMonthlyPayment
      : 0;

    if (globalExtra > 0) {
      const activeStates = states.filter((s) => s.remainingBalance > 0.01 && age >= s.startAge);
      if (strategy?.strategyType === 'avalanche') {
        // Highest APR first
        const sorted = [...activeStates].sort((a, b) => b.interestRate - a.interestRate);
        if (sorted.length > 0) avalancheTargetId = sorted[0].id;
      } else if (strategy?.strategyType === 'snowball') {
        // Lowest balance first
        const sorted = [...activeStates].sort((a, b) => a.remainingBalance - b.remainingBalance);
        if (sorted.length > 0) snowballTargetId = sorted[0].id;
      }
    }

    for (const s of states) {
      if (age < s.startAge || s.remainingBalance <= 0) continue;

      const r = s.interestRate > 0 ? (s.interestRate / 100) / 12 : 0;
      const monthlyInt = s.remainingBalance * r;
      const payoff = s.remainingBalance + monthlyInt;

      // Base monthly payment + per-debt extra payment + global strategy extra payment
      let extraThisMonth = s.extraMonthlyPayment;
      if (s.id === avalancheTargetId || s.id === snowballTargetId) {
        extraThisMonth += globalExtra;
      }

      const totalAttemptedPmt = s.monthlyPayment + extraThisMonth;
      const actualPmt = Math.min(totalAttemptedPmt, payoff);
      const princ = Math.max(0, actualPmt - monthlyInt);

      s.remainingBalance = Math.max(0, s.remainingBalance - princ);
      s.monthsRemaining = Math.max(0, s.monthsRemaining - 1);

      totalAnnualPayment += actualPmt;
      totalPrincipalPaid += princ;
      totalInterestPaid += monthlyInt;

      if (s.remainingBalance <= 0.01) {
        s.remainingBalance = 0;
        if (!s.isPaidOff) {
          s.isPaidOff = true;
          if (!paidOffDebtsThisYear.includes(s.name)) {
            paidOffDebtsThisYear.push(s.name);
          }
        }
      }
    }
  }

  // Construct individual breakdown records
  for (const s of states) {
    const startBal = startBalances.get(s.id) || 0;
    const princPaid = Math.max(0, startBal - s.remainingBalance);
    debtBreakdowns.push({
      id: s.id,
      name: s.name,
      startBalance: Math.round(startBal),
      endBalance: Math.round(s.remainingBalance),
      annualPayment: Math.round(princPaid),
      principalPaid: Math.round(princPaid),
      interestPaid: 0,
      isPaidOff: s.isPaidOff
    });
  }

  const totalRemainingBalance = states.reduce((sum, s) => sum + s.remainingBalance, 0);
  const activeDebtsCount = states.filter((s) => s.remainingBalance > 0).length;

  return {
    totalRemainingBalance: Math.round(totalRemainingBalance),
    totalAnnualPayment: Math.round(totalAnnualPayment),
    totalPrincipalPaid: Math.round(totalPrincipalPaid),
    totalInterestPaid: Math.round(totalInterestPaid),
    activeDebtsCount,
    paidOffDebtsThisYear,
    debtBreakdowns
  };
}

export interface EarlyPayoffComparisonResult {
  baselinePayoffAge: number;
  acceleratedPayoffAge: number;
  yearsSaved: number;
  monthsSaved: number;
  baselineTotalInterest: number;
  acceleratedTotalInterest: number;
  interestSaved: number;
  freedMonthlyCashflow: number;
  freedAnnualCashflow: number;
  projectedRetirementNestEggBoost: number;
}

/**
 * Calculates comparative savings between baseline loan terms and early/accelerated repayment,
 * quantifying interest savings and compound investment boost at retirement.
 */
export function calculateEarlyPayoffComparison(
  debts: DebtItem[] = [],
  currentAge: number,
  retirementAge: number,
  strategy?: DebtRepaymentStrategy
): EarlyPayoffComparisonResult | null {
  if (debts.length === 0 || debts.every((d) => (Number(d.initialBalance) || 0) <= 0)) {
    return null;
  }

  // 1. Simulate Baseline
  const baselineStates = initializeDebtStates(debts, currentAge, undefined);
  let baseAge = currentAge;
  let baseTotalInterest = 0;
  let basePayoffAge = currentAge;
  for (let yr = 0; yr < 40; yr++) {
    const res = calculateDebtsForYear(baselineStates, currentAge + yr, undefined);
    baseTotalInterest += res.totalInterestPaid;
    if (res.totalRemainingBalance <= 0) {
      basePayoffAge = currentAge + yr;
      break;
    }
  }

  // 2. Simulate Accelerated
  const accelStates = initializeDebtStates(debts, currentAge, strategy);
  let accelPayoffAge = currentAge;
  let accelTotalInterest = 0;
  for (let yr = 0; yr < 40; yr++) {
    const res = calculateDebtsForYear(accelStates, currentAge + yr, strategy);
    accelTotalInterest += res.totalInterestPaid;
    if (res.totalRemainingBalance <= 0) {
      accelPayoffAge = currentAge + yr;
      break;
    }
  }

  const yearsSaved = Math.max(0, basePayoffAge - accelPayoffAge);
  const monthsSaved = yearsSaved * 12;
  const interestSaved = Math.max(0, baseTotalInterest - accelTotalInterest);

  const freedMonthlyCashflow = debts.reduce((sum, d) => {
    const bal = Number(d.initialBalance) || 0;
    const rate = Number(d.interestRate) || 0;
    const term = Number(d.remainingTermMonths) || 60;
    return sum + calculateDebtMonthlyPayment(bal, rate, term);
  }, 0);
  const freedAnnualCashflow = Math.round(freedMonthlyCashflow * 12);

  // Future compound value: investing the freed annual cashflow from accelPayoffAge until retirementAge @ 6%
  const compoundingYears = Math.max(0, retirementAge - accelPayoffAge);
  const r = 0.06; // balanced Canadian portfolio return
  let nestEggBoost = 0;
  if (compoundingYears > 0 && freedAnnualCashflow > 0) {
    // Future value of an annuity
    nestEggBoost = freedAnnualCashflow * ((Math.pow(1 + r, compoundingYears) - 1) / r);
  }

  return {
    baselinePayoffAge: basePayoffAge,
    acceleratedPayoffAge: accelPayoffAge,
    yearsSaved,
    monthsSaved,
    baselineTotalInterest: Math.round(baseTotalInterest),
    acceleratedTotalInterest: Math.round(accelTotalInterest),
    interestSaved: Math.round(interestSaved),
    freedMonthlyCashflow: Math.round(freedMonthlyCashflow),
    freedAnnualCashflow,
    projectedRetirementNestEggBoost: Math.round(nestEggBoost)
  };
}

