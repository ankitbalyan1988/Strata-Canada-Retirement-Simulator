import { RetirementInputs, YearSimulationResult, SimulationSummary } from '../types/retirement';
import { 
  ExpatInputs, 
  ExpatDestinationCountry, 
  ExpatYearResult, 
  ExpatSimulationSummary 
} from '../types/expat';
import { EXPAT_DESTINATIONS, DEFAULT_EXPAT_INPUTS } from './expatCountries';

export function calculateExpatRetirementPlan(
  expatInputs: ExpatInputs = DEFAULT_EXPAT_INPUTS,
  retirementInputs: RetirementInputs,
  yearlyResults: YearSimulationResult[],
  summary: SimulationSummary
): ExpatSimulationSummary {
  const destination = EXPAT_DESTINATIONS.find(d => d.id === expatInputs.destinationCountryId) || EXPAT_DESTINATIONS[0];
  const exchangeRate = expatInputs.customExchangeRate || destination.exchangeRateToCAD;
  const colIndex = expatInputs.customCostOfLivingFactor || destination.costOfLivingIndex;
  const pppMultiplier = colIndex > 0 ? 1 / colIndex : 1;

  const departureAge = expatInputs.emigrationAge;
  const currentAge = retirementInputs.currentAge;
  const departureYear = new Date().getFullYear() + Math.max(0, departureAge - currentAge);

  // 1. OAS 20-Year Rule Assessment (Service Canada & Old Age Security Act)
  // An expat can receive OAS indefinitely outside Canada ONLY if they resided in Canada for >= 20 years after age 18.
  const yearsInCanadaAfter18 = expatInputs.yearsLivedInCanadaAfter18;
  const qualifiesForLifetimeWorldwideOAS = yearsInCanadaAfter18 >= 20;

  let oasStatusMessage = '';
  if (qualifiesForLifetimeWorldwideOAS) {
    oasStatusMessage = `Qualified: With ${yearsInCanadaAfter18} years of adult residence in Canada (>= 20 years required), your OAS pension will continue paying into your foreign bank account indefinitely for life.`;
  } else {
    oasStatusMessage = `CRITICAL WARNING: With only ${yearsInCanadaAfter18} years of adult Canadian residence (< 20 years required), your OAS payments will STOP 6 months after you cease Canadian tax residency! You will forfeit OAS unless you complete 20 years before leaving.`;
  }

  // 2. Departure Tax (CRA Section 128.1 Deemed Disposition)
  // Non-registered investment accounts are deemed sold at FMV on the date of departure.
  // Registered accounts (RRSP, RRIF, TFSA, FHSA) and Canadian real estate are statutory exempt from departure tax at exit.
  const departureIndex = yearlyResults.findIndex(r => r.age === departureAge);
  const departureYearResult = departureIndex !== -1 ? yearlyResults[departureIndex] : yearlyResults[0];
  
  // Non-reg balance at exit
  const nonRegBalanceAtExit = departureYearResult?.nonRegBalance || retirementInputs.nonRegBalance;
  // Estimate unrealized gain (assumed ~35% of balance represents accumulated capital gains)
  const unrealizedCapitalGainsAtExitCAD = Math.max(0, nonRegBalanceAtExit * 0.35);
  // CRA capital gains inclusion: 50%
  const departureTaxableCapitalGains = unrealizedCapitalGainsAtExitCAD * 0.50;
  // Estimated provincial + federal marginal rate at departure (assumed ~38% average)
  const departureTaxEstimateCAD = expatInputs.deferDepartureTaxWithT1244 
    ? 0 
    : Math.round(departureTaxableCapitalGains * 0.38);

  // 3. Treaty Rates & Withholding Matrix
  const cppWithholdingRate = (destination.treatyRates.cppWithholding) / 100;
  const oasWithholdingRate = (destination.treatyRates.oasWithholding) / 100;
  const rrspWithholdingRate = (destination.treatyRates.rrspPeriodicWithholding) / 100;
  const nonRegDividendsRate = (destination.treatyRates.nonRegDividendsWithholding) / 100;

  // 4. Yearly Expat Calculation
  const expatYearlyResults: ExpatYearResult[] = [];
  let totalPartXIIIWithholding = 0;
  let totalPPPSurplus = 0;

  // Calculate annual rental income if user keeps real estate
  const ownsHome = Boolean(retirementInputs.realEstate?.ownsHome);
  const homeEquityAtExit = departureYearResult?.homeEquity || 0;
  const homeValueAtExit = retirementInputs.realEstate?.currentMarketValue || 0;
  // Estimated annual gross rent if rented (approx 4.0% gross yield of property value)
  const estimatedAnnualGrossRent = (ownsHome && expatInputs.realEstateStrategy === 'keep_and_rent')
    ? Math.round(homeValueAtExit * 0.04)
    : 0;
  // Net rental income after expenses (property management, taxes, maintenance ~ 40% expenses)
  const estimatedAnnualNetRent = estimatedAnnualGrossRent * 0.60;
  // Non-resident rental withholding: S.216 election taxes net at ~25%, vs statutory 25% of gross
  const craRentalWithholdingAnnual = expatInputs.optSection216ForRental
    ? estimatedAnnualNetRent * 0.25
    : estimatedAnnualGrossRent * 0.25;

  let retirementExpatYearsCount = 0;
  let sumExpatNetCAD = 0;
  let sumDomesticNetCAD = 0;
  let sumExpatNetLocal = 0;
  let sumPPPEquivalentCAD = 0;

  yearlyResults.forEach((yr) => {
    const isNonResident = yr.age >= departureAge;
    const isRetired = yr.age >= retirementInputs.retirementAge;

    const domesticNet = yr.netSpendableCashflow || (yr.totalGrossIncome - yr.totalTaxPaid);

    if (!isNonResident) {
      // Still in Canada
      expatYearlyResults.push({
        year: yr.year,
        age: yr.age,
        isNonResident: false,
        domesticNetIncomeCAD: domesticNet,
        grossIncomeCAD: yr.totalGrossIncome,
        cppReceivedCAD: yr.cppIncome,
        oasReceivedCAD: yr.oasNetIncome,
        oasEligibleAbroad: true,
        rrspWithdrawnCAD: yr.rrspWithdrawal,
        tfsaWithdrawnCAD: yr.tfsaWithdrawal,
        nonRegWithdrawnCAD: yr.nonRegWithdrawal,
        rentalNetIncomeCAD: 0,
        craPartXIIIWithholdingCAD: 0,
        craRentalWithholdingCAD: 0,
        departureTaxCAD: yr.age === departureAge ? departureTaxEstimateCAD : 0,
        destinationLocalTaxCAD: 0,
        expatNetIncomeCAD: domesticNet,
        expatNetIncomeLocalCurrency: domesticNet * exchangeRate,
        pppEquivalentPurchasingPowerCAD: domesticNet,
        purchasingPowerBoostCAD: 0
      });
    } else {
      // Non-Resident of Canada
      // CPP
      const grossCPP = yr.cppIncome;
      const cppTax = grossCPP * cppWithholdingRate;
      const netCPP = Math.max(0, grossCPP - cppTax);

      // OAS: Check 20-year rule
      let netOAS = 0;
      let oasTax = 0;
      let oasEligible = qualifiesForLifetimeWorldwideOAS;

      if (oasEligible) {
        const grossOAS = yr.oasGrossIncome;
        oasTax = grossOAS * oasWithholdingRate;
        netOAS = Math.max(0, grossOAS - oasTax);
      } else {
        // Lost after 6 months abroad
        netOAS = 0;
        oasTax = 0;
      }

      // RRSP / RRIF Withdrawals
      const grossRRSP = yr.rrspWithdrawal;
      const rrspTax = grossRRSP * rrspWithholdingRate;
      const netRRSP = Math.max(0, grossRRSP - rrspTax);

      // TFSA Withdrawals: 100% Tax-Free in Canada (no CRA Part XIII withholding!)
      const netTFSA = yr.tfsaWithdrawal;

      // Non-Reg Withdrawals: CRA does not tax capital gains for non-residents on public securities
      // Only dividends have treaty withholding (~15%). Approx 25% of withdrawal is dividend income.
      const grossNonReg = yr.nonRegWithdrawal;
      const nonRegDividendPortion = grossNonReg * 0.25;
      const nonRegTax = nonRegDividendPortion * nonRegDividendsRate;
      const netNonReg = Math.max(0, grossNonReg - nonRegTax);

      // Real Estate Rental
      const netRental = expatInputs.realEstateStrategy === 'keep_and_rent' ? (estimatedAnnualNetRent - craRentalWithholdingAnnual) : 0;
      const rentalTax = expatInputs.realEstateStrategy === 'keep_and_rent' ? craRentalWithholdingAnnual : 0;

      // Total CRA Non-Resident Part XIII Withholding
      const totalPartXIIITax = cppTax + oasTax + rrspTax + nonRegTax;
      totalPartXIIIWithholding += totalPartXIIITax + rentalTax;

      // Total Expat Gross Pre-Tax Income
      const totalGrossCAD = grossCPP + (oasEligible ? yr.oasGrossIncome : 0) + grossRRSP + netTFSA + grossNonReg + (expatInputs.realEstateStrategy === 'keep_and_rent' ? estimatedAnnualGrossRent : 0);

      // Local Destination Tax (if any, after foreign tax credit offsets)
      const taxableInDestination = netCPP + netOAS + netRRSP;
      const localTaxRate = (destination.localIncomeTaxRate) / 100;
      const destinationLocalTaxCAD = Math.round(taxableInDestination * localTaxRate);

      // Departure tax (only paid in the year of departure)
      const depTaxThisYear = yr.age === departureAge ? departureTaxEstimateCAD : 0;

      // Net Spendable Expat Income (in CAD)
      const expatNetCAD = Math.max(0, (netCPP + netOAS + netRRSP + netTFSA + netNonReg + netRental) - destinationLocalTaxCAD - depTaxThisYear);

      // Converted to Destination Currency
      const expatNetLocal = expatNetCAD * exchangeRate;

      // PPP-Adjusted Purchasing Power in Canadian Equivalent
      const pppEquivalentCAD = expatNetCAD * pppMultiplier;
      const pppBoostCAD = pppEquivalentCAD - expatNetCAD;

      totalPPPSurplus += pppBoostCAD;

      if (isRetired) {
        retirementExpatYearsCount++;
        sumExpatNetCAD += expatNetCAD;
        sumDomesticNetCAD += domesticNet;
        sumExpatNetLocal += expatNetLocal;
        sumPPPEquivalentCAD += pppEquivalentCAD;
      }

      expatYearlyResults.push({
        year: yr.year,
        age: yr.age,
        isNonResident: true,
        domesticNetIncomeCAD: domesticNet,
        grossIncomeCAD: totalGrossCAD,
        cppReceivedCAD: netCPP,
        oasReceivedCAD: netOAS,
        oasEligibleAbroad: oasEligible,
        rrspWithdrawnCAD: netRRSP,
        tfsaWithdrawnCAD: netTFSA,
        nonRegWithdrawnCAD: netNonReg,
        rentalNetIncomeCAD: netRental,
        craPartXIIIWithholdingCAD: totalPartXIIITax,
        craRentalWithholdingCAD: rentalTax,
        departureTaxCAD: depTaxThisYear,
        destinationLocalTaxCAD,
        expatNetIncomeCAD: expatNetCAD,
        expatNetIncomeLocalCurrency: expatNetLocal,
        pppEquivalentPurchasingPowerCAD: pppEquivalentCAD,
        purchasingPowerBoostCAD: pppBoostCAD
      });
    }
  });

  const avgDomestic = retirementExpatYearsCount > 0 ? Math.round(sumDomesticNetCAD / retirementExpatYearsCount) : Math.round(summary.averageAnnualRetirementSpendNominal || 60000);
  const avgExpatNet = retirementExpatYearsCount > 0 ? Math.round(sumExpatNetCAD / retirementExpatYearsCount) : avgDomestic;
  const avgExpatLocal = retirementExpatYearsCount > 0 ? Math.round(sumExpatNetLocal / retirementExpatYearsCount) : avgExpatNet * exchangeRate;
  const avgPPPEquivalent = retirementExpatYearsCount > 0 ? Math.round(sumPPPEquivalentCAD / retirementExpatYearsCount) : avgExpatNet * pppMultiplier;
  
  const boostPercent = Math.round((pppMultiplier - 1) * 100);

  // Real estate outcome description
  let realEstateOutcomeDescription = '';
  if (!ownsHome) {
    realEstateOutcomeDescription = 'You do not own Canadian real estate. No Section 116 withholding certificates or Canadian property departure filings apply.';
  } else if (expatInputs.realEstateStrategy === 'sell_before_departure') {
    realEstateOutcomeDescription = 'Smart Strategy: Selling your Canadian home while still a Canadian tax resident allows you to use the Principal Residence Exemption (PRE) for 100% tax-free capital gains. You can convert the equity to cash or global investments before departure.';
  } else if (expatInputs.realEstateStrategy === 'keep_and_rent') {
    realEstateOutcomeDescription = `Retaining Canadian Real Estate: Your property generates approx. $${estimatedAnnualGrossRent.toLocaleString()}/yr gross rent. By filing CRA Form NR6 and electing under Section 216, you pay tax on net rental profits rather than paying a harsh 25% tax on gross rent.`;
  } else {
    realEstateOutcomeDescription = 'Selling After Departure: Selling Canadian real estate as a non-resident requires a CRA Section 116 Certificate of Compliance. The buyer must withhold 25% of the gross sale price until the CRA issues the certificate, and capital gains accrued after your departure date become taxable.';
  }

  // Key Strategic Insights
  const insights: ExpatSimulationSummary['insights'] = [
    {
      category: 'lifestyle',
      title: `Purchasing Power Multiplier: ${pppMultiplier.toFixed(2)}x in ${destination.name}`,
      description: `With a Cost of Living Index of ${(colIndex * 100).toFixed(0)}% relative to Canada, every Canadian dollar stretches significantly further. Your average non-resident retirement net income of $${avgExpatNet.toLocaleString()} CAD buys goods and services equivalent to $${avgPPPEquivalent.toLocaleString()} CAD in Canada (${boostPercent >= 0 ? `+${boostPercent}%` : `${boostPercent}%`} lifestyle upgrade).`,
      type: boostPercent >= 0 ? 'success' : 'warning',
      badge: `${destination.flag} ${pppMultiplier.toFixed(2)}x Lifestyle`
    },
    {
      category: 'treaty',
      title: destination.hasTaxTreaty 
        ? `Bilateral Tax Treaty Protection (${destination.treatyRates.rrspPeriodicWithholding}% Withholding)` 
        : 'No Bilateral Tax Treaty (Statutory 25% Part XIII)',
      description: destination.hasTaxTreaty
        ? `Canada and ${destination.name} have an active double-taxation treaty. Periodic RRIF/pension withdrawals, CPP, and OAS benefit from a reduced ${destination.treatyRates.rrspPeriodicWithholding}% CRA withholding rate (down from the default statutory 25%).`
        : `Because Canada has no tax treaty with ${destination.name}, the CRA applies the full statutory 25% non-resident withholding tax on all pension, CPP, and registered withdrawals. However, ${destination.localTaxTreatmentNotes}`,
      type: destination.hasTaxTreaty ? 'success' : 'info',
      badge: destination.hasTaxTreaty ? 'Treaty Protected' : '25% Non-Treaty'
    },
    {
      category: 'oas',
      title: qualifiesForLifetimeWorldwideOAS ? 'OAS 20-Year Rule Satisfied' : 'OAS 20-Year Rule Breached',
      description: oasStatusMessage,
      type: qualifiesForLifetimeWorldwideOAS ? 'success' : 'warning',
      badge: qualifiesForLifetimeWorldwideOAS ? 'OAS Retained' : 'OAS At Risk'
    },
    {
      category: 'departure_tax',
      title: departureTaxEstimateCAD === 0 ? 'Zero Departure Tax' : `Estimated Departure Tax: $${departureTaxEstimateCAD.toLocaleString()} CAD`,
      description: departureTaxEstimateCAD === 0
        ? 'Your RRSPs, TFSAs, pensions, and Canadian real estate are completely exempt from CRA Departure Tax (deemed disposition under Section 128.1). You owe $0 in departure tax.'
        : `Under CRA Section 128.1, you are deemed to have sold taxable non-registered investments at fair market value upon leaving Canada. Estimated departure capital gains: $${unrealizedCapitalGainsAtExitCAD.toLocaleString()}, resulting in ~$${departureTaxEstimateCAD.toLocaleString()} in tax. You can elect to defer this using CRA Form T1244.`,
      type: departureTaxEstimateCAD === 0 ? 'success' : 'info',
      badge: departureTaxEstimateCAD === 0 ? '$0 Exit Tax' : `~$${departureTaxEstimateCAD.toLocaleString()} Tax`
    },
    {
      category: 'tfsa',
      title: 'TFSA Treatment Abroad & Foreign Rules',
      description: `Your TFSA withdrawals remain 100% tax-free in Canada (no CRA withholding!). However, you cannot contribute to your TFSA while a non-resident (1% per month penalty). In addition, verify how ${destination.name} taxes foreign investment income, as some jurisdictions (notably the United States IRS) do not recognize TFSAs as tax-exempt.`,
      type: 'info',
      badge: 'CRA Tax-Free'
    }
  ];

  // Relocation Action Checklist
  const checklist: ExpatSimulationSummary['checklist'] = [
    {
      id: 'step_t1161',
      stage: 'year_of_departure',
      title: 'File CRA Form T1161 (List of Properties on Emigration)',
      agency: 'Canada Revenue Agency',
      description: 'Mandatory filing if the fair market value of all reportable worldwide properties exceeds $25,000 CAD on departure date.',
      formNumber: 'Form T1161'
    },
    {
      id: 'step_t1243',
      stage: 'year_of_departure',
      title: 'File CRA Form T1243 (Deemed Disposition of Property)',
      agency: 'Canada Revenue Agency',
      description: 'Calculate capital gains subject to Departure Tax under Income Tax Act Section 128.1(4).',
      formNumber: 'Form T1243'
    },
    {
      id: 'step_nr4',
      stage: 'pre_departure',
      title: 'Notify Banks, Brokerages, and Payers of Non-Resident Status',
      agency: 'Financial Institutions & Service Canada',
      description: 'Submit Form NR301 (Declaration of Eligibility for Treaty Benefits) to ensure payers deduct the correct reduced treaty withholding rate (e.g. 15%) rather than 25%.',
      formNumber: 'Form NR301'
    },
    {
      id: 'step_health',
      stage: 'pre_departure',
      title: 'Provincial Health Insurance (OHIP/MSP/RAMQ) Wind-Down',
      agency: 'Provincial Health Ministry',
      description: 'Notify your provincial health ministry. Canadian health coverage expires after spending 183-212 days outside your province. Secure private expat health insurance.',
      formNumber: 'Provincial Health Opt-Out'
    },
    {
      id: 'step_visa',
      stage: 'pre_departure',
      title: `Obtain ${destination.name} Retirement / Resident Visa`,
      agency: `${destination.name} Consulate & Immigration Authority`,
      description: destination.visaProgram,
      formNumber: 'Consular Visa Application'
    },
    {
      id: 'step_s216',
      stage: 'post_departure',
      title: 'File CRA Form NR6 and Section 216 Election (If Renting Canadian Home)',
      agency: 'Canada Revenue Agency',
      description: 'Elect to pay non-resident tax on net rental income rather than 25% of gross rent. File Section 216 return within 6 months of year-end.',
      formNumber: 'Form NR6 / S.216'
    }
  ];

  return {
    departureAge,
    departureYear,
    destinationCountry: destination,
    yearsInCanadaAfter18,
    qualifiesForLifetimeWorldwideOAS,
    oasStatusMessage,
    departureTaxEstimateCAD,
    unrealizedCapitalGainsAtExitCAD,
    averageDomesticNetCAD: avgDomestic,
    averageExpatNetCAD: avgExpatNet,
    averageExpatNetLocalCurrency: avgExpatLocal,
    averagePPPEquivalentCAD: avgPPPEquivalent,
    purchasingPowerBoostPercent: boostPercent,
    lifetimePartXIIIWithholdingCAD: totalPartXIIIWithholding,
    lifetimePPPSurplusCAD: totalPPPSurplus,
    realEstateOutcomeDescription,
    insights,
    checklist
  };
}
