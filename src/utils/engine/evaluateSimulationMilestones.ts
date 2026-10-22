import {
  RetirementInputs,
  YearSimulationResult,
  SimulationSummary,
  StressTestOptions
} from '../../types/retirement';
import { getRrifMinimumRate } from '../canadianTax';
import { fastSimulateEndNetWorth } from './fastSimulator';

export interface MilestoneSimulationOptions {
  stopContributionsAge?: number;
  isCoastCheck?: boolean;
}

export interface MilestoneEvaluationResult {
  crossoverAge: number | null;
  crossoverYear: number | null;
  crossoverInvestmentGrowth: number;
  crossoverLivingExpenses: number;
  coastFireAge: number | null;
  coastFireYear: number | null;
  coastFireNetWorth: number;
  millionaireAge: number | null;
  millionaireYear: number | null;
  mortgagePayoffAge: number | null;
  mortgagePayoffYear: number | null;
}

export interface MilestoneHousingContext {
  ownsHome: boolean;
  isFuturePurchase: boolean;
  futurePurchaseAge: number;
  nominalPurchasePrice: number;
  totalDownPaymentFunded: number;
  initialMortgagePrincipal: number;
  futureActualLoanPrincipal: number;
}

/**
 * Evaluates strategic milestone achievements across the simulation lifecycle:
 * - Crossover Point (Investment Returns > Living Expenses)
 * - Coast FIRE (Zero-contribution viability)
 * - Millionaire ($1M+ Net Worth)
 * - Future Home Purchase & Down Payment Deployment
 * - Mortgage Freedom ($0 remaining debt)
 * - Target Retirement Day (Accumulation -> Decumulation transition)
 * - Peak Lifetime Wealth Apex
 * - CPP & OAS Pension Starts
 * - CRA Statutory Mandatory RRIF Conversion
 */
