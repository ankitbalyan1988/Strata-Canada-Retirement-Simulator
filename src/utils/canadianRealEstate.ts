import { CanadianProvince, RealEstateInputs, PropertyType } from '../types/retirement';

export interface LandTransferTaxBreakdown {
  provincialTax: number;
  municipalTax: number;
  provincialRebate: number;
  municipalRebate: number;
  totalTaxBeforeRebates: number;
  totalRebates: number;
  netLandTransferTax: number;
  notes: string[];
}

export interface CanadianMunicipalityOption {
  id: string;
  name: string;
  province: CanadianProvince;
  description: string;
}

export const CANADIAN_MUNICIPALITIES: CanadianMunicipalityOption[] = [
  { id: 'toronto', name: 'City of Toronto', province: 'ON', description: 'Subject to Ontario PLTT + Toronto Municipal MLTT (with FTHB rebates)' },
  { id: 'other_ontario', name: 'Rest of Ontario (GTA / Ottawa / Hamilton / etc.)', province: 'ON', description: 'Subject to Ontario PLTT only (up to $4,000 FTHB rebate)' },
  { id: 'vancouver', name: 'Metro Vancouver / BC', province: 'BC', description: 'Subject to BC Property Transfer Tax (FTHB exemption up to $860k)' },
  { id: 'montreal', name: 'Montreal / Quebec', province: 'QC', description: 'Subject to Quebec Land Transfer Tax (Welcome Tax / Droits de mutation)' },
  { id: 'calgary_edmonton', name: 'Calgary / Edmonton / Alberta', province: 'AB', description: 'Land Titles Transfer Fee ($50 base + $2 per $5,000)' },
  { id: 'winnipeg', name: 'Winnipeg / Manitoba', province: 'MB', description: 'Manitoba Land Transfer Tax' },
  { id: 'halifax', name: 'Halifax / Nova Scotia', province: 'NS', description: 'Deed Transfer Tax (typically 1.5%)' },
  { id: 'other', name: 'Other Canadian Municipality', province: 'ON', description: 'Standard provincial land transfer tax schedule' }
];

/**
 * Calculates Canadian Land Transfer Tax (PLTT + Toronto MLTT) with First-Time Home Buyer (FTHB) rebates
 */
