import {
  RetirementInputs,
  YearSimulationResult,
  SimulationSummary,
  StressTestOptions
} from '../../types/retirement';
import { getRrifMinimumRate } from '../canadianTax';
import { getEffectiveDebts } from '../debtCalculator';
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
  debtPayoffAge: number | null;
  debtPayoffYear: number | null;
}

export interface MilestoneHousingContext {
  ownsHome: boolean;
  isFuturePurchase: boolean;
  futurePurchaseAge: number;
  nominalPurchasePrice: number;
  totalDownPaymentFunded: number;
  initialMortgagePrincipal: number;
  futureActualLoanPrincipal: number;
  additionalInitialMortgagePrincipal?: number;
  additionalFuturePurchases?: Array<{
    id: string;
    name: string;
    age: number;
    nominalPrice: number;
    downPayment: number;
    isPaidOff: boolean;
  }>;
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

  let debtPayoffAge: number | null = null;
  let debtPayoffYear: number | null = null;

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
      mortgagePayoffYear,
      debtPayoffAge,
      debtPayoffYear
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

  // 4. Future Home Purchase Milestones (Primary & Additional Future Properties)
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

  if (hc?.additionalFuturePurchases && hc.additionalFuturePurchases.length > 0) {
    hc.additionalFuturePurchases.forEach((addProp) => {
      const addRow = yearlyResults.find((r) => r.age === addProp.age);
      if (addRow) {
        addRow.milestoneBadges = addRow.milestoneBadges || [];
        addRow.milestoneBadges.push({
          id: `add_home_purchase_${addProp.id}`,
          label: `Property Purchase: ${addProp.name} (Age ${addProp.age})`,
          shortLabel: `🏘️ ${addProp.name}`,
          type: 'home_purchase',
          icon: 'home',
          color: 'indigo',
          description: `Acquired additional property "${addProp.name}" for $${Math.round(addProp.nominalPrice).toLocaleString()}${addProp.isPaidOff ? ' (100% Paid Off / Cash)' : ''}`,
          metricsSummary: addProp.isPaidOff ? 'All-Cash Purchase' : `Down Payment: $${Math.round(addProp.downPayment).toLocaleString()}`
        });
      }
    });
  }

  // 5. Mortgage Freedom Milestone (across primary and all additional properties)
  const hasAnyFutureMortgagedAddProp = Boolean(
    hc?.additionalFuturePurchases?.some((p) => !p.isPaidOff)
  );
  const maxFutureMortgagePurchaseAge = Math.max(
    hc?.isFuturePurchase ? hc.futurePurchaseAge : 0,
    ...(hc?.additionalFuturePurchases?.filter((p) => !p.isPaidOff).map((p) => p.age) ?? [0])
  );
  const hadAnyMortgageLiability = Boolean(
    hc &&
      (hc.initialMortgagePrincipal > 0 ||
        (hc.additionalInitialMortgagePrincipal ?? 0) > 0 ||
        (hc.isFuturePurchase && hc.futureActualLoanPrincipal > 0) ||
        hasAnyFutureMortgagedAddProp)
  );

  if (hc && hadAnyMortgageLiability) {
    for (const row of yearlyResults) {
      if (
        row.remainingMortgage <= 0 &&
        row.homeValue > 0 &&
        !row.homeSoldThisYear &&
        row.age >= maxFutureMortgagePurchaseAge
      ) {
        mortgagePayoffAge = row.age;
        mortgagePayoffYear = row.year;
        row.isMortgageFreeMilestone = true;
        row.milestoneBadges = row.milestoneBadges || [];
        row.milestoneBadges.push({
          id: 'mortgage_free',
          label: 'Mortgage Freedom',
          shortLabel: '🏡 Mortgage Free',
          type: 'mortgage_free',
          icon: 'home',
          color: 'teal',
          description: 'All residential property mortgages fully amortized to $0 balance',
          metricsSummary: 'Mortgage: $0'
        });
        row.notes.push(`🏡 Mortgage Freedom: All property mortgages fully paid off to $0 balance! Cash flow freed from loan service.`);
        break;
      }
    }
  }

