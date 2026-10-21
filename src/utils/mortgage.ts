import { RealEstateInputs } from '../types/retirement';

/**
 * Calculates standard Canadian semi-annually compounded monthly mortgage payment
 * for an existing homeowner. Returns 0 if renting or if future home purchase has not yet occurred.
 */
export function calculateMonthlyMortgagePayment(re?: RealEstateInputs): number {
  if (!re || !re.ownsHome || re.purchaseType === 'future') return 0;
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