export function calculateCanadianLandTransferTax(
  purchasePrice: number,
  province: CanadianProvince = 'ON',
  isFirstTimeHomeBuyer: boolean = true,
  cityOrMunicipality: string = 'other_ontario'
): LandTransferTaxBreakdown {
  if (purchasePrice <= 0) {
    return {
      provincialTax: 0,
      municipalTax: 0,
      provincialRebate: 0,
      municipalRebate: 0,
      totalTaxBeforeRebates: 0,
      totalRebates: 0,
      netLandTransferTax: 0,
      notes: []
    };
  }

  let provincialTax = 0;
  let municipalTax = 0;
  let provincialRebate = 0;
  let municipalRebate = 0;
  const notes: string[] = [];

  const isToronto = province === 'ON' && (cityOrMunicipality === 'toronto' || cityOrMunicipality === 'City of Toronto');

  if (province === 'ON') {
    // Ontario Provincial Land Transfer Tax (PLTT)
    // Up to $55,000: 0.5%
    // $55,000 to $250,000: 1.0%
    // $250,000 to $400,000: 1.5%
    // $400,000 to $2,000,000: 2.0%
    // Over $2,000,000: 2.5%
    if (purchasePrice <= 55000) {
      provincialTax = purchasePrice * 0.005;
    } else if (purchasePrice <= 250000) {
      provincialTax = 55000 * 0.005 + (purchasePrice - 55000) * 0.01;
    } else if (purchasePrice <= 400000) {
      provincialTax = 55000 * 0.005 + 195000 * 0.01 + (purchasePrice - 250000) * 0.015;
    } else if (purchasePrice <= 2000000) {
      provincialTax = 55000 * 0.005 + 195000 * 0.01 + 150000 * 0.015 + (purchasePrice - 400000) * 0.02;
    } else {
      provincialTax = 55000 * 0.005 + 195000 * 0.01 + 150000 * 0.015 + 1600000 * 0.02 + (purchasePrice - 2000000) * 0.025;
    }

    if (isFirstTimeHomeBuyer) {
      // Ontario FTHB maximum rebate is $4,000
      provincialRebate = Math.min(provincialTax, 4000);
      notes.push(`Ontario FTHB Rebate applied: -$${Math.round(provincialRebate).toLocaleString()} (max $4,000).`);
    }

    // Toronto Municipal Land Transfer Tax (MLTT)
    if (isToronto) {
      if (purchasePrice <= 55000) {
        municipalTax = purchasePrice * 0.005;
      } else if (purchasePrice <= 250000) {
        municipalTax = 55000 * 0.005 + (purchasePrice - 55000) * 0.01;
      } else if (purchasePrice <= 400000) {
        municipalTax = 55000 * 0.005 + 195000 * 0.01 + (purchasePrice - 250000) * 0.015;
      } else if (purchasePrice <= 2000000) {
        municipalTax = 55000 * 0.005 + 195000 * 0.01 + 150000 * 0.015 + (purchasePrice - 400000) * 0.02;
      } else {
        municipalTax = 55000 * 0.005 + 195000 * 0.01 + 150000 * 0.015 + 1600000 * 0.02 + (purchasePrice - 2000000) * 0.025;
      }

      if (isFirstTimeHomeBuyer) {
        // Toronto MLTT FTHB maximum rebate is $4,475
        municipalRebate = Math.min(municipalTax, 4475);
        notes.push(`Toronto Municipal FTHB Rebate applied: -$${Math.round(municipalRebate).toLocaleString()} (max $4,475).`);
      }
    }
  } else if (province === 'BC') {
    // British Columbia Property Transfer Tax (PTT)
    // 1% on first $200k, 2% from $200k to $2M, 3% from $2M to $3M, 5% over $3M
    if (purchasePrice <= 200000) {
      provincialTax = purchasePrice * 0.01;
    } else if (purchasePrice <= 2000000) {
      provincialTax = 200000 * 0.01 + (purchasePrice - 200000) * 0.02;
    } else if (purchasePrice <= 3000000) {
      provincialTax = 200000 * 0.01 + 1800000 * 0.02 + (purchasePrice - 2000000) * 0.03;
    } else {
      provincialTax = 200000 * 0.01 + 1800000 * 0.02 + 1000000 * 0.03 + (purchasePrice - 3000000) * 0.05;
    }

    if (isFirstTimeHomeBuyer) {
      // BC FTHB exemption threshold: full exemption up to $835,000, partial phase-out up to $860,000
      if (purchasePrice <= 835000) {
        provincialRebate = provincialTax;
        notes.push(`BC FTHB Exemption applied: 100% exempt (under $835k limit).`);
      } else if (purchasePrice < 860000) {
        const exemptRatio = (860000 - purchasePrice) / 25000;
        provincialRebate = provincialTax * Math.max(0, Math.min(1, exemptRatio));
        notes.push(`BC FTHB Partial Phase-out Exemption applied: -$${Math.round(provincialRebate).toLocaleString()}.`);
      }
    }
  } else if (province === 'QC') {
    // Quebec Welcome Tax (Droits de mutation)
    // 0.5% up to $58,900; 1.0% to $294,600; 1.5% to $500,000; 2.0% to $1M; 2.5% over $1M
    if (purchasePrice <= 58900) {
      provincialTax = purchasePrice * 0.005;
    } else if (purchasePrice <= 294600) {
      provincialTax = 58900 * 0.005 + (purchasePrice - 58900) * 0.01;
    } else if (purchasePrice <= 500000) {
      provincialTax = 58900 * 0.005 + 235700 * 0.01 + (purchasePrice - 294600) * 0.015;
    } else if (purchasePrice <= 1000000) {
      provincialTax = 58900 * 0.005 + 235700 * 0.01 + 205400 * 0.015 + (purchasePrice - 500000) * 0.02;
    } else {
      provincialTax = 58900 * 0.005 + 235700 * 0.01 + 205400 * 0.015 + 500000 * 0.02 + (purchasePrice - 1000000) * 0.025;
    }
  } else if (province === 'AB' || province === 'SK') {
    // Alberta & Saskatchewan: Nominal Land Titles & Transfer Registration fees (~$50 + $2 per $5,000)
    provincialTax = Math.min(2500, Math.max(300, 100 + (purchasePrice / 5000) * 3));
    notes.push(`Land Titles Registration fee: $${Math.round(provincialTax).toLocaleString()}`);
  } else if (province === 'MB') {
    // Manitoba Land Transfer Tax: $0 on first $30k; 0.5% to $90k; 1% to $150k; 1.5% to $200k; 2% over $200k
    if (purchasePrice <= 30000) {
      provincialTax = 0;
    } else if (purchasePrice <= 90000) {
      provincialTax = (purchasePrice - 30000) * 0.005;
    } else if (purchasePrice <= 150000) {
      provincialTax = 60000 * 0.005 + (purchasePrice - 90000) * 0.01;
    } else if (purchasePrice <= 200000) {
      provincialTax = 60000 * 0.005 + 60000 * 0.01 + (purchasePrice - 150000) * 0.015;
    } else {
      provincialTax = 60000 * 0.005 + 60000 * 0.01 + 50000 * 0.015 + (purchasePrice - 200000) * 0.02;
    }
  } else {
    // Other provinces (NS, NB, PE, NL): ~1.2% - 1.5% deed transfer average
    provincialTax = purchasePrice * 0.0125;
  }

  const totalTaxBeforeRebates = Math.round(provincialTax + municipalTax);
  const totalRebates = Math.round(provincialRebate + municipalRebate);
  const netLandTransferTax = Math.max(0, totalTaxBeforeRebates - totalRebates);

  return {
    provincialTax: Math.round(provincialTax),
    municipalTax: Math.round(municipalTax),
    provincialRebate: Math.round(provincialRebate),
    municipalRebate: Math.round(municipalRebate),
    totalTaxBeforeRebates,
    totalRebates,
    netLandTransferTax,
    notes
  };
}

