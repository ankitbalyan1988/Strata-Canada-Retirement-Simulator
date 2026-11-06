import { 
  RetirementInputs, 
  ContributionPriorityAccount, 
  ContributionAllocationConfig, 
  CanadianProvince 
} from '../types/retirement';
import { 
  calculateCanadianTax, 
  TFSA_ANNUAL_LIMIT, 
  FHSA_ANNUAL_LIMIT, 
  FHSA_LIFETIME_LIMIT 
} from './canadianTax';
import { calculateEmployerRrspMatch } from './employerMatch';

export interface InHandIncomeResult {
  grossAnnualIncome: number;
  grossMonthlyIncome: number;
  federalTax: number;
  provincialTax: number;
  totalIncomeTax: number;
  cppDeduction: number;
  eiDeduction: number;
  totalStatutoryDeductions: number;
  netInHandAnnual: number;
  netInHandMonthly: number;
  effectiveDeductionRate: number; // %
}

export interface AccountAllocationDetail {
  account: ContributionPriorityAccount;
  name: string;
  rank: number;
  statutoryLimit: number;
  customCap?: number;
  effectiveCap: number; // Employee paycheck contribution cap
  totalStatutoryRoom?: number; // Total combined account ceiling (e.g. $32,490 CRA limit)
  employerMatchAmount?: number; // Employer match portion
  totalAdditionAmount?: number; // Combined Employee + Employer additions compounding
  allocatedAmount: number; // Employee paycheck allocation
  monthlyAmount: number;
  isCapped: boolean;
  remainingRoomAfterAllocation: number;
  note: string;
}

export interface CashFlowStressTestResult {
  primaryIncome: InHandIncomeResult;
  spouseIncome?: InHandIncomeResult;
  householdGrossAnnual: number;
  householdGrossMonthly: number;
  householdNetInHandAnnual: number;
  householdNetInHandMonthly: number;
  
  // Expenses
  annualLivingExpenses: number;
  monthlyLivingExpenses: number;
  annualDebtPayments: number;
  monthlyDebtPayments: number;
  totalAnnualExpenses: number;
  totalMonthlyExpenses: number;
  
  // Net Cash Flow Surplus
  netCashFlowSurplusAnnual: number; // take-home - expenses
  netCashFlowSurplusMonthly: number;
  
  // Stated Contributions Comparison
  currentPlannedContributionsAnnual: number; // Employee out-of-pocket contributions
  currentPlannedContributionsMonthly: number;
  
  // Employer RRSP Match
  primaryEmployerMatch: number;
  spouseEmployerMatch: number;
  totalEmployerMatchAnnual: number;
  totalEmployerMatchMonthly: number;
  totalPlannedWithMatchAnnual: number; // Combined Employee + Employer savings
  totalPlannedWithMatchMonthly: number;
  
  // Stress Test Outcome
  status: 'surplus' | 'balanced' | 'deficit';
  deficitAmountAnnual: number;
  deficitAmountMonthly: number;
  surplusBufferAnnual: number;
  surplusBufferMonthly: number;
  coverageRatio: number; // (netSurplus / planned) * 100%
  
  // Dynamic Waterfall Allocation
  priorityOrder: ContributionPriorityAccount[];
  waterfallAllocations: Record<ContributionPriorityAccount, AccountAllocationDetail>;
  totalWaterfallAllocatedAnnual: number;
  totalWaterfallAllocatedMonthly: number;
  unallocatedSurplusAnnual: number;
}

// 2025/2026 CRA Statutory Limits
export const CRA_RRSP_MAX_DOLLAR_LIMIT_2025 = 32490;
export const CRA_RRSP_RATE = 0.18; // 18% of earned income
export const DEFAULT_PRIORITY_ORDER: ContributionPriorityAccount[] = ['rrsp', 'tfsa', 'fhsa', 'nonReg'];

/**
 * Calculates Canadian take-home / in-hand income after Federal & Provincial Income Tax,
 * Canada Pension Plan (CPP / CPP2), and Employment Insurance (EI).
 */
