import {
  LifeEvent,
  LifeEventCategory,
  LifeEventKind,
  RetirementInputs
} from '../../types/retirement';
import { calculateCanadianTax, TFSA_ANNUAL_LIMIT } from '../canadianTax';
import { ContributionBalances } from './calculateContributions';

export interface LifeEventPreset {
  id: string;
  name: string;
  category: LifeEventCategory;
  kind: LifeEventKind;
  defaultAgeOffset: number;
  durationYears: number;
  amount: number;
  inflationAdjusted: boolean;
  isTaxable?: boolean;
  incomeReductionPercent?: number;
  replacementIncome?: number;
  affectsPerson?: 'primary' | 'spouse' | 'both';
  tagline: string;
  description: string;
}

export const LIFE_EVENT_PRESETS: LifeEventPreset[] = [
  {
    id: 'preset_inheritance',
    name: 'Expected Inheritance',
    category: 'inheritance',
    kind: 'inflow',
    defaultAgeOffset: 15,
    durationYears: 1,
    amount: 150000,
    inflationAdjusted: false,
    isTaxable: false,
    tagline: '+$150k • Tax-Free (CRA)',
    description: 'Tax-free Canadian estate inheritance deposited into TFSA room and non-registered savings.'
  },
  {
    id: 'preset_education_resp',
    name: 'RESP / University Funding',
    category: 'education_resp',
    kind: 'outflow',
    defaultAgeOffset: 10,
    durationYears: 4,
    amount: 20000,
    inflationAdjusted: true,
    tagline: '-$20k/yr × 4 yrs',
    description: 'Four-year post-secondary tuition & residence funding shock beyond regular monthly budgets.'
  },
  {
    id: 'preset_home_renovation',
    name: 'Home Renovation',
    category: 'home_renovation',
    kind: 'outflow',
    defaultAgeOffset: 5,
    durationYears: 1,
    amount: 40000,
    inflationAdjusted: true,
    tagline: '-$40k • One-Time',
    description: 'Major kitchen, roof, or structural upgrade funded from cash flow or liquid reserves.'
  },
  {
    id: 'preset_vehicle_purchase',
    name: 'Vehicle Purchase',
    category: 'vehicle_purchase',
    kind: 'outflow',
    defaultAgeOffset: 4,
    durationYears: 1,
    amount: 45000,
    inflationAdjusted: true,
    tagline: '-$45k • Cash Purchase',
    description: 'Outright cash purchase or major down payment for a replacement family vehicle.'
  },
  {
    id: 'preset_sabbatical_travel',
    name: 'Sabbatical / Travel Year',
    category: 'sabbatical_travel',
    kind: 'income_shock',
    defaultAgeOffset: 6,
    durationYears: 1,
    amount: 15000,
    inflationAdjusted: true,
    incomeReductionPercent: 100,
    replacementIncome: 0,
    affectsPerson: 'primary',
    tagline: '100% Income Pause + $15k Travel',
    description: 'One-year unpaid career sabbatical with an additional travel & living experience budget.'
  },
  {
    id: 'preset_temporary_layoff',
    name: 'Temporary Layoff Period',
    category: 'temporary_layoff',
    kind: 'income_shock',
    defaultAgeOffset: 3,
    durationYears: 1,
    amount: 0,
    inflationAdjusted: true,
    incomeReductionPercent: 50,
    replacementIncome: 14000,
    affectsPerson: 'primary',
    tagline: '6-Mo Layoff (-50% Pay) + EI Offset',
    description: 'Models a 6-month temporary layoff with Employment Insurance / severance taxable replacement.'
  }
];

export interface ActiveLifeEventDetail {
  event: LifeEvent;
  yearOffset: number;
  inflowNominal: number;
  taxableInflowNominal: number;
  taxFreeInflowNominal: number;
  outflowNominal: number;
  incomeReductionPercent: number;
  replacementIncomeNominal: number;
}

export interface YearLifeEventsEvaluation {
  hasEvents: boolean;
  pIncomeMultiplier: number;
  sIncomeMultiplier: number;
  taxFreeInflowNominal: number;
  taxableInflowNominal: number;
  totalInflowNominal: number;
  outflowNominal: number;
  activeEvents: ActiveLifeEventDetail[];
  eventNames: string[];
}

/**
 * Evaluates all enabled discrete life events and cash flow shocks active at a specific age.
 */