/**
 * Calculates ongoing property taxes based on home value (or explicit override)
 */
export function calculatePropertyTax(
  homeValue: number,
  annualRatePercent: number = 0.522, // 0.522% yields ~$326/mo for $750k matching Realtor.ca
  monthlyOverride?: number
): { annualPropertyTax: number; monthlyPropertyTax: number } {
  if (typeof monthlyOverride === 'number' && monthlyOverride >= 0) {
    return {
      monthlyPropertyTax: Math.round(monthlyOverride),
      annualPropertyTax: Math.round(monthlyOverride * 12)
    };
  }

  const effectiveRate = Math.max(0, annualRatePercent) / 100;
  const annual = Math.round(homeValue * effectiveRate);
  const monthly = Math.round(annual / 12);

  return {
    annualPropertyTax: annual,
    monthlyPropertyTax: monthly
  };
}

/**
 * Calculates ongoing condo / strata fees
 * If property is a condo, fees are estimated as square footage * rate per sq ft (default ~700 sq ft @ $0.55 = $385/mo)
 */
export function calculateCondoFees(
  propertyType: PropertyType = 'freehold',
  squareFootage: number = 700,
  feePerSqFt: number = 0.55,
  monthlyOverride?: number
): { annualCondoFees: number; monthlyCondoFee: number } {
  if (propertyType !== 'condo') {
    return {
      annualCondoFees: 0,
      monthlyCondoFee: 0
    };
  }

  if (typeof monthlyOverride === 'number' && monthlyOverride >= 0) {
    return {
      monthlyCondoFee: Math.round(monthlyOverride),
      annualCondoFees: Math.round(monthlyOverride * 12)
    };
  }

  const monthly = Math.round(Math.max(0, squareFootage) * Math.max(0, feePerSqFt));
  return {
    monthlyCondoFee: monthly,
    annualCondoFees: monthly * 12
  };
}