export function calculateInHandIncome(
  grossIncome: number,
  province: CanadianProvince = 'ON',
  age: number = 35
): InHandIncomeResult {
  if (grossIncome <= 0) {
    return {
      grossAnnualIncome: 0,
      grossMonthlyIncome: 0,
      federalTax: 0,
      provincialTax: 0,
      totalIncomeTax: 0,
      cppDeduction: 0,
      eiDeduction: 0,
      totalStatutoryDeductions: 0,
      netInHandAnnual: 0,
      netInHandMonthly: 0,
      effectiveDeductionRate: 0
    };
  }

  // 1. Income Tax (Federal & Provincial)
  const taxResult = calculateCanadianTax(grossIncome, province, age);

  // 2. CPP / CPP2 Employee Contribution (2025/2026 indexing)
  // Basic Exemption: $3,500; YMPE: $71,300 at 5.95% = max $4,034.10
  // YAMPE: $81,200 at 4.0% = max $396.00
  const isQuebec = province === 'QC';
  const cppBasicExemption = 3500;
  const ympe = 71300;
  const yampe = 81200;
  const baseRate = isQuebec ? 0.064 : 0.0595;
  
  const pensionableBase = Math.max(0, Math.min(grossIncome, ympe) - cppBasicExemption);
  const baseCpp = pensionableBase * baseRate;
  
  const pensionableEnhanced = Math.max(0, Math.min(grossIncome, yampe) - ympe);
  const enhancedCpp = pensionableEnhanced * 0.04;
  
  const cppDeduction = Math.round(baseCpp + enhancedCpp);

  // 3. EI Premium (2025/2026 indexing: 1.64% on earnings up to $65,700 = max $1,077.48; QC: 1.31%)
  const maxInsurableEarnings = 65700;
  const eiRate = isQuebec ? 0.0131 : 0.0164;
  const eiDeduction = Math.round(Math.min(grossIncome, maxInsurableEarnings) * eiRate);

  const totalStatutoryDeductions = Math.round(taxResult.totalTax + cppDeduction + eiDeduction);
  const netInHandAnnual = Math.max(0, Math.round(grossIncome - totalStatutoryDeductions));
  const effectiveDeductionRate = grossIncome > 0 ? (totalStatutoryDeductions / grossIncome) * 100 : 0;

  return {
    grossAnnualIncome: Math.round(grossIncome),
    grossMonthlyIncome: Math.round(grossIncome / 12),
    federalTax: Math.round(taxResult.federalTax),
    provincialTax: Math.round(taxResult.provincialTax),
    totalIncomeTax: Math.round(taxResult.totalTax),
    cppDeduction,
    eiDeduction,
    totalStatutoryDeductions,
    netInHandAnnual,
    netInHandMonthly: Math.round(netInHandAnnual / 12),
    effectiveDeductionRate: Number(effectiveDeductionRate.toFixed(1))
  };
}

/**
 * Evaluates full household cash flow stress test and dynamic priority waterfall allocation.
 */
