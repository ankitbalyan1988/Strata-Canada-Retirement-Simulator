import { RealEstateInputs } from '../types/retirement';

/**
 * Calculates standard Canadian semi-annually compounded monthly mortgage payment
 */
export function calculateMonthlyMortgagePayment(re?: RealEstateInputs): number {
  if (!re || !re.ownsHome) return 0;
  const costOfHome = re.costOfHome || 650000;
  const downPayment = re.downPayment ?? 130000;
  const initialLoan = Math.max(0, costOfHome - downPayment);
  if (initialLoan <= 0) return 0;

  const mortgageInterestRate = re.mortgageInterestRate ?? 4.79;
  const mortgageTermYears = re.mortgageTermYears ?? 25;
  const semiAnnualRate = (mortgageInterestRate / 100) / 2;
  const monthlyRate = mortgageInterestRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
  const totalMonths = mortgageTermYears * 12;
  if (totalMonths <= 0) return 0;

  const monthlyPayment =
    monthlyRate > 0
      ? (initialLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : initialLoan / totalMonths;

  return Math.round(monthlyPayment);
}
