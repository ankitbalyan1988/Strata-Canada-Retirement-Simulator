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
    fhsaOpenYear = inputs.fhsaOpenYear || 2023,
    fhsaIntent,
    fhsaHomePurchaseAge,
    cppStartAge,
    cppEstimatedPercentOfMax,
    oasStartAge,
    oasEligibleYearsInCanada,
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

  // Baseline Annual Living Expenses (Today's Dollars)
  const me = inputs.monthlyExpenses;
  const initialMonthlyExpenses = me
    ? (me.rentOrMortgage || 0) + (me.utilities || 0) + (me.creditCard || 0) + (me.otherExpenses || 0)
    : Math.round((inputs.targetRetirementSpendingToday / 12) * 1.25);
  const initialAnnualExpenses = initialMonthlyExpenses * 12;

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

  const hasCustomNonReg = Boolean(inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0);
  const customAccountsState = hasCustomNonReg
    ? inputs.nonRegCustomAccounts!.map((acc) => ({
        id: acc.id,
        name: acc.name,
        category: acc.category,
        balance: Math.max(0, acc.balance),
        annualContribution: Math.max(0, acc.annualContribution),
        expectedReturn: acc.expectedReturn,
        gicCloseYear: acc.gicCloseYear || (acc.gicCloseDate ? parseInt(acc.gicCloseDate.split('-')[0], 10) : 2028),
        matured: false,
        currentContribution: 0
      }))
    : [];

  if (hasCustomNonReg) {
    pNonReg = customAccountsState.reduce((sum, a) => sum + a.balance, 0);
  }

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

    // Per-Account Expected Return Rates (compounds independently for each vehicle)
    const ar = inputs.accountReturns;

    let rrspRate = (isRetired ? (ar?.rrspPostReturn ?? ar?.rrspReturn ?? 6.5) : (ar?.rrspReturn ?? 6.5)) / 100;
    let tfsaRate = (isRetired ? (ar?.tfsaPostReturn ?? ar?.tfsaReturn ?? 7.0) : (ar?.tfsaReturn ?? 7.0)) / 100;
    let fhsaRate = (ar?.fhsaReturn ?? 6.0) / 100;
    let nonRegBaseRate = (isRetired ? (ar?.nonRegPostReturn ?? ar?.nonRegReturn ?? 5.5) : (ar?.nonRegReturn ?? 5.5)) / 100;

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
        if (hasCustomNonReg && customAccountsState.length > 0) {
          const targetAcc =
            customAccountsState.find((a) => a.category === 'investment') ||
            customAccountsState.find((a) => a.category === 'savings') ||
            customAccountsState[0];
          if (targetAcc) {
            targetAcc.balance += homeSaleProceeds;
          }
        }

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

    // Check FHSA (15-Year CRA Expiry or Age 71 Rollover into RRSP/RRIF or Home Purchase)
    const currentSimYear = 2026 + i;

    // Primary FHSA check
    if (pFhsaActive) {
      const primaryFhsaOpenYear = fhsaOpenYear || 2023;
      const primaryYearsSinceOpen = currentSimYear - primaryFhsaOpenYear;
      const primaryReached15Years = primaryYearsSinceOpen >= 15;

      if (fhsaIntent === 'home_purchase' && age === fhsaHomePurchaseAge) {
        yearFhsaWithdrawalOrTransfer += pFhsa;
        notes.push(`🏠 Age ${age}: FHSA fully withdrawn tax-free ($${Math.round(pFhsa).toLocaleString()}) for qualifying home purchase!`);
        pFhsa = 0;
        pFhsaActive = false;
      } else if (age >= 71 || primaryReached15Years) {
        const destAccount = age >= 71 ? 'RRIF' : (isPrimaryRetired ? 'RRIF / RRSP' : 'RRSP');
        pRrsp += pFhsa;
        yearFhsaWithdrawalOrTransfer += pFhsa;
        fhsaRolledOver = true;
        const triggerReason = age >= 71
          ? 'reaching CRA maximum age 71'
          : `reaching 15-year participation limit (account opened in ${primaryFhsaOpenYear})`;
        notes.push(`🔄 Age ${age} (Year ${currentSimYear}): FHSA reached its 15-year limit (${triggerReason}) and rolled over $${Math.round(pFhsa).toLocaleString()} into ${destAccount} 100% tax-free.`);
        pFhsa = 0;
        pFhsaActive = false;
      }
    }

    // Spouse FHSA check
    if (isCouple && spouse && sFhsaActive && spouseAge !== undefined) {
      const spouseFhsaOpenYear = spouse.fhsaOpenYear || 2023;
      const spouseYearsSinceOpen = currentSimYear - spouseFhsaOpenYear;
      const spouseReached15Years = spouseYearsSinceOpen >= 15;

      if (spouse.fhsaIntent === 'home_purchase' && spouseAge === spouse.fhsaHomePurchaseAge) {
        yearFhsaWithdrawalOrTransfer += sFhsa;
        notes.push(`🏠 Spouse Age ${spouseAge}: Spouse FHSA withdrawn tax-free ($${Math.round(sFhsa).toLocaleString()}) for qualifying home purchase!`);
        sFhsa = 0;
        sFhsaActive = false;
      } else if (spouseAge >= 71 || spouseReached15Years) {
        const destAccount = spouseAge >= 71 ? 'RRIF' : (isSpouseRetired ? 'RRIF / RRSP' : 'RRSP');
        sRrsp += sFhsa;
        yearFhsaWithdrawalOrTransfer += sFhsa;
        fhsaRolledOver = true;
        const triggerReason = spouseAge >= 71
          ? 'reaching CRA maximum age 71'
          : `reaching 15-year participation limit (account opened in ${spouseFhsaOpenYear})`;
        notes.push(`🔄 Spouse Age ${spouseAge} (Year ${currentSimYear}): Spouse FHSA reached its 15-year limit (${triggerReason}) and rolled over $${Math.round(sFhsa).toLocaleString()} into ${destAccount} 100% tax-free.`);
        sFhsa = 0;
        sFhsaActive = false;
      }
    }

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
      let careerDisruptionActive = false;
      let careerDisruptionReduction = 0;
      if (inputs.careerDisruption?.enabled) {
        const cd = inputs.careerDisruption;
        const isDisrupted = cd.isTemporary
          ? age >= cd.shockAge && age < cd.shockAge + (cd.recoveryYears || 2)
          : age >= cd.shockAge;

        if (age === cd.shockAge) {
          pEmploymentIncome *= (1 - cd.reductionPercent / 100);
          notes.push(
            `🚨 Career Disruption at Age ${age}: Wage reduced by ${cd.reductionPercent}% (${
              cd.isTemporary ? `temporary ${cd.recoveryYears || 2}-yr hit` : 'permanent step-down'
            }).`
          );
        } else if (cd.isTemporary && age === cd.shockAge + (cd.recoveryYears || 2)) {
          // Recovery back towards normal level
          pEmploymentIncome *= 1.25;
          notes.push(`💼 Career Recovery at Age ${age}: Wage partially rebounded following ${cd.recoveryYears || 2}-year disruption.`);
        }

        if (isDisrupted) {
          careerDisruptionActive = true;
          careerDisruptionReduction = cd.reductionPercent;
        }
      }

      pYearIncome = Math.max(0, pEmploymentIncome);
      lifetimeEmploymentIncome += pYearIncome;

      pRrspContrib = Math.max(0, rrspAnnualContribution);
      pTfsaContrib = Math.min(TFSA_ANNUAL_LIMIT * inflationFactor, Math.max(0, tfsaAnnualContribution));
      if (pFhsaActive && pCumulativeFhsa < FHSA_LIFETIME_LIMIT) {
        const allowed = Math.min(FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT - pCumulativeFhsa, Math.max(0, fhsaAnnualContribution));
        pFhsaContrib = allowed;
        pCumulativeFhsa += allowed;
      }
      if (hasCustomNonReg) {
        let customContribSum = 0;
        customAccountsState.forEach((acc) => {
          const c = Math.max(0, acc.annualContribution);
          acc.currentContribution = c;
          customContribSum += c;
        });
        pNonRegContrib = customContribSum;
      } else {
        pNonRegContrib = Math.max(0, nonRegAnnualContribution);
      }

      // If salary decreases as a result of a career disruption or downturn, reduce contributions
      const totalPlannedSavings = pRrspContrib + pTfsaContrib + pFhsaContrib + pNonRegContrib;
      if (totalPlannedSavings > 0) {
        let scaleDown = 1.0;

        if (careerDisruptionActive) {
          // Prioritize living expenses: Available surplus = income - living expenses
          const estLivingCost = initialAnnualExpenses * inflationFactor;
          const availableSurplus = Math.max(0, pYearIncome * 0.82 - estLivingCost);

          if (availableSurplus < totalPlannedSavings) {
            scaleDown = Math.min(
              1 - careerDisruptionReduction / 100,
              availableSurplus > 0 ? availableSurplus / totalPlannedSavings : 0.05
            );
            scaleDown = Math.max(0, Math.min(1, scaleDown));

            if (age === inputs.careerDisruption!.shockAge) {
              notes.push(
                `📉 Account Contributions Scaled Down: Reduced by ${Math.round(
                  (1 - scaleDown) * 100
                )}% (to $${Math.round(totalPlannedSavings * scaleDown).toLocaleString()}/yr) to protect household living costs ($${Math.round(estLivingCost).toLocaleString()}/yr) during salary disruption.`
              );
            }
          } else {
            scaleDown = Math.max(0.1, 1 - careerDisruptionReduction / 100);
          }
        } else if (pYearIncome > 0 && totalPlannedSavings > pYearIncome * 0.70) {
          scaleDown = (pYearIncome * 0.70) / totalPlannedSavings;
        }

        if (scaleDown < 1.0) {
          pRrspContrib *= scaleDown;
          pTfsaContrib *= scaleDown;
          pFhsaContrib *= scaleDown;
          pNonRegContrib *= scaleDown;
          if (hasCustomNonReg) {
            customAccountsState.forEach((acc) => {
              acc.currentContribution *= scaleDown;
            });
          }
        }
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

      sRrspContrib = Math.max(0, spouse.rrspAnnualContribution);
      sTfsaContrib = Math.min(TFSA_ANNUAL_LIMIT * inflationFactor, Math.max(0, spouse.tfsaAnnualContribution));
      if (sFhsaActive && sCumulativeFhsa < FHSA_LIFETIME_LIMIT) {
        const allowed = Math.min(FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT - sCumulativeFhsa, Math.max(0, spouse.fhsaAnnualContribution));
        sFhsaContrib = allowed;
        sCumulativeFhsa += allowed;
      }
      sNonRegContrib = Math.max(0, spouse.nonRegAnnualContribution);

      if (spouse.careerDisruption?.enabled && spouseAge !== undefined) {
        const scd = spouse.careerDisruption;
        const isSpouseDisrupted = scd.isTemporary
          ? spouseAge >= scd.shockAge && spouseAge < scd.shockAge + (scd.recoveryYears || 2)
          : spouseAge >= scd.shockAge;
        if (isSpouseDisrupted) {
          const spouseReduction = Math.max(0.1, 1 - scd.reductionPercent / 100);
          sRrspContrib *= spouseReduction;
          sTfsaContrib *= spouseReduction;
          sFhsaContrib *= spouseReduction;
          sNonRegContrib *= spouseReduction;
        }
      }

      sTaxable = Math.max(0, sYearIncome - sRrspContrib - sFhsaContrib);
      sTaxPaid = calculateCanadianTax(sTaxable, province, spouseAge!, 0).totalTax;
    }

    // 2. Investment Returns
    const netNonRegReturn = Math.max(-1, nonRegBaseRate - (nonRegYieldTaxRate / 100));

    const pRrspGrowth = (pRrsp + pRrspContrib) * rrspRate;
    const pTfsaGrowth = (pTfsa + pTfsaContrib) * tfsaRate;
    const pFhsaGrowth = (pFhsa + pFhsaContrib) * fhsaRate;
    let pNonRegGrowth = 0;
    if (hasCustomNonReg && customAccountsState.length > 0) {
      const simYear = 2026 + i;
      customAccountsState.forEach((acc) => {
        let accRate = acc.expectedReturn / 100;

        // Apply Market Stress Test shock if active
        if (stressTest?.enabled) {
          const drop = (stressTest.dropPercent || 10) / 100;
          if (
            (stressTest.timing === 'at_retirement' && age === retirementAge) ||
            (stressTest.timing === 'immediate' && i === 0)
          ) {
            accRate = -drop;
          }
        }

        // GIC Maturity check
        if (acc.category === 'gic') {
          const closeYr = acc.gicCloseYear || 2028;
          if (simYear > closeYr) {
            // After close date -> funds unlocked into liquid taxable pool
            accRate = nonRegBaseRate;
          } else if (simYear === closeYr && !acc.matured) {
            acc.matured = true;
            notes.push(
              `🔒 GIC "${acc.name}" reached close date in ${simYear} ($${Math.round(
                acc.balance
              ).toLocaleString()}) and rolled into liquid Non-Reg.`
            );
          }
        }

        // Apply annual yield tax friction
        const netAccReturn = Math.max(-1, accRate - (nonRegYieldTaxRate / 100));
        const accContrib = isPrimaryRetired ? 0 : (acc.currentContribution || 0);
        const accGrowth = (acc.balance + accContrib) * netAccReturn;

        acc.balance += accContrib + accGrowth;
        pNonRegGrowth += accGrowth;
      });

      // Synchronize overall pNonReg bucket balance
      pNonReg = customAccountsState.reduce((sum, a) => sum + a.balance, 0);
    } else {
      pNonRegGrowth = (pNonReg + pNonRegContrib) * netNonRegReturn;
      pNonReg += pNonRegContrib + pNonRegGrowth;
    }

    const sRrspGrowth = (sRrsp + sRrspContrib) * rrspRate;
    const sTfsaGrowth = (sTfsa + sTfsaContrib) * tfsaRate;
    const sFhsaGrowth = (sFhsa + sFhsaContrib) * fhsaRate;
    const sNonRegGrowth = (sNonReg + sNonRegContrib) * netNonRegReturn;

    const totalGrowth = pRrspGrowth + pTfsaGrowth + pFhsaGrowth + pNonRegGrowth + sRrspGrowth + sTfsaGrowth + sFhsaGrowth + sNonRegGrowth;
    lifetimeInvestmentGrowth += totalGrowth;

    pRrsp += pRrspContrib + pRrspGrowth;
    pTfsa += pTfsaContrib + pTfsaGrowth;
    pFhsa += pFhsaContrib + pFhsaGrowth;
    if (!hasCustomNonReg) {
      pNonReg += pNonRegContrib + pNonRegGrowth;
    }

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

      // If custom non-registered accounts exist, deduct withdrawals from sub-accounts
      if (hasCustomNonReg && customAccountsState.length > 0 && pNonRegWithdrawal > 0) {
        let remainingWithdrawal = pNonRegWithdrawal;
        const simYear = 2026 + i;
        const liquidAccounts = customAccountsState.filter(
          (a) => a.category !== 'gic' || (a.gicCloseYear && simYear >= a.gicCloseYear)
        );
        const totalLiquid = liquidAccounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0);

        if (totalLiquid > 0) {
          const drawAmt = Math.min(totalLiquid, remainingWithdrawal);
          liquidAccounts.forEach((a) => {
            const share = a.balance > 0 ? (a.balance / totalLiquid) * drawAmt : 0;
            a.balance = Math.max(0, a.balance - share);
          });
          remainingWithdrawal -= drawAmt;
        }

        if (remainingWithdrawal > 0) {
          const remainingAccounts = customAccountsState.filter((a) => a.balance > 0);
          const totalRemaining = remainingAccounts.reduce((sum, a) => sum + a.balance, 0);
          if (totalRemaining > 0) {
            remainingAccounts.forEach((a) => {
              const share = a.balance > 0 ? (a.balance / totalRemaining) * remainingWithdrawal : 0;
              a.balance = Math.max(0, a.balance - share);
            });
          }
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
