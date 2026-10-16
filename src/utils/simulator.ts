import {
  RetirementInputs,
  YearSimulationResult,
  SimulationSummary,
  DrawdownStrategyType,
  SpouseInputs,
  StressTestOptions
} from '../types/retirement';
import {
  calculateCanadianTax,
  calculateCppAnnualBenefit,
  calculateOasGrossBenefit,
  calculateOasClawback,
  getRrifMinimumRate,
  TFSA_ANNUAL_LIMIT,
  FHSA_ANNUAL_LIMIT,
  FHSA_LIFETIME_LIMIT
} from './canadianTax';

export function runRetirementSimulation(
  inputs: RetirementInputs,
  stressTest?: StressTestOptions
): {
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
} {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;

  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    province,
    currentAnnualIncome,
    incomeGrowthRate,
    targetRetirementSpendingToday,
    rrspBalance: initialRrsp,
    tfsaBalance: initialTfsa,
    fhsaBalance: initialFhsa,
    nonRegBalance: initialNonReg,
    rrspAnnualContribution,
    tfsaAnnualContribution,
    fhsaAnnualContribution,
    nonRegAnnualContribution,
    fhsaIntent,
    fhsaHomePurchaseAge,
    cppStartAge,
    cppEstimatedPercentOfMax,
    oasStartAge,
    oasEligibleYearsInCanada,
    preRetirementReturn,
    postRetirementReturn,
    inflationRate,
    nonRegYieldTaxRate,
    drawdownStrategy
  } = inputs;

  const totalYears = Math.max(1, lifeExpectancy - currentAge + 1);
  const yearlyResults: YearSimulationResult[] = [];

  // Real Estate Setup
  const re = inputs.realEstate;
  const ownsHome = Boolean(re && re.ownsHome);
  const homeCost = re?.costOfHome ?? 650000;
  const currentHomeMarketVal = re?.currentMarketValue ?? homeCost;
  const downPayment = re?.downPayment ?? 130000;
  const mortgageRate = (re?.mortgageInterestRate ?? 4.79) / 100;
  const mortgageTermYears = re?.mortgageTermYears ?? 25;
  const mortgageStartYear = re?.mortgageStartYear ?? 2021;
  const ownershipShare = (re?.ownershipSharePercent ?? (isCouple ? 50 : 100)) / 100;
  const appreciationRate = (re?.annualAppreciationRate ?? 3.2) / 100;
  const planToSell = Boolean(re?.planToSellHome);
  const sellAge = re?.sellHomeAge ?? 72;
  const sellingCostRate = (re?.sellingCostPercent ?? 4.5) / 100;

  // Canadian Mortgage Amortization (semi-annual compounding converted to monthly)
  const initialMortgagePrincipal = Math.max(0, homeCost - downPayment);
  const semiAnnualRate = mortgageRate / 2;
  const monthlyRate = mortgageRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
  const totalMortgageMonths = mortgageTermYears * 12;
  const monthlyMortgagePmt = (initialMortgagePrincipal > 0 && totalMortgageMonths > 0)
    ? (monthlyRate > 0 
        ? (initialMortgagePrincipal * monthlyRate * Math.pow(1 + monthlyRate, totalMortgageMonths)) / (Math.pow(1 + monthlyRate, totalMortgageMonths) - 1)
        : initialMortgagePrincipal / totalMortgageMonths)
    : 0;

  let homeSold = false;
  let homeSoldAge: number | null = null;
  let homeNetProceedsAtSale = 0;
  let homeEquityAtRetirement = 0;
  let liquidNetWorthAtRetirement = 0;

  // Primary account balances
  let pRrsp = Math.max(0, initialRrsp);
  let pTfsa = Math.max(0, initialTfsa);
  let pFhsa = Math.max(0, initialFhsa);
  let pNonReg = Math.max(0, initialNonReg);

  let pCumulativeFhsa = Math.min(FHSA_LIFETIME_LIMIT, initialFhsa);
  let pFhsaActive = pFhsa > 0 || (fhsaAnnualContribution > 0 && currentAge < 71);

  // Spouse account balances (if couple)
  let sRrsp = isCouple && spouse ? Math.max(0, spouse.rrspBalance) : 0;
  let sTfsa = isCouple && spouse ? Math.max(0, spouse.tfsaBalance) : 0;
  let sFhsa = isCouple && spouse ? Math.max(0, spouse.fhsaBalance) : 0;
  let sNonReg = isCouple && spouse ? Math.max(0, spouse.nonRegBalance) : 0;

  let sCumulativeFhsa = isCouple && spouse ? Math.min(FHSA_LIFETIME_LIMIT, spouse.fhsaBalance) : 0;
  let sFhsaActive = isCouple && spouse ? (sFhsa > 0 || (spouse.fhsaAnnualContribution > 0 && spouse.currentAge < 71)) : false;

  let pEmploymentIncome = currentAnnualIncome;
  let sEmploymentIncome = isCouple && spouse ? spouse.annualIncome : 0;

  let depletionAge: number | null = null;
  let peakNetWorth = 0;
  let peakNetWorthAge = currentAge;
  let netWorthAtRetirement = 0;

  let lifetimeEmploymentIncome = 0;
  let lifetimeCppReceived = 0;
  let lifetimeOasReceived = 0;
  let lifetimeTaxesPaid = 0;
  let lifetimeInvestmentGrowth = 0;
  let totalRetirementYears = 0;
  let sumAnnualRetirementSpend = 0;
  let sumEffectiveTaxInRetirement = 0;

  for (let i = 0; i < totalYears; i++) {
    const age = currentAge + i;
    const spouseAge = isCouple && spouse ? spouse.currentAge + i : undefined;
    const yearNumber = i + 1;
    const isPrimaryRetired = age >= retirementAge;
    const isSpouseRetired = isCouple && spouse ? (spouseAge! >= spouse.retirementAge) : true;
    const isRetired = isPrimaryRetired; // Household enters retirement phase when primary targets retirement
    const notes: string[] = [];

    // Inflation index
    const inflationFactor = Math.pow(1 + inflationRate / 100, i);
    const baseReturnRate = isRetired ? postRetirementReturn / 100 : preRetirementReturn / 100;

    // Per-Account Expected Return Rates
    const useCustomReturns = Boolean(inputs.accountReturns?.useCustomReturns);
    const ar = inputs.accountReturns;

    let rrspRate = useCustomReturns && ar
      ? (isRetired ? (ar.rrspPostReturn ?? ar.rrspReturn) : ar.rrspReturn) / 100
      : baseReturnRate;
    let tfsaRate = useCustomReturns && ar
      ? (isRetired ? (ar.tfsaPostReturn ?? ar.tfsaReturn) : ar.tfsaReturn) / 100
      : baseReturnRate;
    let fhsaRate = useCustomReturns && ar
      ? ar.fhsaReturn / 100
      : baseReturnRate;
    let nonRegBaseRate = useCustomReturns && ar
      ? (isRetired ? (ar.nonRegPostReturn ?? ar.nonRegReturn) : ar.nonRegReturn) / 100
      : baseReturnRate;

    // Apply Market Stress Test (-10% downturn shock)
    if (stressTest?.enabled) {
      const drop = (stressTest.dropPercent || 10) / 100;
      if (stressTest.timing === 'at_retirement' && age === retirementAge) {
        rrspRate = -drop;
        tfsaRate = -drop;
        fhsaRate = -drop;
        nonRegBaseRate = -drop;
        notes.push(`🚨 Stress Test: -${stressTest.dropPercent}% market shock simulated at retirement.`);
      } else if (stressTest.timing === 'immediate' && i === 0) {
        rrspRate = -drop;
        tfsaRate = -drop;
        fhsaRate = -drop;
        nonRegBaseRate = -drop;
        notes.push(`🚨 Stress Test: -${stressTest.dropPercent}% immediate market downturn simulated.`);
      }
    }

    // Real Estate Asset & Mortgage Calculation for Year i
    let yearHomeValue = 0;
    let remainingMortgage = 0;
    let yearHomeEquity = 0;
    let userRealEstateShare = 0;
    let homeSoldThisYear = false;
    let homeSaleProceeds = 0;

    if (ownsHome && !homeSold) {
      const currentSimYear = 2026 + i;
      const elapsedMonths = Math.max(0, (currentSimYear - mortgageStartYear) * 12);
      if (initialMortgagePrincipal <= 0 || elapsedMonths >= totalMortgageMonths) {
        remainingMortgage = 0;
      } else {
        remainingMortgage = Math.max(
          0,
          initialMortgagePrincipal * Math.pow(1 + monthlyRate, elapsedMonths) -
            monthlyMortgagePmt * ((Math.pow(1 + monthlyRate, elapsedMonths) - 1) / (monthlyRate || 1))
        );
      }

      // Current year home market value with compounding appreciation
      yearHomeValue = currentHomeMarketVal * Math.pow(1 + appreciationRate, i);
      yearHomeEquity = Math.max(0, yearHomeValue - remainingMortgage);
      userRealEstateShare = yearHomeEquity * ownershipShare;

      // Disposition / Sale at specified target age
      if (planToSell && age === sellAge) {
        homeSoldThisYear = true;
        homeSold = true;
        homeSoldAge = age;

        const grossSalePrice = yearHomeValue;
        const netAfterClosing = grossSalePrice * (1 - sellingCostRate);
        const equityProceeds = Math.max(0, netAfterClosing - remainingMortgage);
        homeSaleProceeds = equityProceeds * ownershipShare;
        homeNetProceedsAtSale = homeSaleProceeds;

        // Deposited into taxable (non-registered) investment account
        pNonReg += homeSaleProceeds;

        // Disposed from physical real estate holding
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

    // Primary contributions
    let pRrspContrib = 0;
    let pTfsaContrib = 0;
    let pFhsaContrib = 0;
    let pNonRegContrib = 0;

    // Spouse contributions
    let sRrspContrib = 0;
    let sTfsaContrib = 0;
    let sFhsaContrib = 0;
    let sNonRegContrib = 0;

    let pRrspWithdrawal = 0;
    let sRrspWithdrawal = 0;
    let pTfsaWithdrawal = 0;
    let sTfsaWithdrawal = 0;
    let pNonRegWithdrawal = 0;
    let sNonRegWithdrawal = 0;
    let yearFhsaWithdrawalOrTransfer = 0;
    let fhsaRolledOver = false;

    let pCppIncome = 0;
    let sCppIncome = 0;
    let pGrossOas = 0;
    let sGrossOas = 0;
    let pOasClawback = 0;
    let sOasClawback = 0;
    let pNetOas = 0;
    let sNetOas = 0;

    let pYearIncome = 0;
    let sYearIncome = 0;

    let pTaxable = 0;
    let sTaxable = 0;
    let pTaxPaid = 0;
    let sTaxPaid = 0;

    // 1. Working & Accumulation calculations
    if (!isPrimaryRetired) {
      if (i > 0) {
        pEmploymentIncome *= (1 + incomeGrowthRate / 100);
      }

      // Check Career Disruption (Layoff, Industry Shift, Wage Cut)
      if (inputs.careerDisruption?.enabled) {
        const cd = inputs.careerDisruption;
        if (age === cd.shockAge) {
          pEmploymentIncome *= (1 - cd.reductionPercent / 100);
          notes.push(`🚨 Career Disruption at Age ${age}: Wage reduced by ${cd.reductionPercent}% (${cd.isTemporary ? `temporary ${cd.recoveryYears || 2}-yr hit` : 'permanent step-down'}).`);
        } else if (cd.isTemporary && age === cd.shockAge + (cd.recoveryYears || 2)) {
          // Recovery back towards normal level
          pEmploymentIncome *= 1.25;
          notes.push(`💼 Career Recovery at Age ${age}: Wage partially rebounded following ${cd.recoveryYears || 2}-year disruption.`);
        }
      }

      pYearIncome = Math.max(0, pEmploymentIncome);
      lifetimeEmploymentIncome += pYearIncome;

      // Primary FHSA check
      if (pFhsaActive && fhsaIntent === 'home_purchase' && age === fhsaHomePurchaseAge) {
        yearFhsaWithdrawalOrTransfer += pFhsa;
        pFhsa = 0;
        pFhsaActive = false;
        notes.push(`Age ${age}: FHSA fully withdrawn tax-free for qualifying home purchase!`);
      } else if (pFhsaActive && (age >= 71 || i >= 15)) {
        pRrsp += pFhsa;
        yearFhsaWithdrawalOrTransfer += pFhsa;
        pFhsa = 0;
        pFhsaActive = false;
        fhsaRolledOver = true;
        notes.push(`Age ${age}: FHSA reached 15-yr limit and rolled over to RRSP tax-free.`);
      }

      pRrspContrib = Math.max(0, rrspAnnualContribution);
      pTfsaContrib = Math.min(TFSA_ANNUAL_LIMIT * inflationFactor, Math.max(0, tfsaAnnualContribution));
      if (pFhsaActive && pCumulativeFhsa < FHSA_LIFETIME_LIMIT) {
        const allowed = Math.min(FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT - pCumulativeFhsa, Math.max(0, fhsaAnnualContribution));
        pFhsaContrib = allowed;
        pCumulativeFhsa += allowed;
      }
      pNonRegContrib = Math.max(0, nonRegAnnualContribution);

      // Ensure contributions do not exceed earned income during heavy wage cuts
      const totalPlannedSavings = pRrspContrib + pTfsaContrib + pFhsaContrib + pNonRegContrib;
      if (pYearIncome > 0 && totalPlannedSavings > pYearIncome * 0.70) {
        const scaleDown = (pYearIncome * 0.70) / totalPlannedSavings;
        pRrspContrib *= scaleDown;
        pTfsaContrib *= scaleDown;
        pFhsaContrib *= scaleDown;
        pNonRegContrib *= scaleDown;
      }

      pTaxable = Math.max(0, pYearIncome - pRrspContrib - pFhsaContrib);
      pTaxPaid = calculateCanadianTax(pTaxable, province, age, 0).totalTax;
    }

    if (isCouple && spouse && !isSpouseRetired) {
      if (i > 0) {
        sEmploymentIncome *= (1 + spouse.incomeGrowthRate / 100);
      }

      // Check Spouse Career Disruption
      if (spouse.careerDisruption?.enabled && spouseAge !== undefined) {
        const scd = spouse.careerDisruption;
        if (spouseAge === scd.shockAge) {
          sEmploymentIncome *= (1 - scd.reductionPercent / 100);
          notes.push(`🚨 Spouse Career Shock at Age ${spouseAge}: Wage cut by ${scd.reductionPercent}%.`);
        } else if (scd.isTemporary && spouseAge === scd.shockAge + (scd.recoveryYears || 2)) {
          sEmploymentIncome *= 1.25;
          notes.push(`💼 Spouse Career Recovery at Age ${spouseAge}.`);
        }
      }

      sYearIncome = Math.max(0, sEmploymentIncome);
      lifetimeEmploymentIncome += sYearIncome;

      // Spouse FHSA check
      if (sFhsaActive && spouse.fhsaIntent === 'home_purchase' && spouseAge === spouse.fhsaHomePurchaseAge) {
        yearFhsaWithdrawalOrTransfer += sFhsa;
        sFhsa = 0;
        sFhsaActive = false;
        notes.push(`Spouse Age ${spouseAge}: FHSA withdrawn tax-free for home purchase.`);
      } else if (sFhsaActive && (spouseAge! >= 71 || i >= 15)) {
        sRrsp += sFhsa;
        yearFhsaWithdrawalOrTransfer += sFhsa;
        sFhsa = 0;
        sFhsaActive = false;
        notes.push(`Spouse Age ${spouseAge}: FHSA rolled over to RRSP.`);
      }

      sRrspContrib = Math.max(0, spouse.rrspAnnualContribution);
      sTfsaContrib = Math.min(TFSA_ANNUAL_LIMIT * inflationFactor, Math.max(0, spouse.tfsaAnnualContribution));
      if (sFhsaActive && sCumulativeFhsa < FHSA_LIFETIME_LIMIT) {
        const allowed = Math.min(FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT - sCumulativeFhsa, Math.max(0, spouse.fhsaAnnualContribution));
        sFhsaContrib = allowed;
        sCumulativeFhsa += allowed;
      }
      sNonRegContrib = Math.max(0, spouse.nonRegAnnualContribution);

      sTaxable = Math.max(0, sYearIncome - sRrspContrib - sFhsaContrib);
      sTaxPaid = calculateCanadianTax(sTaxable, province, spouseAge!, 0).totalTax;
    }

    // 2. Investment Returns
    const netNonRegReturn = Math.max(-1, nonRegBaseRate - (nonRegYieldTaxRate / 100));

    const pRrspGrowth = (pRrsp + pRrspContrib) * rrspRate;
    const pTfsaGrowth = (pTfsa + pTfsaContrib) * tfsaRate;
    const pFhsaGrowth = (pFhsa + pFhsaContrib) * fhsaRate;
    const pNonRegGrowth = (pNonReg + pNonRegContrib) * netNonRegReturn;

    const sRrspGrowth = (sRrsp + sRrspContrib) * rrspRate;
    const sTfsaGrowth = (sTfsa + sTfsaContrib) * tfsaRate;
    const sFhsaGrowth = (sFhsa + sFhsaContrib) * fhsaRate;
    const sNonRegGrowth = (sNonReg + sNonRegContrib) * netNonRegReturn;

    const totalGrowth = pRrspGrowth + pTfsaGrowth + pFhsaGrowth + pNonRegGrowth + sRrspGrowth + sTfsaGrowth + sFhsaGrowth + sNonRegGrowth;
    lifetimeInvestmentGrowth += totalGrowth;

    pRrsp += pRrspContrib + pRrspGrowth;
    pTfsa += pTfsaContrib + pTfsaGrowth;
    pFhsa += pFhsaContrib + pFhsaGrowth;
    pNonReg += pNonRegContrib + pNonRegGrowth;

    sRrsp += sRrspContrib + sRrspGrowth;
    sTfsa += sTfsaContrib + sTfsaGrowth;
    sFhsa += sFhsaContrib + sFhsaGrowth;
    sNonReg += sNonRegContrib + sNonRegGrowth;

    // 3. Decumulation & Pensions
    let targetSpendingNominal = 0;
    let netSpendableCashflow = 0;
    let cashflowGap = 0;
    let isRrifMandatory: boolean = Boolean(age >= 72 || (isCouple && spouse && spouseAge !== undefined && spouseAge >= 72));
    let rrifMinimumWithdrawal = 0;

    if (isRetired) {
      totalRetirementYears++;
      targetSpendingNominal = targetRetirementSpendingToday * inflationFactor;
      sumAnnualRetirementSpend += targetSpendingNominal;

      // Primary Pensions
      if (age >= cppStartAge) {
        pCppIncome = calculateCppAnnualBenefit(cppStartAge, cppEstimatedPercentOfMax, inflationFactor);
        lifetimeCppReceived += pCppIncome;
      }
      if (age >= oasStartAge) {
        pGrossOas = calculateOasGrossBenefit(age, oasStartAge, oasEligibleYearsInCanada, inflationFactor);
      }

      // Spouse Pensions
      if (isCouple && spouse) {
        if (spouseAge! >= spouse.cppStartAge) {
          sCppIncome = calculateCppAnnualBenefit(spouse.cppStartAge, spouse.cppEstimatedPercentOfMax, inflationFactor);
          lifetimeCppReceived += sCppIncome;
        }
        if (spouseAge! >= spouse.oasStartAge) {
          sGrossOas = calculateOasGrossBenefit(spouseAge!, spouse.oasStartAge, spouse.oasEligibleYearsInCanada, inflationFactor);
        }
      }

      // Mandatory RRIF minimums
      let pRrifMin = 0;
      let sRrifMin = 0;
      if (age >= 72 && pRrsp > 0) {
        pRrifMin = pRrsp * getRrifMinimumRate(age);
      }
      if (isCouple && spouse && spouseAge! >= 72 && sRrsp > 0) {
        sRrifMin = sRrsp * getRrifMinimumRate(spouseAge!);
      }
      rrifMinimumWithdrawal = pRrifMin + sRrifMin;

      // Available guaranteed income (CPP + Gross OAS + any spouse employment if spouse still working)
      const guaranteedCash = pCppIncome + pGrossOas + sCppIncome + sGrossOas + (!isSpouseRetired ? sYearIncome - sTaxPaid : 0);
      let neededFromPortfolio = Math.max(0, targetSpendingNominal - guaranteedCash);

      // Drawdown sequencing across accounts
      // 1. Mandatory RRIF minimums
      if (pRrifMin > 0) {
        const taken = Math.min(pRrsp, pRrifMin);
        pRrspWithdrawal += taken;
        pRrsp -= taken;
      }
      if (sRrifMin > 0) {
        const taken = Math.min(sRrsp, sRrifMin);
        sRrspWithdrawal += taken;
        sRrsp -= taken;
      }

      const totalRrspTaken = pRrspWithdrawal + sRrspWithdrawal;
      neededFromPortfolio = Math.max(0, neededFromPortfolio - (totalRrspTaken * 0.8));

      if (drawdownStrategy === 'tax_efficient') {
        // Non-Reg first, then RRSP, then TFSA last
        const totalNonReg = pNonReg + sNonReg;
        if (totalNonReg > 0 && neededFromPortfolio > 0) {
          const draw = Math.min(totalNonReg, neededFromPortfolio);
          const pDraw = (totalNonReg > 0 ? (pNonReg / totalNonReg) * draw : 0);
          const sDraw = draw - pDraw;
          pNonRegWithdrawal += pDraw;
          pNonReg -= pDraw;
          sNonRegWithdrawal += sDraw;
          sNonReg -= sDraw;
          neededFromPortfolio -= draw;
        }

        const totalRrsp = pRrsp + sRrsp;
        if (totalRrsp > 0 && neededFromPortfolio > 0) {
          const drawGross = Math.min(totalRrsp, neededFromPortfolio / 0.78);
          const pDraw = totalRrsp > 0 ? (pRrsp / totalRrsp) * drawGross : 0;
          const sDraw = drawGross - pDraw;
          pRrspWithdrawal += pDraw;
          pRrsp -= pDraw;
          sRrspWithdrawal += sDraw;
          sRrsp -= sDraw;
          neededFromPortfolio -= drawGross * 0.78;
        }

        const totalTfsa = pTfsa + sTfsa;
        if (totalTfsa > 0 && neededFromPortfolio > 0) {
          const draw = Math.min(totalTfsa, neededFromPortfolio);
          const pDraw = totalTfsa > 0 ? (pTfsa / totalTfsa) * draw : 0;
          const sDraw = draw - pDraw;
          pTfsaWithdrawal += pDraw;
          pTfsa -= pDraw;
          sTfsaWithdrawal += sDraw;
          sTfsa -= sDraw;
          neededFromPortfolio -= draw;
        }

      } else if (drawdownStrategy === 'rrsp_meltdown') {
        // Meltdown: accelerate RRSP withdrawals prior to age 71
        const ceiling = 65000 * inflationFactor;
        if (age < 72 && pRrsp > 0) {
          const draw = Math.min(pRrsp, Math.max(pRrifMin, ceiling));
          pRrspWithdrawal += draw;
          pRrsp -= draw;
        }
        if (isCouple && spouse && spouseAge! < 72 && sRrsp > 0) {
          const draw = Math.min(sRrsp, Math.max(sRrifMin, ceiling));
          sRrspWithdrawal += draw;
          sRrsp -= draw;
        }

        let rem = Math.max(0, targetSpendingNominal - (guaranteedCash + (pRrspWithdrawal + sRrspWithdrawal) * 0.78));
        const totalNonReg = pNonReg + sNonReg;
        if (totalNonReg > 0 && rem > 0) {
          const draw = Math.min(totalNonReg, rem);
          pNonRegWithdrawal += Math.min(pNonReg, draw / 2);
          pNonReg -= pNonRegWithdrawal;
          sNonRegWithdrawal += Math.min(sNonReg, draw / 2);
          sNonReg -= sNonRegWithdrawal;
          rem -= draw;
        }
        const totalTfsa = pTfsa + sTfsa;
        if (totalTfsa > 0 && rem > 0) {
          const draw = Math.min(totalTfsa, rem);
          pTfsaWithdrawal += Math.min(pTfsa, draw / 2);
          pTfsa -= pTfsaWithdrawal;
          sTfsaWithdrawal += Math.min(sTfsa, draw / 2);
          sTfsa -= sTfsaWithdrawal;
          rem -= draw;
        }

      } else {
        // Proportional or TFSA first
        const totalTfsa = pTfsa + sTfsa;
        if (drawdownStrategy === 'tfsa_first' && totalTfsa > 0 && neededFromPortfolio > 0) {
          const draw = Math.min(totalTfsa, neededFromPortfolio);
          pTfsaWithdrawal += Math.min(pTfsa, draw / 2);
          pTfsa -= pTfsaWithdrawal;
          sTfsaWithdrawal += Math.min(sTfsa, draw / 2);
          sTfsa -= sTfsaWithdrawal;
          neededFromPortfolio -= draw;
        }

        const totalLiquid = pRrsp + sRrsp + pNonReg + sNonReg + pTfsa + sTfsa;
        if (totalLiquid > 0 && neededFromPortfolio > 0) {
          const rrspTotal = pRrsp + sRrsp;
          const nonRegTotal = pNonReg + sNonReg;
          const tfsaTotal = pTfsa + sTfsa;

          const fromRrsp = Math.min(rrspTotal, (neededFromPortfolio * (rrspTotal / totalLiquid)) / 0.8);
          pRrspWithdrawal += pRrsp > 0 ? fromRrsp * (pRrsp / (rrspTotal || 1)) : 0;
          pRrsp -= pRrspWithdrawal;
          sRrspWithdrawal += sRrsp > 0 ? fromRrsp * (sRrsp / (rrspTotal || 1)) : 0;
          sRrsp -= sRrspWithdrawal;

          const fromNonReg = Math.min(nonRegTotal, neededFromPortfolio * (nonRegTotal / totalLiquid));
          pNonRegWithdrawal += pNonReg > 0 ? fromNonReg * (pNonReg / (nonRegTotal || 1)) : 0;
          pNonReg -= pNonRegWithdrawal;
          sNonRegWithdrawal += sNonReg > 0 ? fromNonReg * (sNonReg / (nonRegTotal || 1)) : 0;
          sNonReg -= sNonRegWithdrawal;

          const fromTfsa = Math.min(tfsaTotal, neededFromPortfolio * (tfsaTotal / totalLiquid));
          pTfsaWithdrawal += pTfsa > 0 ? fromTfsa * (pTfsa / (tfsaTotal || 1)) : 0;
          pTfsa -= pTfsaWithdrawal;
          sTfsaWithdrawal += sTfsa > 0 ? fromTfsa * (sTfsa / (tfsaTotal || 1)) : 0;
          sTfsa -= sTfsaWithdrawal;
        }
      }

      // Canadian Tax Calculation for Primary and Spouse:
      // Pension Income Splitting rule (CRA Form T1032): Couples 65+ can split up to 50% of eligible pension/RRIF income
      let pRrspTaxable = pRrspWithdrawal;
      let sRrspTaxable = sRrspWithdrawal;

      if (isCouple && spouse && spouse.pensionIncomeSplitting && (age >= 65 || spouseAge! >= 65)) {
        const totalRrspTaxable = pRrspWithdrawal + sRrspWithdrawal;
        // Balance taxable pension income between spouses to equalize marginal brackets
        pRrspTaxable = totalRrspTaxable / 2;
        sRrspTaxable = totalRrspTaxable / 2;
        if (i % 5 === 0 && age >= 65) {
          notes.push(`Age ${age}: Canadian Pension Income Splitting active (up to 50% RRIF equalized to lower marginal tax).`);
        }
      }

      pTaxable = pCppIncome + pGrossOas + pRrspTaxable + (pNonRegWithdrawal * 0.25);
      pOasClawback = calculateOasClawback(pGrossOas, pTaxable, inflationFactor);
      pNetOas = Math.max(0, pGrossOas - pOasClawback);
      lifetimeOasReceived += pNetOas;

      const pTaxRes = calculateCanadianTax(pTaxable, province, age, age >= 65 ? pRrspTaxable : 0);
      pTaxPaid = pTaxRes.totalTax + pOasClawback;

      if (isCouple && spouse) {
        sTaxable = sCppIncome + sGrossOas + sRrspTaxable + (sNonRegWithdrawal * 0.25);
        sOasClawback = calculateOasClawback(sGrossOas, sTaxable, inflationFactor);
        sNetOas = Math.max(0, sGrossOas - sOasClawback);
        lifetimeOasReceived += sNetOas;

        const sTaxRes = calculateCanadianTax(sTaxable, province, spouseAge!, spouseAge! >= 65 ? sRrspTaxable : 0);
        sTaxPaid = sTaxRes.totalTax + sOasClawback;
      }

      if (pOasClawback > 0 || sOasClawback > 0) {
        notes.push(`Age ${age}: OAS clawback triggered (${pOasClawback > 0 ? `Primary: $${Math.round(pOasClawback)}` : ''}${sOasClawback > 0 ? ` Spouse: $${Math.round(sOasClawback)}` : ''}).`);
      }

      // Net cash flow
      const totalInflow = pCppIncome + pNetOas + sCppIncome + sNetOas + pRrspWithdrawal + sRrspWithdrawal + pTfsaWithdrawal + sTfsaWithdrawal + pNonRegWithdrawal + sNonRegWithdrawal;
      const combinedTax = pTaxRes.totalTax + (isCouple ? calculateCanadianTax(sTaxable, province, spouseAge!, 0).totalTax : 0);
      netSpendableCashflow = totalInflow - combinedTax;

      if (netSpendableCashflow < targetSpendingNominal) {
        cashflowGap = targetSpendingNominal - netSpendableCashflow;
      }
    }

    const totalTaxPaid = pTaxPaid + sTaxPaid;
    lifetimeTaxesPaid += totalTaxPaid;
    if (isRetired) {
      sumEffectiveTaxInRetirement += (pTaxable + sTaxable > 0 ? totalTaxPaid / (pTaxable + sTaxable) : 0);
    }

    const currentLiquidPortfolio = pRrsp + pTfsa + pFhsa + pNonReg + sRrsp + sTfsa + sFhsa + sNonReg;
    const currentTotalNetWorth = currentLiquidPortfolio + userRealEstateShare;
    if (currentTotalNetWorth > peakNetWorth) {
      peakNetWorth = currentTotalNetWorth;
      peakNetWorthAge = age;
    }

    if (age === retirementAge - 1 || (currentAge === retirementAge && i === 0)) {
      netWorthAtRetirement = currentTotalNetWorth;
      liquidNetWorthAtRetirement = currentLiquidPortfolio;
      homeEquityAtRetirement = userRealEstateShare;
    }

    if (isRetired && currentTotalNetWorth <= 0 && depletionAge === null && age > retirementAge) {
      depletionAge = age;
      notes.push(`Age ${age}: Household portfolio and assets depleted. Shortfall starts.`);
    }

    const yearTotalWithdrawals = pRrspWithdrawal + sRrspWithdrawal + pTfsaWithdrawal + sTfsaWithdrawal + pNonRegWithdrawal + sNonRegWithdrawal;

    yearlyResults.push({
      age,
      year: yearNumber,
      isRetired,
      employmentIncome: Math.round(pYearIncome + sYearIncome),
      cppIncome: Math.round(pCppIncome + sCppIncome),
      oasGrossIncome: Math.round(pGrossOas + sGrossOas),
      oasClawback: Math.round(pOasClawback + sOasClawback),
      oasNetIncome: Math.round(pNetOas + sNetOas),
      rrspBalance: Math.round(pRrsp + sRrsp),
      tfsaBalance: Math.round(pTfsa + sTfsa),
      fhsaBalance: Math.round(pFhsa + sFhsa),
      nonRegBalance: Math.round(pNonReg + sNonReg),
      totalNetWorth: Math.round(currentTotalNetWorth),
      homeValue: Math.round(yearHomeValue),
      remainingMortgage: Math.round(remainingMortgage),
      homeEquity: Math.round(yearHomeEquity),
      realEstateShare: Math.round(userRealEstateShare),
      homeSoldThisYear,
      homeSaleProceeds: Math.round(homeSaleProceeds),
      rrspContribution: Math.round(pRrspContrib + sRrspContrib),
      tfsaContribution: Math.round(pTfsaContrib + sTfsaContrib),
      fhsaContribution: Math.round(pFhsaContrib + sFhsaContrib),
      nonRegContribution: Math.round(pNonRegContrib + sNonRegContrib),
      rrspWithdrawal: Math.round(pRrspWithdrawal + sRrspWithdrawal),
      tfsaWithdrawal: Math.round(pTfsaWithdrawal + sTfsaWithdrawal),
      nonRegWithdrawal: Math.round(pNonRegWithdrawal + sNonRegWithdrawal),
      fhsaWithdrawalOrTransfer: Math.round(yearFhsaWithdrawalOrTransfer),
      totalWithdrawals: Math.round(yearTotalWithdrawals),
      totalInvestmentGrowth: Math.round(totalGrowth),
      targetSpendingNominal: Math.round(targetSpendingNominal),
      totalGrossIncome: Math.round(pYearIncome + sYearIncome + pCppIncome + sCppIncome + pGrossOas + sGrossOas + yearTotalWithdrawals),
      taxableIncome: Math.round(pTaxable + sTaxable),
      totalTaxPaid: Math.round(totalTaxPaid),
      effectiveTaxRate: (pTaxable + sTaxable > 0 ? totalTaxPaid / (pTaxable + sTaxable) : 0),
      marginalTaxRate: calculateCanadianTax(pTaxable, province, age, 0).marginalRate,
      netSpendableCashflow: Math.round(isRetired ? netSpendableCashflow : (pYearIncome + sYearIncome - totalTaxPaid - (pRrspContrib + sRrspContrib + pTfsaContrib + sTfsaContrib + pFhsaContrib + sFhsaContrib + pNonRegContrib + sNonRegContrib))),
      cashflowGap: Math.round(cashflowGap),
      isRrifMandatory,
      rrifMinimumWithdrawal: Math.round(rrifMinimumWithdrawal),
      fhsaRolledOver,
      notes,
      isCouple,
      spouseAge,
      isSpouseRetired,
      spouseEmploymentIncome: Math.round(sYearIncome),
      spouseCppIncome: Math.round(sCppIncome),
      spouseOasNetIncome: Math.round(sNetOas),
      spouseTaxPaid: Math.round(sTaxPaid)
    });
  }

  const finalYear = yearlyResults[yearlyResults.length - 1];
  const netWorthAtLifeExpectancy = finalYear ? finalYear.totalNetWorth : 0;
  const isFullyFunded = depletionAge === null && netWorthAtLifeExpectancy >= 0;

  const totalYearsInRetirement = Math.max(1, lifeExpectancy - retirementAge + 1);
  const yearsFunded = depletionAge !== null ? (depletionAge - retirementAge) : totalYearsInRetirement;
  const readinessScore = Math.min(100, Math.max(0, Math.round((yearsFunded / totalYearsInRetirement) * 100)));

  const summary: SimulationSummary = {
    portfolioDepletionAge: depletionAge,
    yearsFunded,
    totalYearsInRetirement,
    isFullyFunded,
    readinessScore,
    netWorthAtRetirement: Math.round(netWorthAtRetirement),
    netWorthAtLifeExpectancy: Math.round(netWorthAtLifeExpectancy),
    peakNetWorth: Math.round(peakNetWorth),
    peakNetWorthAge,
    ownsHome,
    homeEquityAtRetirement: Math.round(homeEquityAtRetirement),
    homeSoldAge,
    homeNetProceedsAtSale: Math.round(homeNetProceedsAtSale),
    liquidNetWorthAtRetirement: Math.round(liquidNetWorthAtRetirement),
    lifetimeEmploymentIncome: Math.round(lifetimeEmploymentIncome),
    lifetimeCppReceived: Math.round(lifetimeCppReceived),
    lifetimeOasReceived: Math.round(lifetimeOasReceived),
    lifetimeTaxesPaid: Math.round(lifetimeTaxesPaid),
    lifetimeInvestmentGrowth: Math.round(lifetimeInvestmentGrowth),
    averageAnnualRetirementSpendNominal: totalRetirementYears > 0 ? Math.round(sumAnnualRetirementSpend / totalRetirementYears) : 0,
    averageEffectiveTaxInRetirement: totalRetirementYears > 0 ? sumEffectiveTaxInRetirement / totalRetirementYears : 0,
    retirementAge,
    firstRrifMandatoryYear: 72,
    cppStartAge,
    oasStartAge,
    isCouple,
    spouseRetirementAge: isCouple && spouse ? spouse.retirementAge : undefined
  };

  return { yearlyResults, summary };
}

export interface SavingsPulseResult {
  currentMonthlySavings: number;
  requiredMonthlySavings: number;
  monthlyGap: number; // positive = shortfall to bridge; negative = surplus buffer
  status: 'surplus' | 'on_track' | 'underfunded' | 'critical';
  currentSavingsRate: number; // percentage of gross income
  requiredSavingsRate: number; // percentage of gross income
  projectedNestEggAtRetire: number;
  targetNestEggNeeded: number;
  recommendedAction: string;
  rrspTaxSavingsMonthly: number;
  workingYearsRemaining: number;
  monthlyBreakdown: {
    rrsp: number;
    tfsa: number;
    fhsa: number;
    nonReg: number;
  };
}

export function calculateSavingsPulse(
  inputs: RetirementInputs,
  currentSummary: SimulationSummary
): SavingsPulseResult {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;
  const workingYears = Math.max(1, inputs.retirementAge - inputs.currentAge);

  const primaryAnnualSavings = 
    inputs.rrspAnnualContribution + 
    inputs.tfsaAnnualContribution + 
    inputs.fhsaAnnualContribution + 
    inputs.nonRegAnnualContribution;

  const spouseAnnualSavings = isCouple && spouse
    ? (spouse.rrspAnnualContribution + spouse.tfsaAnnualContribution + spouse.fhsaAnnualContribution + spouse.nonRegAnnualContribution)
    : 0;

  const currentAnnualSavings = primaryAnnualSavings + spouseAnnualSavings;
  const currentMonthlySavings = Math.round(currentAnnualSavings / 12);

  const totalHouseholdIncome = inputs.currentAnnualIncome + (isCouple && spouse ? spouse.annualIncome : 0);
  const currentSavingsRate = totalHouseholdIncome > 0
    ? (currentAnnualSavings / totalHouseholdIncome) * 100
    : 0;

  const monthlyBreakdown = {
    rrsp: Math.round((inputs.rrspAnnualContribution + (isCouple && spouse ? spouse.rrspAnnualContribution : 0)) / 12),
    tfsa: Math.round((inputs.tfsaAnnualContribution + (isCouple && spouse ? spouse.tfsaAnnualContribution : 0)) / 12),
    fhsa: Math.round((inputs.fhsaAnnualContribution + (isCouple && spouse ? spouse.fhsaAnnualContribution : 0)) / 12),
    nonReg: Math.round((inputs.nonRegAnnualContribution + (isCouple && spouse ? spouse.nonRegAnnualContribution : 0)) / 12)
  };

  let requiredMonthlySavings = currentMonthlySavings;
  let targetNestEggNeeded = currentSummary.netWorthAtRetirement;

  if (currentSummary.isFullyFunded) {
    let low = 0.0;
    let high = 1.0;
    let minScale = 1.0;

    for (let iter = 0; iter < 12; iter++) {
      const mid = (low + high) / 2;
      const testInputs: RetirementInputs = {
        ...inputs,
        rrspAnnualContribution: inputs.rrspAnnualContribution * mid,
        tfsaAnnualContribution: inputs.tfsaAnnualContribution * mid,
        fhsaAnnualContribution: inputs.fhsaAnnualContribution * mid,
        nonRegAnnualContribution: inputs.nonRegAnnualContribution * mid,
        spouse: isCouple && spouse ? {
          ...spouse,
          rrspAnnualContribution: spouse.rrspAnnualContribution * mid,
          tfsaAnnualContribution: spouse.tfsaAnnualContribution * mid,
          fhsaAnnualContribution: spouse.fhsaAnnualContribution * mid,
          nonRegAnnualContribution: spouse.nonRegAnnualContribution * mid
        } : undefined
      };

      const sim = runRetirementSimulation(testInputs);
      if (sim.summary.isFullyFunded && sim.summary.netWorthAtLifeExpectancy >= 0) {
        minScale = mid;
        high = mid;
        targetNestEggNeeded = sim.summary.netWorthAtRetirement;
      } else {
        low = mid;
      }
    }

    requiredMonthlySavings = Math.round((currentAnnualSavings * minScale) / 12);
  } else {
    let low = 0;
    let high = Math.max(180000, totalHouseholdIncome * 1.5);
    let bestDelta = high;

    for (let iter = 0; iter < 16; iter++) {
      const mid = (low + high) / 2;
      const addRrsp = Math.min(mid, Math.max(0, 32490 - inputs.rrspAnnualContribution));
      const addNonReg = mid - addRrsp;

      const testInputs: RetirementInputs = {
        ...inputs,
        rrspAnnualContribution: inputs.rrspAnnualContribution + addRrsp,
        nonRegAnnualContribution: inputs.nonRegAnnualContribution + addNonReg
      };

      const sim = runRetirementSimulation(testInputs);
      if (sim.summary.isFullyFunded && sim.summary.netWorthAtLifeExpectancy >= 0) {
        bestDelta = mid;
        targetNestEggNeeded = sim.summary.netWorthAtRetirement;
        high = mid;
      } else {
        low = mid;
      }
    }

    requiredMonthlySavings = Math.round((currentAnnualSavings + bestDelta) / 12);
  }

  const monthlyGap = requiredMonthlySavings - currentMonthlySavings;
  const requiredSavingsRate = totalHouseholdIncome > 0
    ? ((requiredMonthlySavings * 12) / totalHouseholdIncome) * 100
    : 0;

  let status: 'surplus' | 'on_track' | 'underfunded' | 'critical' = 'on_track';
  if (monthlyGap < -50) {
    status = 'surplus';
  } else if (Math.abs(monthlyGap) <= 50) {
    status = 'on_track';
  } else if (monthlyGap > 0 && currentSummary.yearsFunded >= currentSummary.totalYearsInRetirement * 0.75) {
    status = 'underfunded';
  } else {
    status = 'critical';
  }

  const approxMarginalRate = totalHouseholdIncome > 140000 ? 0.43 : totalHouseholdIncome > 70000 ? 0.31 : 0.20;
  const rrspTaxSavingsMonthly = monthlyGap > 0 ? Math.round(monthlyGap * approxMarginalRate) : 0;

  let recommendedAction = '';
  if (status === 'surplus') {
    const surplusAmt = Math.abs(monthlyGap);
    recommendedAction = `Your ${isCouple ? 'household has' : 'you have'} a $${surplusAmt.toLocaleString()}/mo safety buffer! You could retire earlier, increase lifestyle spending, or build generational wealth.`;
  } else if (status === 'on_track') {
    recommendedAction = `Pacing reliably. Continue your scheduled contributions across ${isCouple ? 'both partners’ ' : ''}registered and non-registered accounts.`;
  } else {
    recommendedAction = `Bridge the $${monthlyGap.toLocaleString()}/mo gap by maximizing ${isCouple ? 'both TFSA and RRSP rooms' : 'RRSP and TFSA contributions'}.`;
  }

  return {
    currentMonthlySavings,
    requiredMonthlySavings,
    monthlyGap,
    status,
    currentSavingsRate: Math.round(currentSavingsRate * 10) / 10,
    requiredSavingsRate: Math.round(requiredSavingsRate * 10) / 10,
    projectedNestEggAtRetire: currentSummary.netWorthAtRetirement,
    targetNestEggNeeded: Math.round(targetNestEggNeeded),
    recommendedAction,
    rrspTaxSavingsMonthly,
    workingYearsRemaining: workingYears,
    monthlyBreakdown
  };
}
