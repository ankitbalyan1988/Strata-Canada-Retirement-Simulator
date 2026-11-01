import { CanadianProvince, RetirementInputs, YearSimulationResult } from '../types/retirement';
import { 
  EstatePlanningInputs, 
  EstatePlanResult, 
  EstateReservesAtDeath, 
  EstateTaxAndFeesBreakdown, 
  EstateDistributionItem, 
  EstateKeyStrategy 
} from '../types/estate';
import { calculateCanadianTax, PROVINCIAL_BRACKETS } from './canadianTax';

/**
 * Calculates Canadian Provincial Probate Fees (Estate Administration Tax).
 * Rates based on statutory provincial guidelines:
 * - Ontario: $0 on first $50,000, 1.5% ($15 per $1,000) on balance over $50,000.
 * - British Columbia: $0 on first $25,000, 0.6% on $25k-$50k, 1.4% on excess over $50,000.
 * - Alberta: Tiered flat fee, capped at $525 for estates > $250,000.
 * - Quebec: $0 on notarial wills (nominal court verification fee ~$100 on non-notarial).
 * - Manitoba: 0% (eliminated probate fees in 2020; flat $70 filing fee).
 * - Saskatchewan: 0.7% ($7.00 per $1,000).
 * - Nova Scotia: Tiered graduated rates, reaching ~1.695% over $100k.
 * - New Brunswick: ~0.5% on value over $20,000.
 * - PEI: ~0.4% on value over $10,000.
 * - Newfoundland & Labrador: $60 + 0.6% on value over $1,000.
 */
export function calculateProvincialProbate(
  grossAssetsSubjectToProbate: number, 
  province: CanadianProvince
): number {
  if (grossAssetsSubjectToProbate <= 0) return 0;
  const val = grossAssetsSubjectToProbate;

  switch (province) {
    case 'ON': // Ontario: $0 on first $50k, $15 per $1,000 thereafter
      if (val <= 50000) return 0;
      return Math.round(((val - 50000) / 1000) * 15);

    case 'BC': // British Columbia: $0 on first $25k, $6 per $1k ($25k-$50k), $14 per $1k (> $50k)
      if (val <= 25000) return 0;
      if (val <= 50000) return Math.round(((val - 25000) / 1000) * 6);
      return Math.round(150 + ((val - 50000) / 1000) * 14);

    case 'AB': // Alberta: Capped low flat fee structure
      if (val <= 10000) return 35;
      if (val <= 25000) return 135;
      if (val <= 125000) return 275;
      if (val <= 250000) return 400;
      return 525; // max $525 for estates over $250k

    case 'QC': // Quebec: $0 on notarial wills
      return 110; // nominal court verification filing fee

    case 'MB': // Manitoba: Eliminated probate in 2020
      return 70; // flat administration filing fee

    case 'SK': // Saskatchewan: $7.00 per $1,000
      return Math.round((val / 1000) * 7);

    case 'NS': // Nova Scotia: Graduated, reaches ~1.695%
      if (val <= 10000) return 85;
      if (val <= 25000) return 215;
      if (val <= 50000) return 355;
      if (val <= 100000) return 1000;
      return Math.round(1000 + ((val - 100000) / 1000) * 16.95);

    case 'NB': // New Brunswick: ~0.5% over $20k
      if (val <= 20000) return 50;
      return Math.round(50 + ((val - 20000) / 1000) * 5);

    case 'PE': // PEI: ~0.4%
      if (val <= 10000) return 50;
      return Math.round(50 + ((val - 10000) / 1000) * 4);

    case 'NL': // Newfoundland: $60 + 0.6% over $1k
      if (val <= 1000) return 60;
      return Math.round(60 + ((val - 1000) / 1000) * 6);

    default:
      return Math.round((val / 1000) * 12);
  }
}

/**
 * Top Marginal Combined (Federal + Provincial) Income Tax Rate by Province (2025/2026).
 * Used for estimating deemed disposition on large terminal RRSP/RRIF and capital gains.
 */