export function evaluateLifeEventsForYear(
  age: number,
  inflationFactor: number,
  inputs: RetirementInputs,
  isCouple: boolean
): YearLifeEventsEvaluation {
  const events = inputs.lifeEvents;
  if (!events || events.length === 0) {
    return {
      hasEvents: false,
      pIncomeMultiplier: 1,
      sIncomeMultiplier: 1,
      taxFreeInflowNominal: 0,
      taxableInflowNominal: 0,
      totalInflowNominal: 0,
      outflowNominal: 0,
      activeEvents: [],
      eventNames: []
    };
  }

  let pIncomeMultiplier = 1;
  let sIncomeMultiplier = 1;
  let taxFreeInflowNominal = 0;
  let taxableInflowNominal = 0;
  let outflowNominal = 0;
  const activeEvents: ActiveLifeEventDetail[] = [];
  const eventNames: string[] = [];

  for (const ev of events) {
    if (!ev.enabled) continue;
    const duration = Math.max(1, Math.round(ev.durationYears || 1));
    const startAge = Math.round(ev.startAge);
    if (age < startAge || age >= startAge + duration) continue;

    const scale = ev.inflationAdjusted ? inflationFactor : 1;
    const baseAmt = Math.max(0, Number(ev.amount) || 0) * scale;
    let evInflow = 0;
    let evTaxableInflow = 0;
    let evTaxFreeInflow = 0;
    let evOutflow = 0;
    let evReductionPct = 0;
    let evReplacementNominal = 0;

    if (ev.kind === 'inflow') {
      evInflow = baseAmt;
      if (ev.isTaxable) {
        evTaxableInflow = baseAmt;
        taxableInflowNominal += baseAmt;
      } else {
        evTaxFreeInflow = baseAmt;
        taxFreeInflowNominal += baseAmt;
      }
    } else if (ev.kind === 'outflow') {
      evOutflow = baseAmt;
      outflowNominal += baseAmt;
    } else if (ev.kind === 'income_shock') {
      evReductionPct = Math.min(100, Math.max(0, Number(ev.incomeReductionPercent) || 0));
      const factor = 1 - evReductionPct / 100;
      const target = ev.affectsPerson || 'primary';
      if (target === 'primary' || target === 'both') {
        pIncomeMultiplier = Math.min(pIncomeMultiplier, factor);
      }
      if (isCouple && (target === 'spouse' || target === 'both')) {
        sIncomeMultiplier = Math.min(sIncomeMultiplier, factor);
      }
      if (baseAmt > 0) {
        evOutflow = baseAmt;
        outflowNominal += baseAmt;
      }
      const repl = Math.max(0, Number(ev.replacementIncome) || 0) * scale;
      if (repl > 0) {
        evReplacementNominal = repl;
        evInflow = repl;
        evTaxableInflow = repl;
        taxableInflowNominal += repl;
      }
    }

    activeEvents.push({
      event: ev,
      yearOffset: age - startAge + 1,
      inflowNominal: evInflow,
      taxableInflowNominal: evTaxableInflow,
      taxFreeInflowNominal: evTaxFreeInflow,
      outflowNominal: evOutflow,
      incomeReductionPercent: evReductionPct,
      replacementIncomeNominal: evReplacementNominal
    });
    eventNames.push(ev.name);
  }

  return {
    hasEvents: activeEvents.length > 0,
    pIncomeMultiplier,
    sIncomeMultiplier,
    taxFreeInflowNominal,
    taxableInflowNominal,
    totalInflowNominal: taxFreeInflowNominal + taxableInflowNominal,
    outflowNominal,
    activeEvents,
    eventNames
  };
}

export interface LiquidDeficitDrawResult {
  nonRegWithdrawn: number;
  tfsaWithdrawn: number;
  rrspWithdrawn: number;
  rrspWithdrawalTax: number;
  totalFunded: number;
  remainingGap: number;
}

/**
 * Funds a pre-retirement cash flow deficit (caused by discrete shocks like a $40k renovation,
 * vehicle purchase, university tuition, sabbatical, or temporary layoff) by drawing down
 * liquid savings in tax-smart order: Non-Registered -> TFSA -> RRSP (last resort).
 */