export function runCashFlowStressTest(inputs: RetirementInputs): CashFlowStressTestResult {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;

  // 1. In-Hand Income
  const primaryIncome = calculateInHandIncome(
    inputs.currentAnnualIncome,
    inputs.province,
    inputs.currentAge
  );

  let spouseIncome: InHandIncomeResult | undefined;
  if (isCouple && spouse && spouse.annualIncome > 0) {
    spouseIncome = calculateInHandIncome(
      spouse.annualIncome,
      inputs.province,
      spouse.currentAge
    );
  }

  const householdGrossAnnual = primaryIncome.grossAnnualIncome + (spouseIncome?.grossAnnualIncome || 0);
  const householdGrossMonthly = Math.round(householdGrossAnnual / 12);

  const householdNetInHandAnnual = primaryIncome.netInHandAnnual + (spouseIncome?.netInHandAnnual || 0);
  const householdNetInHandMonthly = Math.round(householdNetInHandAnnual / 12);

  // 2. Living Expenses & Debts
  const monthlyExp = inputs.monthlyExpenses;
  const monthlyLivingExpenses = monthlyExp
    ? (monthlyExp.rentOrMortgage || 0) +
      (monthlyExp.utilities || 0) +
      (monthlyExp.creditCard || 0) +
      (monthlyExp.otherExpenses || 0)
    : Math.round((inputs.targetRetirementSpendingToday || 60000) / 12);

  const annualLivingExpenses = monthlyLivingExpenses * 12;

  // Consumer debts service
  let monthlyDebtPayments = 0;
  if (inputs.debts && inputs.debts.length > 0) {
    inputs.debts.forEach((debt) => {
      if (debt.monthlyPayment && debt.monthlyPayment > 0) {
        monthlyDebtPayments += debt.monthlyPayment;
      }
    });
  }
  const annualDebtPayments = monthlyDebtPayments * 12;

  const totalAnnualExpenses = annualLivingExpenses + annualDebtPayments;
  const totalMonthlyExpenses = Math.round(totalAnnualExpenses / 12);

  // 3. Net Cash Flow Surplus (Take-home minus expenses)
  const netCashFlowSurplusAnnual = householdNetInHandAnnual - totalAnnualExpenses;
  const netCashFlowSurplusMonthly = Math.round(netCashFlowSurplusAnnual / 12);

  // 4. Current Stated Contributions
  const primaryPlanned = 
    (inputs.rrspAnnualContribution || 0) +
    (inputs.tfsaAnnualContribution || 0) +
    (inputs.fhsaAnnualContribution || 0) +
    (inputs.nonRegAnnualContribution || 0);

  const spousePlanned = isCouple && spouse
    ? (spouse.rrspAnnualContribution || 0) +
      (spouse.tfsaAnnualContribution || 0) +
      (spouse.fhsaAnnualContribution || 0) +
      (spouse.nonRegAnnualContribution || 0)
    : 0;

  const currentPlannedContributionsAnnual = primaryPlanned + spousePlanned;
  const currentPlannedContributionsMonthly = Math.round(currentPlannedContributionsAnnual / 12);

  // Employer RRSP Match calculations
  const primaryEmployerMatch = calculateEmployerRrspMatch(
    inputs.currentAnnualIncome,
    inputs.rrspAnnualContribution,
    inputs.employerMatch
  );
  const spouseEmployerMatch = isCouple && spouse
    ? calculateEmployerRrspMatch(spouse.annualIncome, spouse.rrspAnnualContribution, spouse.employerMatch)
    : 0;
  const totalEmployerMatchAnnual = primaryEmployerMatch + spouseEmployerMatch;
  const totalEmployerMatchMonthly = Math.round(totalEmployerMatchAnnual / 12);
  const totalPlannedWithMatchAnnual = currentPlannedContributionsAnnual + totalEmployerMatchAnnual;
  const totalPlannedWithMatchMonthly = Math.round(totalPlannedWithMatchAnnual / 12);

  // 5. Stress Test Status
  let status: 'surplus' | 'balanced' | 'deficit' = 'balanced';
  let deficitAmountAnnual = 0;
  let surplusBufferAnnual = 0;

  if (currentPlannedContributionsAnnual > netCashFlowSurplusAnnual) {
    status = 'deficit';
    deficitAmountAnnual = Math.max(0, currentPlannedContributionsAnnual - Math.max(0, netCashFlowSurplusAnnual));
    if (netCashFlowSurplusAnnual < 0) {
      deficitAmountAnnual += Math.abs(netCashFlowSurplusAnnual);
    }
  } else if (netCashFlowSurplusAnnual > currentPlannedContributionsAnnual) {
    status = 'surplus';
    surplusBufferAnnual = netCashFlowSurplusAnnual - currentPlannedContributionsAnnual;
  }

  const coverageRatio = currentPlannedContributionsAnnual > 0
    ? Math.round((Math.max(0, netCashFlowSurplusAnnual) / currentPlannedContributionsAnnual) * 100)
    : netCashFlowSurplusAnnual >= 0 ? 100 : 0;

  // 6. Dynamic Priority Waterfall Allocation
  const allocationConfig = inputs.contributionAllocation;
  const priorityOrder = allocationConfig?.priorityOrder?.length === 4
    ? allocationConfig.priorityOrder
    : DEFAULT_PRIORITY_ORDER;

  const customCaps = allocationConfig?.customCaps || {};

  // Statutory limits
  // RRSP: 18% of earned income up to CRA dollar limit
  const statutoryRrspLimit = Math.round(
    Math.min(CRA_RRSP_MAX_DOLLAR_LIMIT_2025, inputs.currentAnnualIncome * CRA_RRSP_RATE)
  );

  // TFSA: $7,000 statutory limit
  const statutoryTfsaLimit = TFSA_ANNUAL_LIMIT;

  // FHSA: $8,000 statutory limit, capped at remaining lifetime room ($40k max)
  const fhsaRemaining = inputs.fhsaRemainingContributionRoom !== undefined
    ? Math.min(FHSA_LIFETIME_LIMIT, Math.max(0, inputs.fhsaRemainingContributionRoom))
    : Math.max(0, FHSA_LIFETIME_LIMIT - Math.min(FHSA_LIFETIME_LIMIT, inputs.fhsaBalance || 0));
  const statutoryFhsaLimit = Math.min(FHSA_ANNUAL_LIMIT, fhsaRemaining);

  // Non-Reg has no statutory limit
  const statutoryNonRegLimit = Infinity;

  // Prepare cap definitions
  const accountMeta: Record<ContributionPriorityAccount, { name: string; statutoryLimit: number }> = {
    rrsp: { name: 'RRSP', statutoryLimit: statutoryRrspLimit },
    tfsa: { name: 'TFSA', statutoryLimit: statutoryTfsaLimit },
    fhsa: { name: 'FHSA', statutoryLimit: statutoryFhsaLimit },
    nonReg: { name: 'Non-Registered', statutoryLimit: statutoryNonRegLimit }
  };

  let remainingSurplusToAllocate = Math.max(0, netCashFlowSurplusAnnual);
  const waterfallAllocations: Record<ContributionPriorityAccount, AccountAllocationDetail> = {} as any;

  priorityOrder.forEach((accKey, index) => {
    const meta = accountMeta[accKey];
    const overwrite = customCaps[accKey];
    const isCustom = Boolean(overwrite && overwrite.enabled && overwrite.maxAmount >= 0);
    const customCap = isCustom ? overwrite!.maxAmount : undefined;
    
    // Overall account ceiling (user custom overwrite or CRA statutory limit)
    const totalAccountCap = isCustom ? customCap! : meta.statutoryLimit;

    let employerMatchPortion = 0;
    let effectiveEmployeeCap = totalAccountCap;

    if (accKey === 'rrsp' && inputs.employerMatch?.enabled) {
      if (inputs.employerMatch.matchType === 'fixed_dollar') {
        employerMatchPortion = Math.min(totalAccountCap, Math.max(0, inputs.employerMatch.fixedAnnualAmount || 0));
      } else if (inputs.employerMatch.matchType === 'percent_of_contribution') {
        const rate = (inputs.employerMatch.matchRatePercent ?? 50) / 100;
        const maxSalaryCap = inputs.currentAnnualIncome > 0
          ? inputs.currentAnnualIncome * ((inputs.employerMatch.matchPercentOfSalary ?? 6) / 100)
          : Infinity;
        // Total addition = employee + min(employee * rate, maxSalaryCap) <= totalAccountCap
        const employeeCapNoSalary = totalAccountCap / (1 + rate);
        const employeeCapWithSalary = Math.max(0, totalAccountCap - maxSalaryCap);
        const maxEmployee = Math.max(0, Math.min(employeeCapNoSalary, employeeCapWithSalary));
        employerMatchPortion = Math.min(totalAccountCap, Math.min(maxEmployee * rate, maxSalaryCap));
      } else {
        // Default: percent_of_salary
        const matchPercent = (inputs.employerMatch.matchPercentOfSalary ?? 4) / 100;
        const matchRate = (inputs.employerMatch.matchRatePercent ?? 100) / 100;
        const maxSalaryMatch = inputs.currentAnnualIncome * matchPercent * matchRate;
        employerMatchPortion = Math.min(totalAccountCap, Math.round(maxSalaryMatch));
      }

      // CRA Rule: Employer group RRSP/DPSP contributions consume the employee's statutory RRSP room.
      // Employee out-of-pocket paycheck contribution is capped at total cap minus employer match.
      effectiveEmployeeCap = Math.max(0, totalAccountCap - employerMatchPortion);
    }

    // Allocate up to effective employee cap from available cash flow surplus
    const allocated = Math.min(remainingSurplusToAllocate, effectiveEmployeeCap);
    remainingSurplusToAllocate -= allocated;

    // Actual match triggered by this allocated employee contribution
    let actualMatch = 0;
    if (accKey === 'rrsp' && inputs.employerMatch?.enabled) {
      actualMatch = calculateEmployerRrspMatch(inputs.currentAnnualIncome, allocated, inputs.employerMatch);
      // Ensure combined additions don't exceed the total account ceiling
      if (allocated + actualMatch > totalAccountCap) {
        actualMatch = Math.max(0, totalAccountCap - allocated);
      }
    }

    const totalAddition = accKey === 'rrsp' ? allocated + actualMatch : allocated;
    const monthlyAlloc = Math.round((allocated / 12) * 100) / 100;

    let note = '';
    let remainingRoomAfter = 0;

    if (accKey === 'rrsp') {
      remainingRoomAfter = Math.max(0, totalAccountCap - totalAddition);
      const matchToShow = actualMatch > 0 ? actualMatch : employerMatchPortion;
      if (matchToShow > 0) {
        const monthlyEmployeeCap = (effectiveEmployeeCap / 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        note = `CRA limit: $${totalAccountCap.toLocaleString()}/yr. Employer match ($${matchToShow.toLocaleString()}/yr) consumes room, leaving $${effectiveEmployeeCap.toLocaleString()}/yr ($${monthlyEmployeeCap}/mo) for employee paycheck contributions.`;
      } else {
        note = isCustom 
          ? `Custom cap applied ($${customCap?.toLocaleString()}/yr).`
          : `18% earned income CRA room ($${meta.statutoryLimit.toLocaleString()}/yr).`;
      }
    } else if (accKey === 'tfsa') {
      remainingRoomAfter = Math.max(0, meta.statutoryLimit - allocated);
      note = isCustom 
        ? `Custom cap applied ($${customCap?.toLocaleString()}/yr).`
        : `CRA annual statutory limit ($${TFSA_ANNUAL_LIMIT.toLocaleString()}/yr).`;
    } else if (accKey === 'fhsa') {
      remainingRoomAfter = Math.max(0, fhsaRemaining - allocated);
      note = isCustom
        ? `Custom cap applied ($${customCap?.toLocaleString()}/yr).`
        : `CRA $8k annual cap with $${fhsaRemaining.toLocaleString()} remaining lifetime room.`;
    } else {
      remainingRoomAfter = Infinity;
      note = 'Unlimited capacity. Catches all residual surplus cash flow.';
    }

    const isCapped = accKey === 'rrsp'
      ? (totalAddition >= totalAccountCap && totalAccountCap < Infinity) || (allocated >= effectiveEmployeeCap && effectiveEmployeeCap < Infinity)
      : (allocated >= effectiveEmployeeCap && effectiveEmployeeCap < Infinity);

    waterfallAllocations[accKey] = {
      account: accKey,
      name: meta.name,
      rank: index + 1,
      statutoryLimit: meta.statutoryLimit,
      customCap,
      effectiveCap: effectiveEmployeeCap,
      totalStatutoryRoom: totalAccountCap,
      employerMatchAmount: accKey === 'rrsp' ? (actualMatch > 0 ? actualMatch : employerMatchPortion) : 0,
      totalAdditionAmount: Math.round(totalAddition),
      allocatedAmount: Math.round(allocated),
      monthlyAmount: monthlyAlloc,
      isCapped,
      remainingRoomAfterAllocation: remainingRoomAfter,
      note
    };
  });

  const totalWaterfallAllocatedAnnual = Object.values(waterfallAllocations).reduce(
    (sum, a) => sum + a.allocatedAmount,
    0
  );

  return {
    primaryIncome,
    spouseIncome,
    householdGrossAnnual,
    householdGrossMonthly,
    householdNetInHandAnnual,
    householdNetInHandMonthly,
    annualLivingExpenses,
    monthlyLivingExpenses,
    annualDebtPayments,
    monthlyDebtPayments,
    totalAnnualExpenses,
    totalMonthlyExpenses,
    netCashFlowSurplusAnnual,
    netCashFlowSurplusMonthly,
    currentPlannedContributionsAnnual,
    currentPlannedContributionsMonthly,
    primaryEmployerMatch,
    spouseEmployerMatch,
    totalEmployerMatchAnnual,
    totalEmployerMatchMonthly,
    totalPlannedWithMatchAnnual,
    totalPlannedWithMatchMonthly,
    status,
    deficitAmountAnnual: Math.round(deficitAmountAnnual),
    deficitAmountMonthly: Math.round(deficitAmountAnnual / 12),
    surplusBufferAnnual: Math.round(surplusBufferAnnual),
    surplusBufferMonthly: Math.round(surplusBufferAnnual / 12),
    coverageRatio,
    priorityOrder,
    waterfallAllocations,
    totalWaterfallAllocatedAnnual,
    totalWaterfallAllocatedMonthly: Math.round(totalWaterfallAllocatedAnnual / 12),
    unallocatedSurplusAnnual: Math.max(0, Math.round(remainingSurplusToAllocate))
  };
}