const TOP_MARGINAL_TAX_RATES: Record<CanadianProvince, number> = {
  ON: 0.5353, // Ontario top rate
  BC: 0.5350, // British Columbia top rate
  AB: 0.4800, // Alberta top rate
  QC: 0.5330, // Quebec top rate
  MB: 0.5040, // Manitoba top rate
  SK: 0.4750, // Saskatchewan top rate
  NS: 0.5400, // Nova Scotia top rate
  NB: 0.5250, // New Brunswick top rate
  NL: 0.5480, // Newfoundland top rate
  PE: 0.5137  // PEI top rate
};

export const DEFAULT_ESTATE_INPUTS: EstatePlanningInputs = {
  passingAge: 85,
  hasNextOfKin: true,
  kinCategory: 'spouse',
  spousalRolloverEnabled: true,
  directBeneficiariesDesignated: true,
  familyDistributionPercent: 100,
  charityShareWithKinPercent: 0,
  noKinStrategy: 'charitable_legacy',
  charityAllocationPercent: 70,
  namedFriendsAllocationPercent: 20,
  endowmentAllocationPercent: 10,
  hasValidWill: true,
  liquidateRealEstateOnDeath: false,
  realtorAndClosingPercent: 3.5,
  executorCompensationPercent: 2.0,
  estimatedFuneralCost: 10000,
  includeCppDeathBenefitOffset: true
};

/**
 * Simulates complete Canadian Estate Settlement and Liquidation Waterfall.
 */