export function fundLiquidCashDeficit(
  deficitAmount: number,
  balances: ContributionBalances,
  isCouple: boolean,
  province: RetirementInputs['province'],
  age: number,
  existingPrimaryTaxable: number
): LiquidDeficitDrawResult {
  if (deficitAmount <= 1) {
    return {
      nonRegWithdrawn: 0,
      tfsaWithdrawn: 0,
      rrspWithdrawn: 0,
      rrspWithdrawalTax: 0,
      totalFunded: 0,
      remainingGap: 0
    };
  }

  let needed = deficitAmount;
  let nonRegWithdrawn = 0;
  let tfsaWithdrawn = 0;
  let rrspWithdrawn = 0;
  let rrspWithdrawalTax = 0;

  // 1. Draw from Primary & Spouse Non-Registered savings first (most liquid, lowest tax disruption)
  const totalNonReg = balances.pNonReg + (isCouple ? balances.sNonReg : 0);
  if (needed > 0 && totalNonReg > 0) {
    const draw = Math.min(needed, totalNonReg);
    const pRatio = balances.pNonReg / totalNonReg;
    const pDraw = draw * pRatio;
    const sDraw = draw - pDraw;

    if (balances.customAccountsState && balances.customAccountsState.length > 0 && balances.pNonReg > 0) {
      const customScale = Math.max(0, 1 - pDraw / balances.pNonReg);
      balances.customAccountsState.forEach((acc) => {
        acc.balance *= customScale;
      });
    }

    balances.pNonReg = Math.max(0, balances.pNonReg - pDraw);
    balances.sNonReg = Math.max(0, balances.sNonReg - sDraw);
    nonRegWithdrawn = draw;
    needed -= draw;
  }

  // 2. Draw from TFSA emergency buffer (100% tax-free, regains contribution room next Jan 1)
  const totalTfsa = balances.pTfsa + (isCouple ? balances.sTfsa : 0);
  if (needed > 0 && totalTfsa > 0) {
    const draw = Math.min(needed, totalTfsa);
    const pRatio = balances.pTfsa / totalTfsa;
    const pDraw = draw * pRatio;
    const sDraw = draw - pDraw;
    balances.pTfsa = Math.max(0, balances.pTfsa - pDraw);
    balances.sTfsa = Math.max(0, balances.sTfsa - sDraw);
    tfsaWithdrawn = draw;
    needed -= draw;
  }

  // 3. Last resort: Early RRSP withdrawal (taxable under CRA rules)
  const totalRrsp = balances.pRrsp + (isCouple ? balances.sRrsp : 0);
  if (needed > 0 && totalRrsp > 0) {
    const baseTax = calculateCanadianTax(existingPrimaryTaxable, province, age, 0);
    const estMarginal = Math.min(0.5, Math.max(0.2, baseTax.marginalRate || 0.3));
    const grossTarget = needed / Math.max(0.45, 1 - estMarginal);
    const grossDraw = Math.min(totalRrsp, grossTarget);

    const pRatio = balances.pRrsp / totalRrsp;
    const pDraw = grossDraw * pRatio;
    const sDraw = grossDraw - pDraw;
    balances.pRrsp = Math.max(0, balances.pRrsp - pDraw);
    balances.sRrsp = Math.max(0, balances.sRrsp - sDraw);

    const taxAfter = calculateCanadianTax(existingPrimaryTaxable + grossDraw, province, age, 0).totalTax;
    const addedTax = Math.max(0, taxAfter - baseTax.totalTax);
    const netFromRrsp = Math.max(0, grossDraw - addedTax);

    rrspWithdrawn = grossDraw;
    rrspWithdrawalTax = addedTax;
    needed = Math.max(0, needed - netFromRrsp);
  }

  return {
    nonRegWithdrawn,
    tfsaWithdrawn,
    rrspWithdrawn,
    rrspWithdrawalTax,
    totalFunded: deficitAmount - needed,
    remainingGap: needed
  };
}

/**
 * Deposits a lump-sum windfall (e.g., tax-free inheritance) into available TFSA room first,
 * then into Non-Registered savings (and syncs custom non-reg accounts if present).
 */
