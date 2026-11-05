import { EmployerMatchConfig } from '../types/retirement';

/**
 * Calculates annual employer RRSP match based on employee salary, employee contribution, and employer match formula.
 * 
 * Canadian Group RRSP / DPSP Common Structures:
 * 1. percent_of_salary: Employer matches employee contribution dollar-for-dollar (or at match rate) up to X% of base salary.
 *    E.g. 100% match up to 4% of $80k salary = up to $3,200/yr employer match.
 * 2. percent_of_contribution: Employer matches Y% of what employee contributes, optionally capped at X% of salary.
 *    E.g. 50% match on employee contributions.
 * 3. fixed_dollar: Fixed annual employer addition (e.g. flat $3,000/yr).
 */
export function calculateEmployerRrspMatch(
  salary: number,
  employeeContribution: number,
  config?: EmployerMatchConfig
): number {
  if (!config || !config.enabled) return 0;

  if (config.matchType === 'fixed_dollar') {
    return Math.max(0, Math.round(config.fixedAnnualAmount || 0));
  }

  const matchPercentOfSalary = config.matchPercentOfSalary ?? 4; // default 4% of base salary
  const matchRatePercent = config.matchRatePercent ?? 100; // default 100% (1-for-1)

  if (config.matchType === 'percent_of_contribution') {
    const rate = matchRatePercent / 100;
    const maxSalaryCap = salary > 0 ? salary * (matchPercentOfSalary / 100) : Infinity;
    const rawMatch = employeeContribution * rate;
    return Math.max(0, Math.round(Math.min(rawMatch, maxSalaryCap)));
  }

  // Default: 'percent_of_salary'
  const maxCap = salary > 0 ? salary * (matchPercentOfSalary / 100) : 0;
  const rate = matchRatePercent / 100;
  const matchable = Math.min(Math.max(0, employeeContribution), maxCap);
  return Math.max(0, Math.round(matchable * rate));
}