export interface EstimatedCashNeededToBuyBreakdown {
  downPayment: number;
  landTransferTax: number;
  legalAndClosingFees: number;
  homeInspectionCost: number;
  otherClosingCosts: number;
  taxOnMortgageInsurance: number;
  potentialRebates: number;
  totalClosingCosts: number;
  totalCashNeededToBuy: number;
  isHighRatioMortgage: boolean;
}

export interface RealtorMonthlyCostProjection {
  homePrice: number;
  downPayment: number;
  downPaymentPercent: number;
  loanPrincipal: number;
  interestRate: number;
  amortizationYears: number;
  mortgageMonthly: number;
  propertyTaxMonthly: number;
  condoFeeMonthly: number;
  otherOwnershipCostsMonthly: number;
  totalMonthlyHousingPayment: number;
  oneTimeLandTransferTax: number;
  landTransferBreakdown: LandTransferTaxBreakdown;
  estimatedCashNeeded: EstimatedCashNeededToBuyBreakdown;
  propertyType: PropertyType;
  isFirstTimeHomeBuyer: boolean;
}

/**
 * Calculates full Realtor.ca-style "Estimated cash needed to buy" closing costs & down payment breakdown
 */
export function calculateEstimatedCashNeededToBuy(
  re?: RealEstateInputs,
  province: CanadianProvince = 'ON',
  isFuture: boolean = false,
  customHomePrice?: number,
  customDownPayment?: number
): EstimatedCashNeededToBuyBreakdown {
  const homePrice = customHomePrice ?? (re?.costOfHome ?? 750000);
  const downPayment = customDownPayment ?? (re?.downPayment ?? Math.round(homePrice * 0.20));
  const downPaymentPercent = homePrice > 0 ? (downPayment / homePrice) * 100 : 20;
  const isHighRatio = downPaymentPercent < 20;

  const isFirstTime = re?.isFirstTimeHomeBuyer ?? isFuture;
  const city = re?.cityOrMunicipality ?? (province === 'ON' ? 'other_ontario' : 'other');
  const lttBreakdown = calculateCanadianLandTransferTax(homePrice, province, isFirstTime, city);
  const landTransferTax = re?.customLandTransferTax ?? lttBreakdown.netLandTransferTax;

  const legalAndClosingFees = re?.legalAndClosingFees ?? 2100;
  const homeInspectionCost = re?.homeInspectionCost ?? 0;
  const otherClosingCosts = re?.otherClosingCosts ?? 1500;

  let taxOnMortgageInsurance = re?.taxOnMortgageInsurance ?? 0;
  if (re?.taxOnMortgageInsurance === undefined || re?.taxOnMortgageInsurance === 0) {
    if (isHighRatio) {
      const loan = Math.max(0, homePrice - downPayment);
      let premiumRate = 0.04;
      if (downPaymentPercent >= 15) premiumRate = 0.028;
      else if (downPaymentPercent >= 10) premiumRate = 0.031;
      const premium = loan * premiumRate;
      let taxRate = 0;
      if (province === 'ON') taxRate = 0.08;
      else if (province === 'QC') taxRate = 0.09;
      else if (province === 'SK') taxRate = 0.06;
      taxOnMortgageInsurance = Math.round(premium * taxRate);
    } else {
      taxOnMortgageInsurance = 0;
    }
  }

  const totalClosingCosts = landTransferTax + legalAndClosingFees + homeInspectionCost + otherClosingCosts + taxOnMortgageInsurance;
  const totalCashNeededToBuy = downPayment + totalClosingCosts;

  return {
    downPayment,
    landTransferTax,
    legalAndClosingFees,
    homeInspectionCost,
    otherClosingCosts,
    taxOnMortgageInsurance,
    potentialRebates: lttBreakdown.totalRebates,
    totalClosingCosts,
    totalCashNeededToBuy,
    isHighRatioMortgage: isHighRatio
  };
}