export function depositWindfallToAccounts(
  netWindfallAmount: number,
  balances: ContributionBalances,
  isCouple: boolean,
  inflationFactor: number,
  alreadyContributedTfsaPrimary: number,
  alreadyContributedTfsaSpouse: number
): { tfsaAddedPrimary: number; tfsaAddedSpouse: number; nonRegAddedPrimary: number; nonRegAddedSpouse: number } {
  if (netWindfallAmount <= 1) {
    return { tfsaAddedPrimary: 0, tfsaAddedSpouse: 0, nonRegAddedPrimary: 0, nonRegAddedSpouse: 0 };
  }

  let pool = netWindfallAmount;
  const tfsaAnnualLimit = TFSA_ANNUAL_LIMIT * inflationFactor;

  const pTfsaRoom = Math.max(0, tfsaAnnualLimit - alreadyContributedTfsaPrimary);
  const tfsaAddedPrimary = Math.min(pool, pTfsaRoom);
  balances.pTfsa += tfsaAddedPrimary;
  pool -= tfsaAddedPrimary;

  let tfsaAddedSpouse = 0;
  if (isCouple && pool > 1) {
    const sTfsaRoom = Math.max(0, tfsaAnnualLimit - alreadyContributedTfsaSpouse);
    tfsaAddedSpouse = Math.min(pool, sTfsaRoom);
    balances.sTfsa += tfsaAddedSpouse;
    pool -= tfsaAddedSpouse;
  }

  let nonRegAddedPrimary = 0;
  let nonRegAddedSpouse = 0;
  if (pool > 0) {
    const hasCustomNonReg = Boolean(balances.customAccountsState && balances.customAccountsState.length > 0);
    if (isCouple && !hasCustomNonReg) {
      nonRegAddedPrimary = pool / 2;
      nonRegAddedSpouse = pool / 2;
      balances.pNonReg += nonRegAddedPrimary;
      balances.sNonReg += nonRegAddedSpouse;
    } else {
      nonRegAddedPrimary = pool;
      balances.pNonReg += pool;
      if (hasCustomNonReg) {
        const perAcc = pool / balances.customAccountsState.length;
        balances.customAccountsState.forEach((acc) => {
          acc.balance += perAcc;
        });
      }
    }
  }

  return { tfsaAddedPrimary, tfsaAddedSpouse, nonRegAddedPrimary, nonRegAddedSpouse };
}

/**
 * Generates human-readable audit notes for active discrete life events in a simulation year.
 */
export function formatLifeEventYearNotes(
  age: number,
  evalResult: YearLifeEventsEvaluation,
  incomeLostNominal: number,
  deficitDraw?: LiquidDeficitDrawResult
): string[] {
  const notes: string[] = [];
  for (const item of evalResult.activeEvents) {
    const ev = item.event;
    const durationTag =
      ev.durationYears > 1 ? ` (Yr ${item.yearOffset}/${ev.durationYears})` : '';

    if (ev.kind === 'inflow') {
      const taxLabel = ev.isTaxable ? 'taxable' : '100% tax-free';
      notes.push(
        `💰 Life Event: ${ev.name}${durationTag} (+$${Math.round(item.inflowNominal).toLocaleString()} ${taxLabel} windfall deposited into savings).`
      );
    } else if (ev.kind === 'outflow') {
      notes.push(
        `🧾 Life Event: ${ev.name}${durationTag} (-$${Math.round(item.outflowNominal).toLocaleString()} discrete cash outflow).`
      );
    } else if (ev.kind === 'income_shock') {
      const parts: string[] = [];
      if (item.incomeReductionPercent > 0) {
        parts.push(
          `-${item.incomeReductionPercent}% income${
            incomeLostNominal > 0 ? ` (-$${Math.round(incomeLostNominal).toLocaleString()})` : ''
          }`
        );
      }
      if (item.replacementIncomeNominal > 0) {
        parts.push(`+$${Math.round(item.replacementIncomeNominal).toLocaleString()} EI/severance offset`);
      }
      if (item.outflowNominal > 0) {
        parts.push(`-$${Math.round(item.outflowNominal).toLocaleString()} extra cost`);
      }
      notes.push(
        `⏸️ Life Event: ${ev.name}${durationTag} at Age ${age} (${parts.join(', ') || 'income pause'}).`
      );
    }
  }

  if (deficitDraw && deficitDraw.totalFunded > 100) {
    const sources: string[] = [];
    if (deficitDraw.nonRegWithdrawn > 0) {
      sources.push(`Non-Reg $${Math.round(deficitDraw.nonRegWithdrawn).toLocaleString()}`);
    }
    if (deficitDraw.tfsaWithdrawn > 0) {
      sources.push(`TFSA $${Math.round(deficitDraw.tfsaWithdrawn).toLocaleString()}`);
    }
    if (deficitDraw.rrspWithdrawn > 0) {
      sources.push(
        `RRSP $${Math.round(deficitDraw.rrspWithdrawn).toLocaleString()} (+$${Math.round(deficitDraw.rrspWithdrawalTax).toLocaleString()} tax)`
      );
    }
    notes.push(
      `🏦 Cash Shock Funded from Reserves (Age ${age}): Drew ${sources.join(' + ')} to cover temporary cash flow shortfall.`
    );
  }

  return notes;
}