export function calculateEstatePlan(
  inputs: EstatePlanningInputs,
  retirementInputs: RetirementInputs,
  yearlyResults: YearSimulationResult[]
): EstatePlanResult {
  const province = retirementInputs.province || 'ON';
  const passingAge = Math.max(
    yearlyResults[0].age, 
    Math.min(inputs.passingAge, yearlyResults[yearlyResults.length - 1].age)
  );

  // 1. Locate closest row in simulation ledger
  const row = yearlyResults.find(r => r.age === passingAge) || yearlyResults[yearlyResults.length - 1];
  const passingYear = row.year;

  const rrspBalance = Math.max(0, row.rrspBalance);
  const tfsaBalance = Math.max(0, row.tfsaBalance);
  const fhsaBalance = Math.max(0, row.fhsaBalance);
  const nonRegBalance = Math.max(0, row.nonRegBalance);
  const homeEquity = Math.max(0, row.realEstateShare);
  const totalGrossEstate = rrspBalance + tfsaBalance + fhsaBalance + nonRegBalance + homeEquity;
  const liquidFinancialAssets = rrspBalance + tfsaBalance + fhsaBalance + nonRegBalance;

  const reserves: EstateReservesAtDeath = {
    passingAge,
    passingYear,
    rrspBalance,
    tfsaBalance,
    fhsaBalance,
    nonRegBalance,
    homeEquity,
    totalGrossEstate,
    liquidFinancialAssets
  };

  // 2. CRA Deemed Disposition & Terminal T1 Taxes
  const topRate = TOP_MARGINAL_TAX_RATES[province] || 0.53;
  let rrspTerminalTax = 0;
  let rrspTaxSavedBySpousalRollover = 0;

  // RRSP / RRIF Terminal Tax
  const isSpousalRollover = inputs.hasNextOfKin && 
    inputs.kinCategory === 'spouse' && 
    inputs.spousalRolloverEnabled && 
    retirementInputs.maritalStatus === 'married';

  if (isSpousalRollover) {
    rrspTerminalTax = 0; // CRA s. 70(6) tax-free spousal rollover
    rrspTaxSavedBySpousalRollover = Math.round(rrspBalance * topRate * 0.90);
  } else {
    // 100% of RRSP balance taxed as ordinary terminal income on T1 return
    if (rrspBalance > 0) {
      const taxCalc = calculateCanadianTax(rrspBalance, province, passingAge, 0);
      rrspTerminalTax = Math.round(taxCalc.totalTax);
    }
  }

  // Non-Registered Capital Gains Terminal Tax
  // Assuming ~45% of non-registered account represents unrealized capital gains
  const estimatedUnrealizedGains = nonRegBalance * 0.45;
  // CRA Capital Gains inclusion: 50% inclusion rate (or 66.7% over $250k)
  const taxableCapGain = estimatedUnrealizedGains > 250000 
    ? (250000 * 0.50) + ((estimatedUnrealizedGains - 250000) * 0.667)
    : estimatedUnrealizedGains * 0.50;
  const nonRegCapitalGainsTax = Math.round(taxableCapGain * topRate);

  const totalTerminalIncomeTax = rrspTerminalTax + nonRegCapitalGainsTax;

  // 3. Provincial Probate Fees (Estate Administration Tax)
  // If direct beneficiaries designated, RRSP, TFSA, and FHSA bypass probate completely!
  let grossProbateAssets = 0;
  if (inputs.directBeneficiariesDesignated) {
    // Only non-registered investments and real estate pass through the will/estate
    grossProbateAssets = nonRegBalance + (inputs.liquidateRealEstateOnDeath ? homeEquity : (homeEquity > 0 ? homeEquity : 0));
  } else {
    // If no direct beneficiary designation, the entire gross estate is subject to probate fees!
    grossProbateAssets = totalGrossEstate;
  }

  const probateFee = calculateProvincialProbate(grossProbateAssets, province);
  const potentialTotalProbate = calculateProvincialProbate(totalGrossEstate, province);
  const probateAvoidedByBeneficiaryDesignation = Math.max(0, potentialTotalProbate - probateFee);

  // 4. Funeral Expenses & Statutory CPP Death Benefit (First-Charge Estate Debt)
  const funeralCosts = Math.max(0, inputs.estimatedFuneralCost ?? 10000);
  const cppDeathBenefit = inputs.includeCppDeathBenefitOffset ? 2500 : 0;
  const netFuneralBurden = Math.max(0, funeralCosts - cppDeathBenefit);

  // 4B. Outstanding Debts & Liabilities (Senior Claim against Estate)
  const remainingDebtAtDeath = Math.max(0, row.remainingDebt || 0);

  // 5. Real Estate Liquidation Costs & Executor Fees
  const closingAndLiquidationCosts = (inputs.liquidateRealEstateOnDeath && homeEquity > 0)
    ? Math.round(homeEquity * (inputs.realtorAndClosingPercent / 100))
    : 0;

  const executorCompensation = Math.round(
    Math.max(0, totalGrossEstate - closingAndLiquidationCosts - netFuneralBurden - remainingDebtAtDeath) * (inputs.executorCompensationPercent / 100)
  );

  // 6. Charitable Donations & Canadian Tax Shielding
  let charitableDonationAmount = 0;

  if (inputs.hasNextOfKin) {
    if (inputs.kinCategory === 'family_charity_split' && inputs.charityShareWithKinPercent > 0) {
      charitableDonationAmount = Math.round(
        Math.max(0, totalGrossEstate - closingAndLiquidationCosts - executorCompensation - netFuneralBurden - remainingDebtAtDeath) * 
        (inputs.charityShareWithKinPercent / 100)
      );
    }
  } else {
    // No Next of Kin
    if (inputs.hasValidWill) {
      charitableDonationAmount = Math.round(
        Math.max(0, totalGrossEstate - closingAndLiquidationCosts - executorCompensation - netFuneralBurden - remainingDebtAtDeath) * 
        (inputs.charityAllocationPercent / 100)
      );
    }
  }

  // Under CRA rules, donations in year of death offset up to 100% of terminal net income
  // Combined Federal + Provincial Donation Tax Credit is ~50% to 54%
  const charitableTaxCredit = Math.min(
    totalTerminalIncomeTax, 
    Math.round(charitableDonationAmount * (topRate * 0.95))
  );

  const netIncomeTaxAfterCredits = Math.max(0, totalTerminalIncomeTax - charitableTaxCredit);

  const totalEstateDeductions = netIncomeTaxAfterCredits + 
    probateFee + 
    closingAndLiquidationCosts + 
    executorCompensation +
    netFuneralBurden +
    remainingDebtAtDeath;

  const netEstateRemaining = Math.max(0, totalGrossEstate - totalEstateDeductions);

  const taxEfficiencyScore = totalGrossEstate > 0 
    ? Math.min(100, Math.max(0, Math.round(((totalGrossEstate - totalEstateDeductions) / totalGrossEstate) * 100)))
    : 100;

  const taxAndFees: EstateTaxAndFeesBreakdown = {
    rrspTerminalTax,
    nonRegCapitalGainsTax,
    totalTerminalIncomeTax,
    effectiveTerminalTaxRate: totalGrossEstate > 0 ? (totalTerminalIncomeTax / totalGrossEstate) * 100 : 0,
    grossProbateAssets,
    probateFee,
    probateAvoidedByBeneficiaryDesignation,
    closingAndLiquidationCosts,
    executorCompensation,
    funeralCosts,
    cppDeathBenefit,
    netFuneralBurden,
    charitableDonationAmount,
    charitableTaxCredit,
    netIncomeTaxAfterCredits,
    totalEstateDeductions,
    netEstateRemaining,
    taxEfficiencyScore
  };

  // 6. Generate Distribution Items
  const distributions: EstateDistributionItem[] = [];

  // A. Taxes to Canada Revenue Agency
  if (netIncomeTaxAfterCredits > 0) {
    distributions.push({
      id: 'tax_cra',
      recipient: 'Canada Revenue Agency (CRA)',
      category: 'taxes',
      amount: netIncomeTaxAfterCredits,
      percentOfGross: totalGrossEstate > 0 ? (netIncomeTaxAfterCredits / totalGrossEstate) * 100 : 0,
      percentOfNet: 0,
      taxStatus: 'Terminal T1 Liability',
      notes: isSpousalRollover 
        ? 'Capital gains deemed disposition on non-reg accounts (RRSP deferred via spousal rollover).'
        : `Deemed disposition tax on RRSP/RRIF ($${Math.round(rrspBalance).toLocaleString()}) + non-reg capital gains.`
    });
  }

  // B. Provincial Probate
  if (probateFee > 0) {
    distributions.push({
      id: 'probate_court',
      recipient: `Provincial Court (${province})`,
      category: 'probate',
      amount: probateFee,
      percentOfGross: totalGrossEstate > 0 ? (probateFee / totalGrossEstate) * 100 : 0,
      percentOfNet: 0,
      taxStatus: 'Estate Administration Tax',
      notes: inputs.directBeneficiariesDesignated 
        ? 'Reduced fee: RRSP, TFSA, and FHSA bypassed probate via direct beneficiary designations.'
        : 'Assessed on full gross estate because direct beneficiary designations were not utilized.'
    });
  }

  // C. Funeral & Final Arrangements (First-Charge Estate Debt)
  if (netFuneralBurden > 0) {
    distributions.push({
      id: 'funeral_expenses',
      recipient: 'Funeral & Burial/Cremation Services',
      category: 'funeral',
      amount: netFuneralBurden,
      percentOfGross: totalGrossEstate > 0 ? (netFuneralBurden / totalGrossEstate) * 100 : 0,
      percentOfNet: 0,
      taxStatus: 'First-Charge Priority Debt',
      notes: inputs.includeCppDeathBenefitOffset
        ? `Gross funeral cost: $${Math.round(funeralCosts).toLocaleString()} offset by $2,500 Canadian CPP Death Benefit. Priority debt settled before beneficiary distribution.`
        : `Gross funeral cost: $${Math.round(funeralCosts).toLocaleString()}. First-charge estate debt settled before beneficiary distribution.`
    });
  }

  // D. Settlement & Executor
  if (closingAndLiquidationCosts + executorCompensation > 0) {
    distributions.push({
      id: 'settlement_costs',
      recipient: 'Estate Legal, Realtor & Executor Tariff',
      category: 'probate',
      amount: closingAndLiquidationCosts + executorCompensation,
      percentOfGross: totalGrossEstate > 0 ? ((closingAndLiquidationCosts + executorCompensation) / totalGrossEstate) * 100 : 0,
      percentOfNet: 0,
      taxStatus: 'Estate Administration',
      notes: `Executor tariff (${inputs.executorCompensationPercent}%)${closingAndLiquidationCosts > 0 ? ` + real estate liquidation closing (${inputs.realtorAndClosingPercent}%)` : ''}.`
    });
  }

  // D2. Outstanding Consumer Debts & Loan Liabilities
  if (remainingDebtAtDeath > 0) {
    distributions.push({
      id: 'debt_settlement',
      recipient: 'Creditors & Lenders (Outstanding Debts)',
      category: 'debt',
      amount: remainingDebtAtDeath,
      percentOfGross: totalGrossEstate > 0 ? (remainingDebtAtDeath / totalGrossEstate) * 100 : 0,
      percentOfNet: 0,
      taxStatus: 'Estate Liability Settlement',
      notes: 'Settlement of remaining non-mortgage loans and lines of credit as required by Canadian estate law.'
    });
  }

  // E. Distribution to Beneficiaries / Charities / Heirs
  if (inputs.hasNextOfKin) {
    // Next of Kin Flow
    if (inputs.kinCategory === 'spouse') {
      const spouseAmount = netEstateRemaining - charitableDonationAmount;
      distributions.push({
        id: 'dist_spouse',
        recipient: retirementInputs.spouse?.name || 'Surviving Spouse / Partner',
        category: 'spouse',
        amount: spouseAmount,
        percentOfGross: totalGrossEstate > 0 ? (spouseAmount / totalGrossEstate) * 100 : 0,
        percentOfNet: netEstateRemaining > 0 ? (spouseAmount / netEstateRemaining) * 100 : 0,
        taxStatus: isSpousalRollover ? '100% Tax-Deferred Rollover' : 'Direct Inheritance',
        notes: isSpousalRollover 
          ? 'Receives RRSP as spousal rollover (T2019) and TFSA as Successor Annuitant with 0% tax hit.'
          : 'Receives net estate after terminal T1 tax settlement.'
      });
    } else if (inputs.kinCategory === 'children') {
      distributions.push({
        id: 'dist_children',
        recipient: 'Children & Family Heirs',
        category: 'children',
        amount: netEstateRemaining,
        percentOfGross: totalGrossEstate > 0 ? (netEstateRemaining / totalGrossEstate) * 100 : 0,
        percentOfNet: 100,
        taxStatus: 'Direct Cash / Asset Transfer',
        notes: 'Net liquid assets distributed equally or as designated in Canadian Will.'
      });
    } else {
      // Split with charity
      const familyShare = netEstateRemaining - charitableDonationAmount;
      distributions.push({
        id: 'dist_family_split',
        recipient: 'Family Heirs',
        category: 'children',
        amount: familyShare,
        percentOfGross: totalGrossEstate > 0 ? (familyShare / totalGrossEstate) * 100 : 0,
        percentOfNet: netEstateRemaining > 0 ? (familyShare / netEstateRemaining) * 100 : 0,
        taxStatus: 'Direct Inheritance',
        notes: `${100 - inputs.charityShareWithKinPercent}% of net estate allocated to family.`
      });

      if (charitableDonationAmount > 0) {
        distributions.push({
          id: 'dist_charity_split',
          recipient: 'Registered Canadian Charities',
          category: 'charity',
          amount: charitableDonationAmount,
          percentOfGross: totalGrossEstate > 0 ? (charitableDonationAmount / totalGrossEstate) * 100 : 0,
          percentOfNet: netEstateRemaining > 0 ? (charitableDonationAmount / netEstateRemaining) * 100 : 0,
          taxStatus: 'Charitable Tax Credited',
          notes: `Generates $${Math.round(charitableTaxCredit).toLocaleString()} donation tax credit shielding family from terminal taxes.`
        });
      }
    }
  } else {
    // NO NEXT OF KIN FLOW
    if (!inputs.hasValidWill) {
      // Intestate escheat to Crown!
      distributions.push({
        id: 'dist_escheat',
        recipient: `Escheat to Provincial Crown (${province})`,
        category: 'crown',
        amount: netEstateRemaining,
        percentOfGross: totalGrossEstate > 0 ? (netEstateRemaining / totalGrossEstate) * 100 : 0,
        percentOfNet: 100,
        taxStatus: 'Intestate Escheat',
        notes: 'CRITICAL ALERT: Under Canadian succession law (Escheats Act), with no next of kin and no valid will, all net assets forfeit 100% to the provincial government.'
      });
    } else {
      // Will is valid: distribute by percentages
      const distPool = netEstateRemaining;

      if (inputs.charityAllocationPercent > 0) {
        const amt = Math.round(distPool * (inputs.charityAllocationPercent / 100));
        distributions.push({
          id: 'dist_no_kin_charity',
          recipient: 'Registered Canadian Charities / Foundations',
          category: 'charity',
          amount: amt,
          percentOfGross: totalGrossEstate > 0 ? (amt / totalGrossEstate) * 100 : 0,
          percentOfNet: inputs.charityAllocationPercent,
          taxStatus: 'Charitable Donation Tax Credit',
          notes: `Offsets terminal income taxes while establishing your philanthropic legacy.`
        });
      }

      if (inputs.namedFriendsAllocationPercent > 0) {
        const amt = Math.round(distPool * (inputs.namedFriendsAllocationPercent / 100));
        distributions.push({
          id: 'dist_no_kin_friends',
          recipient: 'Named Friends, Caregivers & Chosen Heirs',
          category: 'friends',
          amount: amt,
          percentOfGross: totalGrossEstate > 0 ? (amt / totalGrossEstate) * 100 : 0,
          percentOfNet: inputs.namedFriendsAllocationPercent,
          taxStatus: 'Bequest Under Will',
          notes: 'Distributed as specific or residual bequests to designated non-relative beneficiaries.'
        });
      }

      if (inputs.endowmentAllocationPercent > 0) {
        const amt = Math.round(distPool * (inputs.endowmentAllocationPercent / 100));
        distributions.push({
          id: 'dist_no_kin_endowment',
          recipient: 'Testamentary Endowment / Donor-Advised Fund (DAF)',
          category: 'endowment',
          amount: amt,
          percentOfGross: totalGrossEstate > 0 ? (amt / totalGrossEstate) * 100 : 0,
          percentOfNet: inputs.endowmentAllocationPercent,
          taxStatus: 'Perpetual Philanthropic Fund',
          notes: 'Generates annual grants in perpetuity for causes, universities, or community trusts.'
        });
      }
    }
  }

  // 7. Key Strategies & Actionable Intelligence
  const keyStrategies: EstateKeyStrategy[] = [];

  // Strategy 1: Spousal Rollover
  if (inputs.hasNextOfKin && inputs.kinCategory === 'spouse') {
    if (inputs.spousalRolloverEnabled) {
      keyStrategies.push({
        title: 'CRA Section 70(6) Spousal Rollover Active',
        description: `Rolling your RRSP/RRIF ($${Math.round(rrspBalance).toLocaleString()}) and TFSA directly into your surviving spouse's accounts defers 100% of immediate deemed disposition taxes.`,
        taxSavedOrBenefit: rrspTaxSavedBySpousalRollover,
        badge: 'Tax Deferral',
        type: 'success'
      });
    } else {
      keyStrategies.push({
        title: 'Spousal Rollover Disabled',
        description: `Without a spousal rollover, your entire RRSP balance ($${Math.round(rrspBalance).toLocaleString()}) will be treated as income on your final terminal return at top rates.`,
        taxSavedOrBenefit: 0,
        badge: 'Heavy Tax Risk',
        type: 'warning'
      });
    }
  }

  // Strategy 2: Direct Beneficiary Designation
  if (inputs.directBeneficiariesDesignated) {
    keyStrategies.push({
      title: 'Probate Bypass via Designated Beneficiaries',
      description: `Direct beneficiary designations on RRSP/RRIF, TFSA, and FHSA allow $${Math.round(rrspBalance + tfsaBalance + fhsaBalance).toLocaleString()} in registered capital to transfer privately without court probate delays.`,
      taxSavedOrBenefit: probateAvoidedByBeneficiaryDesignation,
      badge: 'Probate Avoided',
      type: 'success'
    });
  } else {
    keyStrategies.push({
      title: 'Assets Flowing Through Estate / Will',
      description: `Without named direct beneficiaries, registered accounts pass through your Estate, subjecting them to provincial probate fees (${province}: $${Math.round(probateFee).toLocaleString()}) and public record disclosure.`,
      taxSavedOrBenefit: 0,
      badge: 'Probate Incurred',
      type: 'info'
    });
  }

  // Strategy 3: Charitable Tax Shielding (Crucial for No Next of Kin or Philanthropy)
  if (charitableDonationAmount > 0) {
    keyStrategies.push({
      title: 'Charitable Tax Elimination Shield',
      description: `Your bequest of $${Math.round(charitableDonationAmount).toLocaleString()} generates an estimated $${Math.round(charitableTaxCredit).toLocaleString()} CRA donation credit, turning what would have been tax checks to the government into lasting social impact.`,
      taxSavedOrBenefit: charitableTaxCredit,
      badge: 'Tax Converted',
      type: 'success'
    });
  } else if (!inputs.hasNextOfKin) {
    keyStrategies.push({
      title: 'Zero Next-of-Kin Tax Planning Alert',
      description: `Because you have no surviving spouse, 100% of your remaining RRSP/RRIF will be taxed at the top Canadian bracket (${(topRate * 100).toFixed(1)}%). Directing even 30–50% to registered Canadian charities can completely eliminate this tax.`,
      taxSavedOrBenefit: Math.round(rrspTerminalTax * 0.70),
      badge: 'Tax Opportunity',
      type: 'info'
    });
  }

  // Strategy 4: Intestate Escheat Warning
  if (!inputs.hasNextOfKin && !inputs.hasValidWill) {
    keyStrategies.push({
      title: 'URGENT: Risk of Escheat to Provincial Crown',
      description: `Under Canadian succession law, an individual who dies intestate (without a will) and with no legal next of kin has their entire estate forfeit to the provincial government. Creating a valid legal will is essential.`,
      taxSavedOrBenefit: 0,
      badge: 'Critical Legal Risk',
      type: 'warning'
    });
  }

  // Strategy 5: Funeral Expenses & Statutory CPP Death Benefit
  if (funeralCosts > 0) {
    keyStrategies.push({
      title: 'Funeral Arrangements & $2,500 CPP Death Benefit',
      description: `Under Canadian law, funeral and burial expenses ($${Math.round(funeralCosts).toLocaleString()}) are a first-charge debt payable before heirs or charities inherit.${inputs.includeCppDeathBenefitOffset ? ` The statutory $2,500 Canadian CPP Death Benefit offsets this cost, resulting in a net estate burden of $${Math.round(netFuneralBurden).toLocaleString()}.` : ' Claiming the $2,500 statutory CPP Death Benefit will reduce this estate burden.'}`,
      taxSavedOrBenefit: cppDeathBenefit,
      badge: inputs.includeCppDeathBenefitOffset ? 'CPP $2,500 Offset' : 'Estate Priority Debt',
      type: 'info'
    });
  }

  return {
    inputs,
    province,
    reserves,
    taxAndFees,
    distributions,
    keyStrategies
  };
}