  // 5B. Consumer Debt Freedom Milestone (Personal, Student, Vehicle loans paid off)
  const effectiveDebts = getEffectiveDebts(inputs).filter((d) => (Number(d.initialBalance) || 0) > 0);
  const hasModeledConsumerDebts = effectiveDebts.length > 0;
  if (hasModeledConsumerDebts) {
    const initialDebtTotalAtStart = effectiveDebts
      .filter((d) => (d.startAge ?? currentAge) <= currentAge)
      .reduce((sum, d) => sum + (Number(d.initialBalance) || 0), 0);
    const maxDebtStartAge = Math.max(
      currentAge,
      ...effectiveDebts.map((d) => d.startAge ?? currentAge)
    );

    for (let rIdx = 0; rIdx < yearlyResults.length; rIdx++) {
      const row = yearlyResults[rIdx];
      if (row.age < maxDebtStartAge) continue;
      const prevDebt = rIdx === 0 ? initialDebtTotalAtStart : yearlyResults[rIdx - 1].remainingDebt;
      const paidOffThisYear =
        (prevDebt > 0 && row.remainingDebt === 0) ||
        (row.debtPayment > 0 && row.remainingDebt === 0);

      if (paidOffThisYear) {
        debtPayoffAge = row.age;
        debtPayoffYear = row.year;
        row.isDebtFreeMilestone = true;
        row.milestoneBadges = row.milestoneBadges || [];
        row.milestoneBadges.push({
          id: 'debt_free',
          label: 'Consumer Debt Freedom',
          shortLabel: '💳 Debt Free',
          type: 'debt_free',
          icon: 'credit-card',
          color: 'teal',
          description: 'All non-mortgage loans (student loans, vehicle, personal loans) completely paid in full',
          metricsSummary: 'Consumer Debt: $0'
        });
        row.notes.unshift('💳 Consumer Debt Freedom: All fixed personal, vehicle & student loans eliminated! Cashflow freed for investments.');
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

  // 10. Strategic RRSP Break-Even Meltdown Milestone
  if (inputs.drawdownStrategy === 'rrsp_meltdown') {
    const meltdownStartAge = inputs.meltdownStartAge ?? inputs.retirementAge;
    const meltdownRow = yearlyResults.find((r) => r.age === meltdownStartAge);
    const targetStrategy = inputs.meltdownTargetStrategy ?? 'bracket1';
    const ceilingLabel =
      targetStrategy === 'bracket1'
        ? 'Bracket 1 (~$57k)'
        : targetStrategy === 'oas_threshold'
        ? 'OAS Clawback Threshold (~$93k)'
        : 'Even Spread to 71';

    if (meltdownRow) {
      meltdownRow.isRrspMeltdownStartMilestone = true;
      meltdownRow.milestoneBadges = meltdownRow.milestoneBadges || [];
      meltdownRow.milestoneBadges.unshift({
        id: 'rrsp_meltdown_start',
        label: `Strategic RRSP Meltdown (Target: ${ceilingLabel})`,
        shortLabel: '🔥 RRSP Meltdown',
        type: 'meltdown',
        icon: 'flame',
        color: 'blue',
        description: `Initiate strategic early RRSP draw down at Age ${meltdownStartAge} to lock in lower marginal brackets and defuse future RRIF tax spikes`,
        metricsSummary: `Target: ${ceilingLabel}`
      });

      const drawAmt = meltdownRow.rrspWithdrawal > 0 ? ` of $${Math.round(meltdownRow.rrspWithdrawal).toLocaleString()}` : '';
      const taxRate = (meltdownRow.effectiveTaxRate * 100).toFixed(1);
      meltdownRow.notes.unshift(
        `🔥 Strategic Milestone: RRSP Meltdown initiated at Age ${meltdownStartAge}. Accelerated withdrawal${drawAmt} fills lower tax bracket (${taxRate}% eff) up to ${ceilingLabel}, defusing future 53.5% mandatory RRIF taxes and eliminating post-72 OAS clawback.`
      );
    }
  }

  // 11. Discrete Life Events & Cash Flow Shocks
  const activeLifeEvents = (inputs.lifeEvents || []).filter((e) => e.enabled);
  for (const ev of activeLifeEvents) {
    const startAge = Math.round(ev.startAge);
    const evRow = yearlyResults.find((r) => r.age === startAge);
    if (!evRow) continue;

    evRow.milestoneBadges = evRow.milestoneBadges || [];
    const durationLabel = ev.durationYears > 1 ? ` (${ev.durationYears} yrs)` : '';
    const iconEmoji =
      ev.kind === 'inflow'
        ? '💰'
        : ev.category === 'education_resp'
        ? '🎓'
        : ev.category === 'home_renovation'
        ? '🔨'
        : ev.category === 'vehicle_purchase'
        ? '🚗'
        : ev.category === 'sabbatical_travel'
        ? '✈️'
        : ev.category === 'temporary_layoff'
        ? '⏸️'
        : '⚡';

    const color =
      ev.kind === 'inflow' ? 'emerald' : ev.kind === 'income_shock' ? 'amber' : 'rose';

    const shortAmt =
      ev.kind === 'inflow' && ev.amount > 0
        ? ` +$${Math.round(ev.amount / 1000)}k`
        : ev.kind === 'outflow' && ev.amount > 0
        ? ` -$${Math.round(ev.amount / 1000)}k`
        : ev.kind === 'income_shock' && (ev.incomeReductionPercent || 0) > 0
        ? ` -${ev.incomeReductionPercent}% pay`
        : '';

    evRow.milestoneBadges.push({
      id: `life_event_${ev.id}`,
      label: `${ev.name}${durationLabel}`,
      shortLabel: `${iconEmoji} ${ev.name}${shortAmt}`,
      type: 'life_event',
      icon: ev.kind === 'inflow' ? 'trending-up' : 'zap',
      color,
      description:
        ev.kind === 'inflow'
          ? `Expected ${ev.isTaxable ? 'taxable' : 'tax-free'} cash windfall starting at Age ${startAge}`
          : ev.kind === 'income_shock'
          ? `Temporary income shock (-${ev.incomeReductionPercent || 0}% salary)${durationLabel}`
          : `Discrete planned cash outflow${durationLabel} at Age ${startAge}`,
      metricsSummary:
        ev.kind === 'inflow'
          ? `+$${Math.round(evRow.lifeEventInflow || ev.amount).toLocaleString()} nominal`
          : ev.kind === 'outflow'
          ? `-$${Math.round(evRow.lifeEventOutflow || ev.amount).toLocaleString()}/yr nominal`
          : `Income impact: $${Math.round(Math.abs(evRow.lifeEventIncomeImpact || 0)).toLocaleString()}`
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
    mortgagePayoffYear,
    debtPayoffAge,
    debtPayoffYear
  };
}