export function evaluateSimulationMilestones(
  yearlyResults: YearSimulationResult[],
  inputs: RetirementInputs,
  simulationOptions?: MilestoneSimulationOptions,
  stressTest?: StressTestOptions,
  peakNetWorthAge?: number,
  housingContext?: MilestoneHousingContext,
  runSubSimulation?: (
    inputs: RetirementInputs,
    stressTest?: StressTestOptions,
    opts?: MilestoneSimulationOptions
  ) => { yearlyResults: YearSimulationResult[]; summary: SimulationSummary }
): MilestoneEvaluationResult {
  let crossoverAge: number | null = null;
  let crossoverYear: number | null = null;
  let crossoverInvestmentGrowth = 0;
  let crossoverLivingExpenses = 0;

  let coastFireAge: number | null = null;
  let coastFireYear: number | null = null;
  let coastFireNetWorth = 0;

  let millionaireAge: number | null = null;
  let millionaireYear: number | null = null;

  let mortgagePayoffAge: number | null = null;
  let mortgagePayoffYear: number | null = null;

  if (simulationOptions?.isCoastCheck) {
    return {
      crossoverAge,
      crossoverYear,
      crossoverInvestmentGrowth,
      crossoverLivingExpenses,
      coastFireAge,
      coastFireYear,
      coastFireNetWorth,
      millionaireAge,
      millionaireYear,
      mortgagePayoffAge,
      mortgagePayoffYear
    };
  }

  const { currentAge, retirementAge, lifeExpectancy, cppStartAge, oasStartAge } = inputs;
  const hc = housingContext;

  // 1. Crossover Point: The point at which returns on investment start outgrowing annual living expenses
  for (const row of yearlyResults) {
    if (row.totalInvestmentGrowth >= row.targetSpendingNominal && row.targetSpendingNominal > 0) {
      crossoverAge = row.age;
      crossoverYear = row.year;
      crossoverInvestmentGrowth = row.totalInvestmentGrowth;
      crossoverLivingExpenses = row.targetSpendingNominal;
      row.isCrossoverMilestone = true;
      const growthFormatted = Math.round(row.totalInvestmentGrowth).toLocaleString();
      const spendingFormatted = Math.round(row.targetSpendingNominal).toLocaleString();
      row.notes.unshift(
        `🚀 Crossover Milestone: Annual investment returns ($${growthFormatted}/yr) outgrow required annual living expenses ($${spendingFormatted}/yr)! Portfolio compounding surpasses household spending.`
      );
      row.milestoneBadges = row.milestoneBadges || [];
      row.milestoneBadges.push({
        id: 'crossover',
        label: 'Crossover Point',
        shortLabel: '🚀 Returns > Expenses',
        type: 'crossover',
        icon: 'zap',
        color: 'emerald',
        description: 'Annual investment returns surpass required annual living expenses',
        metricsSummary: `Returns: $${growthFormatted}/yr vs Living: $${spendingFormatted}/yr`
      });
      break;
    }
  }

  // 2. Coast FIRE Milestone: Point where zero future contributions still fully funds intended retirement
  // Optimized: Use fastSimulateEndNetWorth with logarithmic convergence instead of full sequential simulations
  if (fastSimulateEndNetWorth(inputs, currentAge, stressTest).isFullyFunded) {
    coastFireAge = currentAge;
  } else if (!fastSimulateEndNetWorth(inputs, retirementAge, stressTest).isFullyFunded) {
    coastFireAge = null;
  } else {
    let low = currentAge + 1;
    let high = retirementAge;
    let best = retirementAge;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testRes = fastSimulateEndNetWorth(inputs, mid, stressTest);
      if (testRes.isFullyFunded) {
        best = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    coastFireAge = best;
  }

    if (coastFireAge !== null) {
      const coastRow = yearlyResults.find((r) => r.age === coastFireAge);
      if (coastRow) {
        coastFireYear = coastRow.year;
        coastFireNetWorth = coastRow.totalNetWorth;
        coastRow.isCoastFireMilestone = true;
        coastRow.milestoneBadges = coastRow.milestoneBadges || [];
        const nwFormatted = Math.round(coastRow.totalNetWorth).toLocaleString();
        coastRow.milestoneBadges.push({
          id: 'coast_fire',
          label: 'Coast FIRE / Zero-Contribution',
          shortLabel: '⚓ Coast FIRE',
          type: 'coast_fire',
          icon: 'anchor',
          color: 'cyan',
          description: 'Zero further contributions required to fully fund retirement through life expectancy',
          metricsSummary: `Invested Assets: $${nwFormatted}`
        });
        const coastMsg =
          coastFireAge === currentAge
            ? `⚓ Coast FIRE Milestone: Zero-contribution viability achieved today! Your current portfolio ($${nwFormatted}) alone will compound to fully fund all intended retirement expenses through age ${lifeExpectancy} with $0 future contributions required.`
            : `⚓ Coast FIRE Milestone: Zero-contribution viability reached at Age ${coastFireAge}! Even if all savings contributions stop at age ${coastFireAge}, investment growth alone will fully fund retirement expenses through age ${lifeExpectancy}.`;
        coastRow.notes.unshift(coastMsg);
      }
    }

  // 3. Millionaire Milestone ($1M+ Net Worth)
  for (const row of yearlyResults) {
    if (row.totalNetWorth >= 1000000) {
      millionaireAge = row.age;
      millionaireYear = row.year;
      row.isMillionaireMilestone = true;
      row.milestoneBadges = row.milestoneBadges || [];
      const nwFormatted = Math.round(row.totalNetWorth).toLocaleString();
      row.milestoneBadges.push({
        id: 'millionaire',
        label: 'Millionaire Milestone',
        shortLabel: '💎 $1M Net Worth',
        type: 'millionaire',
        icon: 'diamond',
        color: 'blue',
        description: 'Household net worth reaches $1,000,000 milestone',
        metricsSummary: `Net Worth: $${nwFormatted}`
      });
      row.notes.push(`💎 Millionaire Milestone: Total Net Worth surpasses $1,000,000 ($${nwFormatted}).`);
      break;
    }
  }

  // 4. Future Home Purchase Milestone
  if (hc && hc.isFuturePurchase) {
    const buyRow = yearlyResults.find((r) => r.age === hc.futurePurchaseAge);
    if (buyRow) {
      buyRow.milestoneBadges = buyRow.milestoneBadges || [];
      buyRow.milestoneBadges.push({
        id: 'home_purchase',
        label: `Home Purchase (Age ${hc.futurePurchaseAge})`,
        shortLabel: '🏡 Home Purchase',
        type: 'home_purchase',
        icon: 'home',
        color: 'amber',
        description: `Transitioned from renting to homeowner: purchased primary residence for $${Math.round(hc.nominalPurchasePrice).toLocaleString()}`,
        metricsSummary: `Down Payment: $${Math.round(hc.totalDownPaymentFunded).toLocaleString()}`
      });
    }
  }

  // 5. Mortgage Freedom Milestone
  if (hc && hc.ownsHome && (hc.initialMortgagePrincipal > 0 || (hc.isFuturePurchase && hc.futureActualLoanPrincipal > 0))) {
    for (const row of yearlyResults) {
      if (
        row.remainingMortgage <= 0 &&
        row.homeValue > 0 &&
        !row.homeSoldThisYear &&
        (!hc.isFuturePurchase || row.age >= hc.futurePurchaseAge)
      ) {
        mortgagePayoffAge = row.age;
        mortgagePayoffYear = row.year;
        row.isMortgageFreeMilestone = true;
        row.milestoneBadges = row.milestoneBadges || [];
        row.milestoneBadges.push({
          id: 'mortgage_free',
          label: 'Mortgage Freedom',
          shortLabel: '🏡 Debt Free',
          type: 'mortgage_free',
          icon: 'home',
          color: 'teal',
          description: 'Primary residence mortgage fully amortized to $0 balance',
          metricsSummary: 'Mortgage: $0'
        });
        row.notes.push(`🏡 Mortgage Freedom: Home mortgage loan fully paid off to $0 balance! Cash flow freed from loan service.`);
        break;
      }
    }
  }

  // 6. Target Retirement Day Milestone
  const retRow = yearlyResults.find((r) => r.age === retirementAge);
  if (retRow) {
    retRow.milestoneBadges = retRow.milestoneBadges || [];
    const nwFormatted = Math.round(retRow.totalNetWorth).toLocaleString();
    retRow.milestoneBadges.push({
      id: 'retirement',
      label: 'Target Retirement Day',
      shortLabel: '🎯 Retire Target',
      type: 'retirement',
      icon: 'target',
      color: 'rose',
      description: 'Transition from accumulation to decumulation phase',
      metricsSummary: `Starting Nest Egg: $${nwFormatted}`
    });
    retRow.notes.push(`🎯 Target Retirement: Employment income ends and portfolio decumulation begins. Starting net worth: $${nwFormatted}.`);
  }

  // 7. Peak Lifetime Wealth Milestone
  const targetPeakAge = peakNetWorthAge ?? retirementAge;
  const peakRow = yearlyResults.find((r) => r.age === targetPeakAge);
  if (peakRow && targetPeakAge !== retirementAge) {
    peakRow.isPeakWealthMilestone = true;
    peakRow.milestoneBadges = peakRow.milestoneBadges || [];
    const peakNwFormatted = Math.round(peakRow.totalNetWorth).toLocaleString();
    peakRow.milestoneBadges.push({
      id: 'peak_wealth',
      label: 'Peak Lifetime Wealth Apex',
      shortLabel: '🏔️ Peak Wealth',
      type: 'peak_net_worth',
      icon: 'mountain',
      color: 'indigo',
      description: 'Maximum lifetime net worth apex before decumulation',
      metricsSummary: `Peak Net Worth: $${peakNwFormatted}`
    });
    peakRow.notes.push(`🏔️ Peak Net Worth: Lifetime wealth apex of $${peakNwFormatted} achieved at Age ${targetPeakAge}.`);
  }

  // 8. CPP & OAS Pension Starts
  const cppRow = yearlyResults.find((r) => r.age === cppStartAge);
  if (cppRow && cppRow.cppIncome > 0) {
    cppRow.milestoneBadges = cppRow.milestoneBadges || [];
    cppRow.milestoneBadges.push({
      id: 'cpp_start',
      label: 'CPP Pension Benefit Start',
      shortLabel: '🏛️ CPP Start',
      type: 'pension',
      icon: 'landmark',
      color: 'violet',
      description: 'Canada Pension Plan monthly retirement benefits begin',
      metricsSummary: `CPP Benefit: $${Math.round(cppRow.cppIncome).toLocaleString()}/yr`
    });
  }

  const oasRow = yearlyResults.find((r) => r.age === oasStartAge);
  if (oasRow && oasRow.oasNetIncome > 0) {
    oasRow.milestoneBadges = oasRow.milestoneBadges || [];
    oasRow.milestoneBadges.push({
      id: 'oas_start',
      label: 'OAS Pension Benefit Start',
      shortLabel: '🏛️ OAS Start',
      type: 'pension',
      icon: 'landmark',
      color: 'emerald',
      description: 'Old Age Security monthly benefits begin',
      metricsSummary: `OAS Net: $${Math.round(oasRow.oasNetIncome).toLocaleString()}/yr`
    });
  }

  // 9. CRA Mandatory RRIF Conversion
  const rrifRow = yearlyResults.find((r) => r.age === 72);
  if (rrifRow && rrifRow.rrspBalance > 0) {
    rrifRow.milestoneBadges = rrifRow.milestoneBadges || [];
    rrifRow.milestoneBadges.push({
      id: 'rrif_mandatory',
      label: 'CRA RRIF Mandatory Conversion',
      shortLabel: '📜 RRIF Minimums',
      type: 'rrif',
      icon: 'file-text',
      color: 'amber',
      description: 'CRA statutory mandatory minimum RRIF withdrawal rules active',
      metricsSummary: `Statutory Rate: ${(getRrifMinimumRate(72) * 100).toFixed(2)}%`
    });
  }

  return {
    crossoverAge,
    crossoverYear,
    crossoverInvestmentGrowth,
    crossoverLivingExpenses,
    coastFireAge,
    coastFireYear,
    coastFireNetWorth,
    millionaireAge,
    millionaireYear,
    mortgagePayoffAge,
    mortgagePayoffYear
  };
}