/**
 * Calculates full Realtor.ca-style "What this home could cost monthly" breakdown
 */
export function calculateRealtorMonthlyProjection(
  re?: RealEstateInputs,
  province: CanadianProvince = 'ON',
  isFuture: boolean = false
): RealtorMonthlyCostProjection {
  const homePrice = re?.costOfHome ?? 750000;
  const downPayment = re?.downPayment ?? Math.round(homePrice * 0.20);
  const downPaymentPercent = homePrice > 0 ? Math.round((downPayment / homePrice) * 100) : 20;
  const loanPrincipal = Math.max(0, homePrice - downPayment);
  const interestRate = re?.mortgageInterestRate ?? 5.5;
  const amortizationYears = re?.mortgageTermYears ?? 25;

  // Canadian Mortgage payment math (semi-annual compounding)
  const semiAnnual = (interestRate / 100) / 2;
  const monthlyRate = interestRate > 0 ? Math.pow(1 + semiAnnual, 2 / 12) - 1 : 0;
  const totalMonths = amortizationYears * 12;

  const mortgageMonthly = (loanPrincipal > 0 && totalMonths > 0)
    ? (monthlyRate > 0
        ? Math.round((loanPrincipal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1))
        : Math.round(loanPrincipal / totalMonths))
    : 0;

  const propertyType: PropertyType = re?.propertyType ?? 'freehold';
  const isFirstTime = re?.isFirstTimeHomeBuyer ?? isFuture;
  const city = re?.cityOrMunicipality ?? (province === 'ON' ? 'other_ontario' : 'other');

  // Property Tax: default 0.522% = $326/mo on $750k (matches Realtor.ca screenshot)
  const propTaxRate = re?.annualPropertyTaxRatePercent ?? 0.522;
  const { monthlyPropertyTax } = calculatePropertyTax(homePrice, propTaxRate, re?.monthlyPropertyTaxOverride);

  // Condo fee: default 700 sq ft @ $0.55/sq ft = $385/mo
  const sqft = re?.condoSquareFootage ?? 700;
  const feeRate = re?.condoFeePerSqFt ?? 0.55;
  const { monthlyCondoFee } = calculateCondoFees(propertyType, sqft, feeRate, re?.monthlyCondoFee);

  const otherOwnershipCostsMonthly = monthlyPropertyTax + monthlyCondoFee;
  const totalMonthlyHousingPayment = mortgageMonthly + otherOwnershipCostsMonthly;

  const landTransferBreakdown = calculateCanadianLandTransferTax(homePrice, province, isFirstTime, city);
  const estimatedCashNeeded = calculateEstimatedCashNeededToBuy(re, province, isFuture);

  return {
    homePrice,
    downPayment,
    downPaymentPercent,
    loanPrincipal,
    interestRate,
    amortizationYears,
    mortgageMonthly,
    propertyTaxMonthly: monthlyPropertyTax,
    condoFeeMonthly: monthlyCondoFee,
    otherOwnershipCostsMonthly,
    totalMonthlyHousingPayment,
    oneTimeLandTransferTax: re?.customLandTransferTax ?? landTransferBreakdown.netLandTransferTax,
    landTransferBreakdown,
    estimatedCashNeeded,
    propertyType,
    isFirstTimeHomeBuyer: isFirstTime
  };
}
