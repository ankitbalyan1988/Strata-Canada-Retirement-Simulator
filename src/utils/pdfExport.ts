import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RetirementInputs, SimulationSummary, YearSimulationResult } from '../types/retirement';
import { PROVINCIAL_BRACKETS } from './canadianTax';
import { calculateEstatePlan, DEFAULT_ESTATE_INPUTS } from './estatePlanning';
import { calculateExpatRetirementPlan } from './expatSimulator';
import { DEFAULT_EXPAT_INPUTS, EXPAT_DESTINATIONS } from './expatCountries';
import { calculateWhatIfSimulation } from './whatIfCalculator';

/**
 * AI narrative structure containing bespoke markdown advisory text for each section.
 */
export interface AiPlanNarrative {
  executiveSummary?: string;
  accumulationStrategy?: string;
  realEstate?: string;
  decumulation?: string;
  advancedPlanning?: string;
  riskAssessment?: string;
}

/**
 * Configuration options for generating the PDF report.
 */
export interface PdfExportOptions {
  clientName?: string;
  aiNarrative?: AiPlanNarrative;
}

/**
 * Brand color palette matching the Strata UI
 */
const BRAND = {
  darkSlate: [15, 23, 42] as [number, number, number],   // #0F172A
  slate800: [30, 41, 59] as [number, number, number],    // #1E293B
  slate700: [51, 65, 85] as [number, number, number],    // #334155
  slate600: [71, 85, 105] as [number, number, number],   // #475569
  slate500: [100, 116, 139] as [number, number, number], // #64748B
  slate400: [148, 163, 184] as [number, number, number], // #94A3B8
  slate300: [203, 213, 225] as [number, number, number], // #CBD5E1
  slate200: [226, 232, 240] as [number, number, number], // #E2E8F0
  slate100: [241, 245, 249] as [number, number, number], // #F1F5F9
  slate50: [248, 250, 252] as [number, number, number],  // #F8FAFC
  mapleRed: [225, 29, 72] as [number, number, number],   // #E11D48
  emerald: [16, 185, 129] as [number, number, number],   // #10B981
  indigo: [79, 70, 229] as [number, number, number],     // #4F46E5
  amber: [217, 119, 6] as [number, number, number],      // #D97706
  white: [255, 255, 255] as [number, number, number]
};

/**
 * Formats numeric values to Canadian dollar currency representation.
 */
function formatCur(val: number): string {
  if (val === 0) return '$0';
  return `$${Math.round(val).toLocaleString('en-CA')}`;
}

/**
 * Parses markdown strings (handling bold tokens **text** and bullet items * text)
 * and prints wrapped, styled text to the jsPDF document.
 */
export function printMarkdownToPdf(
  doc: jsPDF,
  text: string,
  startX: number,
  startY: number,
  maxWidth: number,
  options?: {
    fontSize?: number;
    lineHeight?: number;
    textColor?: [number, number, number];
    boldColor?: [number, number, number];
  }
): number {
  if (!text) return startY;

  const fontSize = options?.fontSize ?? 8.5;
  const lineHeight = options?.lineHeight ?? 12.5;
  const textColor = options?.textColor ?? BRAND.slate700;
  const boldColor = options?.boldColor ?? BRAND.darkSlate;

  doc.setFontSize(fontSize);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  let cursorY = startY;
  const paragraphs = text.split('\n');

  for (let p of paragraphs) {
    p = p.trim();
    if (!p) {
      cursorY += lineHeight * 0.35;
      continue;
    }

    let isBullet = false;
    let isHeader = false;
    let indent = 0;

    if (p.startsWith('### ')) {
      isHeader = true;
      p = p.substring(4).trim();
    } else if (p.startsWith('* ') || p.startsWith('- ') || p.startsWith('• ')) {
      isBullet = true;
      indent = 13;
      p = p.substring(2).trim();
    }

    if (isHeader) {
      cursorY += 3;
      doc.setFontSize(fontSize + 1.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
      doc.text(p, startX, cursorY);
      cursorY += lineHeight + 2;
      doc.setFontSize(fontSize);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      continue;
    }

    if (isBullet) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
      doc.text('•', startX + 2, cursorY);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    }

    const contentX = startX + indent;
    const availableWidth = maxWidth - indent;

    // Parse bold syntax **text** into token objects
    const parts = p.split(/(\*\*.*?\*\*)/g);
    const tokens: { text: string; bold: boolean }[] = [];

    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        tokens.push({ text: part.slice(2, -2), bold: true });
      } else {
        tokens.push({ text: part, bold: false });
      }
    }

    // Split tokens into individual words and whitespace tokens for precise wrapping
    const words: { word: string; bold: boolean }[] = [];
    for (const token of tokens) {
      const splitWords = token.text.split(/(\s+)/);
      for (const sw of splitWords) {
        if (!sw) continue;
        words.push({ word: sw, bold: token.bold });
      }
    }

    let lineTokens: { word: string; bold: boolean; width: number }[] = [];
    let currentLineWidth = 0;

    const flushLine = () => {
      let xOffset = contentX;
      for (const item of lineTokens) {
        doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
        if (item.bold) {
          doc.setTextColor(boldColor[0], boldColor[1], boldColor[2]);
        } else {
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        }
        doc.text(item.word, xOffset, cursorY);
        xOffset += item.width;
      }
      cursorY += lineHeight;
      lineTokens = [];
      currentLineWidth = 0;
    };

    for (const item of words) {
      doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
      const wWidth = doc.getTextWidth(item.word);

      if (currentLineWidth + wWidth > availableWidth && lineTokens.length > 0 && item.word.trim()) {
        flushLine();
      }

      lineTokens.push({ word: item.word, bold: item.bold, width: wWidth });
      currentLineWidth += wWidth;
    }

    if (lineTokens.length > 0) {
      flushLine();
    }

    cursorY += 1.5;
  }

  return cursorY;
}

/**
 * Draws the recurring top header bar for pages 2 through 5.
 */
function drawPageHeader(
  doc: jsPDF,
  pageTitle: string,
  sectionTag: string,
  pageWidth: number,
  clientName?: string
) {
  // Dark slate bar
  doc.setFillColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Red accent line
  doc.setFillColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
  doc.rect(0, 40, pageWidth, 2.5, 'F');

  // Brand Name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.white[0], BRAND.white[1], BRAND.white[2]);
  doc.text('Strata', 40, 24);

  const brandWidth = doc.getTextWidth('Strata');

  // Separator & Page Title
  doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
  doc.text(' | ', 40 + brandWidth, 24);

  doc.setTextColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(pageTitle, 40 + brandWidth + 12, 24);

  // Section Tag & Client Name on Top Right
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.slate400[0], BRAND.slate400[1], BRAND.slate400[2]);
  const rightTag = clientName ? `${clientName.toUpperCase()} • ${sectionTag.toUpperCase()}` : sectionTag.toUpperCase();
  doc.text(rightTag, pageWidth - 40, 24, { align: 'right' });
}

/**
 * Renders an advisory narrative callout container box with title and accent bar.
 */
function renderNarrativeCard(
  doc: jsPDF,
  title: string,
  markdownText: string,
  x: number,
  y: number,
  width: number,
  minHeight: number
): number {
  doc.setFillColor(BRAND.slate50[0], BRAND.slate50[1], BRAND.slate50[2]);
  doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y, width, minHeight, 4, 4, 'FD');

  // Left Maple Red Accent Pill
  doc.setFillColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
  doc.roundedRect(x, y, 3.5, minHeight, 1.5, 1.5, 'F');

  // Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
  doc.text(title, x + 14, y + 15);

  // Subtitle / tag
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
  doc.text('Bespoke Advisory Memorandum', x + width - 12, y + 15, { align: 'right' });

  // Divider
  doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
  doc.line(x + 12, y + 20, x + width - 12, y + 20);

  // Body Narrative
  const endY = printMarkdownToPdf(doc, markdownText, x + 14, y + 32, width - 28, {
    fontSize: 7.75,
    lineHeight: 11.5,
    textColor: BRAND.slate700,
    boldColor: BRAND.darkSlate
  });

  return Math.max(y + minHeight, endY + 8);
}

/**
 * Generates bespoke default advisory narratives for each module when not provided by caller.
 */
function generateDefaultNarratives(
  inputs: RetirementInputs,
  summary: SimulationSummary,
  provinceName: string,
  yearlyResults?: YearSimulationResult[]
): Required<AiPlanNarrative> {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouseInfo = isCouple && inputs.spouse ? ` and ${inputs.spouse.name || 'Spouse'}` : '';
  const fundedText = summary.isFullyFunded
    ? `**100% Fully Funded** across the entire ${summary.totalYearsInRetirement}-year planning horizon to Age ${inputs.lifeExpectancy}`
    : `facing capital depletion at **Age ${summary.portfolioDepletionAge}** (${summary.yearsFunded} of ${summary.totalYearsInRetirement} years funded)`;

  const strategyDescriptions: Record<string, string> = {
    tax_efficient: 'Tax-Efficient Sequencing (drawing Non-Registered accounts first, followed by RRSP/RRIF up to bracket limits, preserving TFSA as a tax-free reserve)',
    rrsp_meltdown: 'RRSP Meltdown (proactively accelerating RRSP withdrawals prior to Age 71 to minimize lifetime OAS clawback recovery taxes and statutory RRIF spikes)',
    proportional: 'Proportional Distribution (withdrawing ratably across all account categories)',
    tfsa_first: 'TFSA-First Drawdown (liquidating tax-free assets early)'
  };

  const remainingMortgage = yearlyResults?.[0]?.remainingMortgage ?? Math.max(0, (inputs.realEstate?.costOfHome ?? 0) - (inputs.realEstate?.downPayment ?? 0));

  return {
    executiveSummary: [
      `### Executive Financial Assessment`,
      `* **Plan Status**: Your Canadian retirement trajectory is currently ${fundedText}. At target retirement Age **${inputs.retirementAge}**, your household portfolio projects a starting nest egg of **${formatCur(summary.netWorthAtRetirement)}**, peaking at **${formatCur(summary.peakNetWorth)}** at Age **${summary.peakNetWorthAge}**.`,
      `* **Lifestyle Purchasing Power**: Target retirement living expenses are established at **${formatCur(inputs.targetRetirementSpendingToday)}/year** in today's purchasing power, converting to an average inflation-adjusted spend of **${formatCur(summary.averageAnnualRetirementSpendNominal / 12)}/month** throughout decumulation.`,
      `* **Guaranteed Pensions**: Government pensions provide foundational security. Canada Pension Plan (CPP) beginning at Age **${inputs.cppStartAge}** and Old Age Security (OAS) at Age **${inputs.oasStartAge}** deliver cumulative lifetime pension income of **${formatCur(summary.lifetimeCppReceived + summary.lifetimeOasReceived)}**.`,
      `* **Tax Efficiency**: Through strategic account sequencing in **${provinceName}**, estimated lifetime tax exposure across accumulation and retirement is modeled at **${formatCur(summary.lifetimeTaxesPaid)}** with an average post-retirement effective tax rate of **${(summary.averageEffectiveTaxInRetirement * 100).toFixed(1)}%**.`
    ].join('\n'),

    accumulationStrategy: [
      `### Accumulation & Savings Discipline`,
      `* **Registered Capital Maximization**: Prioritizing annual contributions into your **TFSA (${formatCur(inputs.tfsaAnnualContribution)}/yr)** and **RRSP (${formatCur(inputs.rrspAnnualContribution)}/yr)** maximizes statutory tax deductions against current employment income while compounding returns sheltered from annual CRA accrual taxes.`,
      `* **First Home Savings Account (FHSA)**: Your FHSA balance of **${formatCur(inputs.fhsaBalance)}** provides a dedicated Canadian tax shelter. Under statutory rules, it must be deployed for a qualifying home purchase or rolled over tax-free into your RRSP/RRIF within 15 years of account establishment (by ${((inputs.fhsaOpenYear || 2023) + 15)}).`,
      `* **Non-Registered Asset Allocation**: Taxable investment portfolios are modeled with a yield tax drag of **${inputs.nonRegYieldTaxRate}%**, optimizing for tax-efficient Canadian eligible dividend tax credits and deferred capital gains over ordinary income.`,
      `* **Household Resilience**: Cash flow projections confirm that maintaining current monthly savings pacing sustains long-term compounding velocity without compromising pre-retirement living standards${spouseInfo}.`
    ].join('\n'),

    realEstate: [
      `### Real Estate Equity & Housing Strategy`,
      inputs.realEstate?.ownsHome
        ? [
            `* **Primary Residence Valuation**: Your home, with a current market valuation of **${formatCur(inputs.realEstate.currentMarketValue)}** and remaining mortgage debt of **${formatCur(remainingMortgage)}**, represents a cornerstone of household equity (${inputs.realEstate.ownershipSharePercent}% ownership share).`,
            `* **Principal Residence Exemption**: Under Section 40(2)(b) of the Canadian Income Tax Act, 100% of accumulated capital gains on your primary residence remain completely tax-exempt upon eventual disposition.`,
            inputs.realEstate.planToSellHome
              ? `* **Downsizing & Liquidation Plan**: Modeling a planned disposition at Age **${inputs.realEstate.sellHomeAge}** captures an estimated net liquid proceed of **${formatCur(inputs.realEstate.currentMarketValue * Math.pow(1 + (inputs.realEstate.annualAppreciationRate || 3.2) / 100, Math.max(0, inputs.realEstate.sellHomeAge - inputs.currentAge)) * 0.955)}** (reflecting 4.5% transaction friction), reinvested directly into income-generating non-registered reserves.`
              : `* **Long-Term Equity Retention**: Maintaining home ownership provides permanent housing security, debt freedom upon mortgage amortization, and serves as an unencumbered emergency buffer or legacy asset for estate transfer.`
          ].join('\n')
        : [
            `* **Tenant & Rental Capital Strategy**: By opting for residential tenancy, your household avoids property transfer taxes, municipal realty taxes, and ongoing maintenance obligations.`,
            `* **Capital Velocity**: Surpluses that would otherwise service illiquid property equity are deployed into compounding liquid registered and non-registered Canadian investment vehicles.`
          ].join('\n')
    ].join('\n'),

    decumulation: [
      `### Actuarial Decumulation & Pension Architecture`,
      `* **Execution Strategy**: The simulation deploys **${strategyDescriptions[inputs.drawdownStrategy] || inputs.drawdownStrategy}**. This framework carefully orchestrates drawdowns to keep taxable income beneath provincial marginal brackets.`,
      `* **OAS Recovery Tax (Clawback) Safeguard**: Canada Revenue Agency begins imposing a 15% recovery tax on net world income exceeding the indexed threshold (~$93,208). Your plan proactively mitigates clawback risk through balanced account drawdown timing.`,
      `* **Mandatory Age 71 RRIF Conversion**: By December 31 of the year you turn Age **71**, all RRSP assets must convert to a Registered Retirement Income Fund (RRIF). Prescribed minimum distributions (beginning at 5.40% at Age 72 and escalating annually) are integrated into net cash flow projections.`,
      `* **TFSA Strategic Reserve**: Preserving TFSA balances creates a tax-free emergency fund and medical reserve that never triggers income-tested government benefit clawbacks or increases net taxable income.`
    ].join('\n'),

    advancedPlanning: [
      `### Estate Preservation & Cross-Border Architecture`,
      `* **Deemed Disposition at Death**: Under CRA Section 70(5), taxpayers are deemed to have disposed of all capital and registered assets at fair market value immediately prior to death. Spousal rollover provisions (Section 70(6)) and direct beneficiary designations defer immediate terminal tax recognition.`,
      `* **Provincial Probate Minimization**: Designating named direct beneficiaries on all RRSP, RRIF, and TFSA contracts allows registered assets to bypass estate administration taxes (probate) and pass directly to designated heirs.`,
      inputs.expat?.planToEmigrate
        ? `* **Non-Resident Expat Structuring**: Planning emigration to destination abroad at Age **${inputs.expat.emigrationAge}** triggers CRA Section 128.1 departure tax assessments on non-registered capital gains while unlocking significant purchasing power parity enhancements.`
        : `* **Domestic Succession Governance**: Regular review of statutory wills, enduring powers of attorney for property, and personal care directives ensures seamless execution of your estate legacy according to provincial statutory mandates.`
    ].join('\n'),

    riskAssessment: [
      `### Actuarial Risk Assessment, Modeling Boundaries & Asset Safety`,
      `* **Projection Limitations & Volatility Reality**: Deterministic financial models assume steady compound annual growth (e.g. ${inputs.accountReturns?.rrspReturn ?? 6.5}% RRSP, ${inputs.accountReturns?.tfsaReturn ?? 7.0}% TFSA), but real Canadian capital markets exhibit cyclical volatility, fat-tail drawdowns, and sequence-of-returns risk. An adverse economic shock during early decumulation forces withdrawals from depressed balances, creating permanent capital loss that straight-line arithmetic cannot capture without dynamic spending rules.`,
      `* **Statutory & Fiscal Policy Boundaries**: All projected Canadian tax brackets, CPP maximum pensionable earnings (YMPE/YAMPE), and OAS clawback recovery thresholds (~$93,208) are modeled under statutory CRA inflation indexation. While legislated to track CPI, future governments possess discretionary power to amend capital gains inclusion rates, modify progressive brackets, or recalibrate entitlement formulas.`,
      `* **TFSA Asset Class Safety (Ultra-Resilient)**: Your Tax-Free Savings Account balance (${formatCur(inputs.tfsaBalance)}) represents your most secure financial fortress. Both investment growth and withdrawals are 100% tax-free, omitted from CRA Net World Income calculations, and completely immune to triggering OAS clawbacks or GIS reductions, serving as an ideal bear-market cushion.`,
      `* **Registered RRSP/RRIF Vulnerability (Moderate-to-High Exposure)**: Tax-deferred balances (${formatCur(inputs.rrspBalance)}) carry vulnerability to inflation-induced bracket creep. Mandatory RRIF minimum withdrawal schedules (starting at 5.40% at Age 72 and escalating annually) enforce taxable income realizations regardless of market conditions, increasing tax drag during down markets.`,
      inputs.realEstate?.ownsHome
        ? `* **Real Estate Equity Defense (${inputs.realEstate.ownershipSharePercent}% Household Ownership)**: Your primary residence (${formatCur(inputs.realEstate.currentMarketValue)}) serves as an unencumbered capital hedge completely exempt from capital gains under Section 40(2)(b) (Principal Residence Exemption). While illiquid for everyday cash flow, it provides substantial ultimate downside security against catastrophic portfolio depletion.`
        : `* **Rental Cash Flow Exposure**: Maintaining residential tenancy exposes baseline living expenses to ongoing shelter inflation. Maintaining a dedicated liquid non-registered and TFSA liquidity reserve is essential to prevent premature portfolio exhaustion.`,
      `* **Actionable Risk Mitigations**: To insulate your plan against adverse What-If scenarios: (1) Maintain 18-24 months of essential retirement living expenses in cash or short-term GICs within your TFSA to prevent forced equity liquidations in bear markets; (2) Implement dynamic spending guardrails by reducing discretionary spending by 10% during negative return years; and (3) Consider delaying CPP to Age 70 to lock in an additional +28.8% to +42% permanent, inflation-indexed lifetime income floor.`
    ].join('\n')
  };
}

/**
 * Draws a line graph depicting the Net Worth Trajectory over simulation years.
 */
function drawNetWorthTrajectoryGraph(
  doc: jsPDF,
  yearlyResults: YearSimulationResult[],
  retirementAge: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!yearlyResults || yearlyResults.length === 0) return;

  // Background card
  doc.setFillColor(BRAND.slate50[0], BRAND.slate50[1], BRAND.slate50[2]);
  doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y, w, h, 4, 4, 'FD');

  // Title inside graph card
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
  doc.text('Net Worth Trajectory & Portfolio Glidepath', x + 12, y + 14);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
  doc.text('Total Household Liquid & Real Estate Assets ($)', x + w - 12, y + 14, { align: 'right' });

  // Graph plotting bounds
  const plotX = x + 44;
  const plotY = y + 24;
  const plotW = w - 58;
  const plotH = h - 42;

  const minAge = yearlyResults[0].age;
  const maxAge = yearlyResults[yearlyResults.length - 1].age;
  const ageSpan = Math.max(1, maxAge - minAge);

  const maxNW = Math.max(...yearlyResults.map((r) => r.totalNetWorth), 100000) * 1.08;

  // Horizontal Grid Lines & Ticks (4 levels)
  doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
  doc.setLineWidth(0.5);

  const gridLevels = [0, 0.33, 0.66, 1.0];
  gridLevels.forEach((level) => {
    const gridY = plotY + plotH - level * plotH;
    doc.line(plotX, gridY, plotX + plotW, gridY);

    const val = level * maxNW;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.slate400[0], BRAND.slate400[1], BRAND.slate400[2]);
    const label = val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${Math.round(val / 1000)}k`;
    doc.text(label, plotX - 4, gridY + 2, { align: 'right' });
  });

  // Calculate coordinates for all simulation points
  const points = yearlyResults.map((r) => {
    const ptX = plotX + ((r.age - minAge) / ageSpan) * plotW;
    const clampedNW = Math.max(0, r.totalNetWorth);
    const ptY = plotY + plotH - (clampedNW / maxNW) * plotH;
    return { age: r.age, x: ptX, y: ptY, nw: r.totalNetWorth };
  });

  // Draw Area polygon under trajectory line
  if (points.length > 1) {
    doc.setFillColor(254, 242, 242); // very soft red/rose tint
    const polyPoints: { x: number; y: number }[] = [
      { x: points[0].x, y: plotY + plotH },
      ...points.map(p => ({ x: p.x, y: p.y })),
      { x: points[points.length - 1].x, y: plotY + plotH }
    ];

    // Convert polygon to path operations
    const lines = polyPoints.slice(1).map(p => [p.x - polyPoints[0].x, p.y - polyPoints[0].y]);
    // Use native line drawing for clean vector line
    doc.setDrawColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
    doc.setLineWidth(1.75);

    for (let i = 0; i < points.length - 1; i++) {
      doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
  }

  // Vertical guideline for Retirement Age
  const retPt = points.find((p) => p.age === retirementAge);
  if (retPt) {
    doc.setDrawColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
    doc.setLineWidth(0.75);
    // dashed indicator
    let curY = plotY;
    while (curY < plotY + plotH) {
      doc.line(retPt.x, curY, retPt.x, Math.min(curY + 3, plotY + plotH));
      curY += 5;
    }

    doc.setFillColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
    doc.circle(retPt.x, retPt.y, 2.5, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
    doc.text(`Retire Age ${retirementAge}`, retPt.x, plotY + 8, { align: 'center' });
  }

  // Age 71 RRIF Line
  const rrifPt = points.find((p) => p.age === 71);
  if (rrifPt && 71 >= minAge && 71 <= maxAge) {
    doc.setDrawColor(BRAND.slate400[0], BRAND.slate400[1], BRAND.slate400[2]);
    doc.setLineWidth(0.5);
    let curY = plotY;
    while (curY < plotY + plotH) {
      doc.line(rrifPt.x, curY, rrifPt.x, Math.min(curY + 2, plotY + plotH));
      curY += 4;
    }

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
    doc.text('Age 71 RRIF', rrifPt.x, plotY + plotH - 3, { align: 'center' });
  }

  // X-Axis Age Labels
  const ageStep = Math.max(5, Math.ceil(ageSpan / 7));
  for (let a = minAge; a <= maxAge; a += ageStep) {
    const pt = points.find((p) => p.age === a);
    if (pt) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
      doc.text(`Age ${a}`, pt.x, plotY + plotH + 9, { align: 'center' });
    }
  }
}

/**
 * Primary function that generates the complete, multi-page bespoke advisory report.
 */
export function generateRetirementPdfReport(
  inputs: RetirementInputs,
  summary: SimulationSummary,
  yearlyResults: YearSimulationResult[],
  narrativeOrOptions?: AiPlanNarrative | PdfExportOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const provinceName = PROVINCIAL_BRACKETS[inputs.province]?.name || inputs.province;

  // Extract custom client name and AI narrative
  const options: PdfExportOptions = narrativeOrOptions && 'aiNarrative' in narrativeOrOptions
    ? (narrativeOrOptions as PdfExportOptions)
    : { aiNarrative: (narrativeOrOptions as AiPlanNarrative) };

  const isCouple = inputs.maritalStatus === 'married';
  const primaryName = inputs.userName?.trim();
  const defaultClientName = isCouple && inputs.spouse
    ? `${primaryName || 'Client'}${inputs.spouse.name ? ` & ${inputs.spouse.name}` : ''}`
    : (primaryName || 'Primary Planner');

  const clientName = options.clientName || defaultClientName;
  const defaultNarratives = generateDefaultNarratives(inputs, summary, provinceName, yearlyResults);
  const narrative: Required<AiPlanNarrative> = {
    executiveSummary: options.aiNarrative?.executiveSummary || defaultNarratives.executiveSummary,
    accumulationStrategy: options.aiNarrative?.accumulationStrategy || defaultNarratives.accumulationStrategy,
    realEstate: options.aiNarrative?.realEstate || defaultNarratives.realEstate,
    decumulation: options.aiNarrative?.decumulation || defaultNarratives.decumulation,
    advancedPlanning: options.aiNarrative?.advancedPlanning || defaultNarratives.advancedPlanning,
    riskAssessment: options.aiNarrative?.riskAssessment || defaultNarratives.riskAssessment
  };

  const currentDateString = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // =========================================================================
  // PAGE 1: TITLE PAGE & EXECUTIVE SUMMARY
  // =========================================================================
  {
    // Dark slate top banner
    doc.setFillColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.rect(0, 0, pageWidth, 74, 'F');

    // Red accent bar
    doc.setFillColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
    doc.rect(0, 74, pageWidth, 3, 'F');

    // Brand Title Top Left
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.white[0], BRAND.white[1], BRAND.white[2]);
    doc.text('Strata', 40, 36);

    // Pill badge: Canada
    const badgeX = 40 + doc.getTextWidth('Strata') + 10;
    doc.setFillColor(BRAND.emerald[0], BRAND.emerald[1], BRAND.emerald[2]);
    doc.roundedRect(badgeX, 23, 40, 15, 3, 3, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(BRAND.white[0], BRAND.white[1], BRAND.white[2]);
    doc.text('CANADA', badgeX + 20, 33.5, { align: 'center' });

    // Subtitle
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.slate300[0], BRAND.slate300[1], BRAND.slate300[2]);
    doc.text('Comprehensive Wealth Dossier • Actuarial Retirement Plan', 40, 56);

    // Header Right Meta
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.slate400[0], BRAND.slate400[1], BRAND.slate400[2]);
    doc.text('CONFIDENTIAL WEALTH DOSSIER', pageWidth - 40, 34, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
    doc.text(`Generated on ${currentDateString}`, pageWidth - 40, 50, { align: 'right' });

    // Hero Header Title
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text(`Your Retirement Wealth Plan: ${clientName}`, 40, 102);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.slate600[0], BRAND.slate600[1], BRAND.slate600[2]);
    doc.text(
      `Bespoke Actuarial Analysis for ${provinceName}, Canada • Primary Goal: Retire at Age ${inputs.retirementAge} (Current Age ${inputs.currentAge})`,
      40,
      117
    );

    // 4 KPI Metric Boxes
    const cardY = 130;
    const cardGap = 10;
    const cardWidth = (pageWidth - 80 - cardGap * 3) / 4;
    const cardHeight = 56;

    const kpis = [
      {
        title: 'READINESS SCORE',
        value: summary.isFullyFunded ? '100% Fully Funded' : `Shortfall @ Age ${summary.portfolioDepletionAge}`,
        sub: `${summary.yearsFunded} of ${summary.totalYearsInRetirement} Yrs Funded`,
        valueColor: summary.isFullyFunded ? BRAND.emerald : BRAND.mapleRed
      },
      {
        title: 'RETIREMENT NEST EGG',
        value: formatCur(summary.netWorthAtRetirement),
        sub: `Peak: ${formatCur(summary.peakNetWorth)} (Age ${summary.peakNetWorthAge})`,
        valueColor: BRAND.indigo
      },
      {
        title: 'RETIREMENT SPEND',
        value: `${formatCur(summary.averageAnnualRetirementSpendNominal / 12)}/mo`,
        sub: `Today's $: ${formatCur(inputs.targetRetirementSpendingToday / 12)}/mo`,
        valueColor: BRAND.darkSlate
      },
      {
        title: 'LIFETIME TAX LIABILITY',
        value: formatCur(summary.lifetimeTaxesPaid),
        sub: `Pensions: ${formatCur(summary.lifetimeCppReceived + summary.lifetimeOasReceived)}`,
        valueColor: BRAND.amber
      }
    ];

    kpis.forEach((kpi, idx) => {
      const boxX = 40 + idx * (cardWidth + cardGap);
      doc.setFillColor(BRAND.slate50[0], BRAND.slate50[1], BRAND.slate50[2]);
      doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
      doc.setLineWidth(0.75);
      doc.roundedRect(boxX, cardY, cardWidth, cardHeight, 3.5, 3.5, 'FD');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
      doc.text(kpi.title, boxX + 8, cardY + 14);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(kpi.valueColor[0], kpi.valueColor[1], kpi.valueColor[2]);
      doc.text(kpi.value, boxX + 8, cardY + 31);

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
      doc.text(kpi.sub, boxX + 8, cardY + 45);
    });

    // Executive Core Parameters Table
    const tableStartY = cardY + cardHeight + 12;

    const strategyLabels: Record<string, string> = {
      tax_efficient: 'Tax-Efficient (Non-Reg -> RRSP/RRIF -> TFSA Last)',
      rrsp_meltdown: 'RRSP Meltdown (Accelerated RRIF before 71)',
      proportional: 'Proportional Withdrawal (Pro-Rata Balance)',
      tfsa_first: 'TFSA First (Exhaust Tax-Free Early)'
    };

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: 40, right: 40 },
      head: [['Planning Dimension', 'Configuration Profile', 'Actuarial Metric', 'Modeled Target']],
      body: [
        [
          'Household Structure',
          isCouple && inputs.spouse
            ? `Married Couple (Spouse: ${inputs.spouse.name || 'Spouse'} @ Age ${inputs.spouse.currentAge}, Retire @ ${inputs.spouse.retirementAge})`
            : 'Individual Client Portfolio',
          'Target Retirement Age',
          `Age ${inputs.retirementAge} (Life Expectancy: Age ${inputs.lifeExpectancy})`
        ],
        [
          'Current Annual Income',
          `${formatCur(inputs.currentAnnualIncome)} (${inputs.incomeGrowthRate}% wage growth)${isCouple && inputs.spouse ? ` + Spouse: ${formatCur(inputs.spouse.annualIncome)}` : ''}`,
          'Target Retirement Living Spend',
          `${formatCur(inputs.targetRetirementSpendingToday)} / year (Today\'s Dollars)`
        ],
        [
          'Province of Residence',
          `${provinceName} (Indexed CRA Tax Brackets)`,
          'Inflation & Yield Assumptions',
          `Inflation: ${inputs.inflationRate}% | Non-Reg Drag: ${inputs.nonRegYieldTaxRate}%`
        ],
        [
          'Registered Account Balances',
          `RRSP: ${formatCur(inputs.rrspBalance)} | TFSA: ${formatCur(inputs.tfsaBalance)} | FHSA: ${formatCur(inputs.fhsaBalance)}`,
          'Decumulation Strategy',
          strategyLabels[inputs.drawdownStrategy] || inputs.drawdownStrategy
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: BRAND.slate800,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3.5,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 125 },
        1: { cellWidth: 155 },
        2: { fontStyle: 'bold', cellWidth: 120 },
        3: { cellWidth: 132 }
      }
    });

    const afterTableY = (doc as any).lastAutoTable.finalY + 12;

    // Executive Narrative Callout
    renderNarrativeCard(
      doc,
      'Executive Strategic Assessment & Advisory Findings',
      narrative.executiveSummary,
      40,
      afterTableY,
      pageWidth - 80,
      pageHeight - afterTableY - 36
    );
  }

  // =========================================================================
  // PAGE 2: LIFESTYLE & ACCUMULATION STRATEGY
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 'Lifestyle & Accumulation Strategy', 'Section 1 • Pre-Retirement Phase', pageWidth, clientName);

    let curY = 54;

    // Subheader
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text('Household Budgeting, Living Expenses & Savings Velocity', 40, curY);

    curY += 10;

    // Table 1: Current Expenses vs Retirement Spending Target
    const exp = inputs.monthlyExpenses;
    const currentMortgageRent = exp?.rentOrMortgage ?? 2980;
    const currentUtilities = exp?.utilities ?? 450;
    const currentCreditCard = exp?.creditCard ?? 1800;
    const currentOther = exp?.otherExpenses ?? 550;
    const totalCurrentMonthly = currentMortgageRent + currentUtilities + currentCreditCard + currentOther;
    const totalCurrentAnnual = totalCurrentMonthly * 12;

    autoTable(doc, {
      startY: curY,
      margin: { left: 40, right: 40 },
      head: [['Budget Category', 'Current Monthly ($)', 'Current Annual ($)', 'Retirement Target ($)', 'Strategic Planning Notes']],
      body: [
        [
          'Shelter / Housing (Mortgage or Rent)',
          formatCur(currentMortgageRent),
          formatCur(currentMortgageRent * 12),
          inputs.realEstate?.ownsHome && !inputs.realEstate.planToSellHome
            ? '$0 / mo (Debt-Free Post-Mortgage)'
            : `${formatCur(inputs.targetRetirementSpendingToday * 0.35 / 12)} / mo`,
          inputs.realEstate?.ownsHome ? 'Mortgage amortizes prior to or during retirement' : 'Indexed rental payments continue throughout life'
        ],
        [
          'Utilities, Property Tax & Maintenance',
          formatCur(currentUtilities),
          formatCur(currentUtilities * 12),
          formatCur(currentUtilities * 1.15),
          'Municipal taxes and basic household utilities increase with inflation'
        ],
        [
          'Living Expenses, Food & Discretionary',
          formatCur(currentCreditCard),
          formatCur(currentCreditCard * 12),
          formatCur(inputs.targetRetirementSpendingToday * 0.45),
          'Core daily lifestyle, groceries, transport, dining, and discretionary hobbies'
        ],
        [
          'Travel, Healthcare & Contingency',
          formatCur(currentOther),
          formatCur(currentOther * 12),
          formatCur(inputs.targetRetirementSpendingToday * 0.20),
          'Enhanced leisure in early retirement (Go-Go years) shifting to healthcare'
        ],
        [
          'Total Household Budget',
          formatCur(totalCurrentMonthly),
          formatCur(totalCurrentAnnual),
          formatCur(inputs.targetRetirementSpendingToday),
          `Target reflects ${Math.round((inputs.targetRetirementSpendingToday / (inputs.currentAnnualIncome || 1)) * 100)}% income replacement benchmark`
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.slate800,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 140 },
        1: { halign: 'right', cellWidth: 75 },
        2: { halign: 'right', cellWidth: 75 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 85 },
        4: { cellWidth: 157 }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 14;

    // Subheader 2: Account Balances & Contribution Allocations
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text('Account Balances, Planned Contributions & Tax Classifications', 40, curY);

    curY += 10;

    autoTable(doc, {
      startY: curY,
      margin: { left: 40, right: 40 },
      head: [['Account Category', 'Current Balance', 'Annual Contrib.', 'Return Assumption', 'Tax Advantage & CRA Mandate']],
      body: [
        [
          'Registered Retirement Savings (RRSP)',
          formatCur(inputs.rrspBalance),
          `${formatCur(inputs.rrspAnnualContribution)}/yr`,
          `${inputs.accountReturns?.rrspReturn ?? 6.5}% pre / ${inputs.accountReturns?.rrspPostReturn ?? 5.0}% post`,
          'Tax-deductible contributions; 100% taxable on withdrawal; converts to RRIF at 71'
        ],
        [
          'Tax-Free Savings Account (TFSA)',
          formatCur(inputs.tfsaBalance),
          `${formatCur(inputs.tfsaAnnualContribution)}/yr`,
          `${inputs.accountReturns?.tfsaReturn ?? 7.0}% pre / ${inputs.accountReturns?.tfsaPostReturn ?? 5.5}% post`,
          'After-tax funding; 100% tax-free growth and withdrawals; zero OAS clawback impact'
        ],
        [
          'First Home Savings Account (FHSA)',
          formatCur(inputs.fhsaBalance),
          `${formatCur(inputs.fhsaAnnualContribution)}/yr`,
          `${inputs.accountReturns?.fhsaReturn ?? 6.0}%`,
          `Tax-deductible; tax-free for first home or rolls over to RRSP/RRIF within 15 years (${(inputs.fhsaOpenYear || 2023) + 15})`
        ],
        [
          'Non-Registered / Taxable Portfolio',
          formatCur(inputs.nonRegBalance),
          `${formatCur(inputs.nonRegAnnualContribution)}/yr`,
          `${inputs.accountReturns?.nonRegReturn ?? 5.5}% pre / ${inputs.accountReturns?.nonRegPostReturn ?? 4.5}% post`,
          `Annual drag ${inputs.nonRegYieldTaxRate}%; eligible for Canadian dividend tax credit & 50% capital gains inclusion`
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: BRAND.indigo,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3.5,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 135 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 70 },
        2: { halign: 'right', cellWidth: 65 },
        3: { halign: 'center', cellWidth: 95 },
        4: { cellWidth: 167 }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 12;

    // Narrative Card
    renderNarrativeCard(
      doc,
      'Accumulation Strategy & Capital Efficiency Analysis',
      narrative.accumulationStrategy,
      40,
      curY,
      pageWidth - 80,
      pageHeight - curY - 36
    );
  }

  // =========================================================================
  // PAGE 3: REAL ESTATE & HOUSING
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 'Real Estate & Housing Strategy', 'Section 2 • Property & Equity Plan', pageWidth, clientName);

    let curY = 54;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text('Residential Property Valuation, Mortgage & Disposition Framework', 40, curY);

    curY += 10;

    const re = inputs.realEstate;
    const ownsHome = Boolean(re?.ownsHome);
    const remainingMortgage = yearlyResults[0]?.remainingMortgage ?? Math.max(0, (re?.costOfHome || 0) - (re?.downPayment || 0));

    if (ownsHome && re) {
      const netHomeEquity = Math.max(0, re.currentMarketValue - remainingMortgage);

      autoTable(doc, {
        startY: curY,
        margin: { left: 40, right: 40 },
        head: [['Property Dimension', 'Baseline Metrics', 'Financial Impact', 'Strategic Commentary']],
        body: [
          [
            'Current Market Value',
            formatCur(re.currentMarketValue),
            `${re.ownershipSharePercent}% Household Ownership`,
            `Appreciating at modeled rate of ${re.annualAppreciationRate || 3.2}% per year`
          ],
          [
            'Mortgage Principal Remaining',
            formatCur(remainingMortgage),
            `Interest Rate: ${re.mortgageInterestRate}%`,
            `Estimated ${re.mortgageTermYears} years remaining on current amortization`
          ],
          [
            'Net Property Equity (Today)',
            formatCur(netHomeEquity),
            `${Math.round((netHomeEquity / (re.currentMarketValue || 1)) * 100)}% Equity Ratio`,
            'Protected under CRA Principal Residence Exemption (PRE Section 40(2)(b))'
          ],
          [
            'Disposition Strategy',
            re.planToSellHome ? `Downsize @ Age ${re.sellHomeAge}` : 'Retain Property in Retirement',
            re.planToSellHome ? '4.5% Selling & Legal Friction' : 'Zero Transaction Costs',
            re.planToSellHome
              ? `Proceeds liquidated and reinvested into liquid decumulation portfolio`
              : 'Home equity preserved as long-term wealth store and estate asset'
          ]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: BRAND.slate800,
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 4
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 3.5,
          textColor: BRAND.darkSlate
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 130 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 85 },
          2: { cellWidth: 110 },
          3: { cellWidth: 207 }
        }
      });
    } else {
      autoTable(doc, {
        startY: curY,
        margin: { left: 40, right: 40 },
        head: [['Housing Category', 'Current Status', 'Long-Term Model', 'Advisory Assessment']],
        body: [
          [
            'Residential Tenancy',
            'Renting Residence',
            `Modeled at ${formatCur((inputs.monthlyExpenses?.rentOrMortgage ?? 2500) * 12)}/yr`,
            'Zero capital tied in illiquid property; avoids municipal taxes & maintenance costs'
          ],
          [
            'Capital Deployment',
            '100% Liquid Investment Focus',
            'Accelerated Registered Growth',
            'Full cash flow surpluses directed to compounding TFSA, RRSP, and non-registered assets'
          ]
        ],
        theme: 'striped',
        headStyles: {
          fillColor: BRAND.slate800,
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 4
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 4,
          textColor: BRAND.darkSlate
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 120 },
          1: { cellWidth: 95 },
          2: { cellWidth: 115 },
          3: { cellWidth: 202 }
        }
      });
    }

    curY = (doc as any).lastAutoTable.finalY + 14;

    // Table 2: Long-Term Equity Milestone Forecast
    const homeMilestoneAges = [
      inputs.currentAge,
      inputs.retirementAge,
      re?.planToSellHome ? re.sellHomeAge : 75,
      inputs.lifeExpectancy
    ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

    const reRows = homeMilestoneAges.map((age) => {
      const yr = yearlyResults.find((r) => r.age === age);
      return [
        `Age ${age}`,
        age < inputs.retirementAge ? 'Pre-Retirement' : (age === inputs.retirementAge ? 'Retirement Day' : 'Retirement'),
        formatCur(yr?.realEstateShare || 0),
        formatCur(yr?.totalNetWorth || 0),
        yr?.homeSoldThisYear ? 'Downsizing Sale Executed' : (ownsHome ? 'Primary Residence Retained' : 'Tenancy')
      ];
    });

    autoTable(doc, {
      startY: curY,
      margin: { left: 40, right: 40 },
      head: [['Milestone Age', 'Phase', 'Real Estate Share ($)', 'Total Net Worth ($)', 'Property Event']],
      body: reRows,
      theme: 'striped',
      headStyles: {
        fillColor: BRAND.amber,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3.5,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 90 },
        2: { halign: 'right', cellWidth: 100 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 100 },
        4: { cellWidth: 162 }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 12;

    // Narrative Card
    renderNarrativeCard(
      doc,
      'Real Estate & Housing Equity Strategic Analysis',
      narrative.realEstate,
      40,
      curY,
      pageWidth - 80,
      pageHeight - curY - 36
    );
  }

  // =========================================================================
  // PAGE 4: THE GLIDEPATH (DECUMULATION & PENSIONS)
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 'The Glidepath: Decumulation & Pensions', 'Section 3 • Post-Retirement Cash Flows', pageWidth, clientName);

    let curY = 48;

    // Vector Net Worth Projection Graph
    drawNetWorthTrajectoryGraph(doc, yearlyResults, inputs.retirementAge, 40, curY, pageWidth - 80, 110);

    curY += 118;

    // Subheader: Income Sourcing & Pensions
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text('Post-Retirement Annual Cash Flow Sourcing & Pension Integration', 40, curY);

    curY += 8;

    // Sample retirement cash flow table
    const sampleRetirementYears = yearlyResults
      .filter((y) => y.isRetired)
      .filter((_, idx, arr) => idx === 0 || idx === 3 || idx === 7 || idx === 11 || idx === arr.length - 1)
      .map((yr) => [
        `Age ${yr.age}`,
        formatCur(yr.cppIncome),
        formatCur(yr.oasNetIncome),
        formatCur(yr.rrspWithdrawal),
        formatCur(yr.tfsaWithdrawal),
        formatCur(yr.nonRegWithdrawal),
        formatCur(yr.totalTaxPaid),
        `${(yr.effectiveTaxRate * 100).toFixed(1)}%`,
        formatCur(yr.netSpendableCashflow)
      ]);

    autoTable(doc, {
      startY: curY,
      margin: { left: 40, right: 40 },
      head: [['Age', 'CPP Net', 'OAS Net', 'RRSP Draw', 'TFSA Draw', 'Non-Reg Draw', 'Tax Paid', 'Eff. Rate', 'Spendable Cash']],
      body: sampleRetirementYears,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.slate800,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right', cellWidth: 55 },
        2: { halign: 'right', cellWidth: 55 },
        3: { halign: 'right', cellWidth: 62 },
        4: { halign: 'right', cellWidth: 60 },
        5: { halign: 'right', cellWidth: 62 },
        6: { halign: 'right', textColor: BRAND.mapleRed, cellWidth: 55 },
        7: { halign: 'center', cellWidth: 50 },
        8: { halign: 'right', fontStyle: 'bold', textColor: BRAND.emerald, cellWidth: 83 }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 12;

    // Narrative Card
    renderNarrativeCard(
      doc,
      'Decumulation Strategy & Tax Optimization Advisory',
      narrative.decumulation,
      40,
      curY,
      pageWidth - 80,
      pageHeight - curY - 36
    );
  }

  // =========================================================================
  // PAGE 5: ADVANCED PLANNING (ESTATE & EXPAT)
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 'Advanced Planning: Estate & Expat', 'Section 4 • Succession & Cross-Border', pageWidth, clientName);

    let curY = 54;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text('Canadian Estate Waterfall & Succession Liquidation Modeling', 40, curY);

    curY += 10;

    // Calculate Estate Plan Waterfall
    const estatePlan = calculateEstatePlan(DEFAULT_ESTATE_INPUTS, inputs, yearlyResults);
    const grossEstate = estatePlan.reserves.totalGrossEstate;
    const terminalTax = estatePlan.taxAndFees.totalTerminalIncomeTax;
    const probate = estatePlan.taxAndFees.probateFee;
    const adminCosts = estatePlan.taxAndFees.closingAndLiquidationCosts + estatePlan.taxAndFees.executorCompensation;
    const netEstate = estatePlan.taxAndFees.netEstateRemaining;

    autoTable(doc, {
      startY: curY,
      margin: { left: 40, right: 40 },
      head: [['Estate Succession Waterfall Stage', 'Modeled Value ($)', '% of Gross Estate', 'Statutory CRA & Provincial Rules']],
      body: [
        [
          '1. Gross Reserves at Passing (Age ' + inputs.lifeExpectancy + ')',
          formatCur(grossEstate),
          '100.0%',
          'Aggregate liquid portfolios, TFSA, RRSP/RRIF, and real estate equity'
        ],
        [
          '2. Estimated CRA Terminal Tax (S. 70(5))',
          `-${formatCur(terminalTax)}`,
          `${((terminalTax / (grossEstate || 1)) * 100).toFixed(1)}%`,
          'Deemed disposition on RRSP/RRIF balance as ordinary income + 50% capital gains'
        ],
        [
          '3. Provincial Probate Fees (EAT)',
          `-${formatCur(probate)}`,
          `${((probate / (grossEstate || 1)) * 100).toFixed(1)}%`,
          `${provinceName} Estate Administration Tax (probate on non-designated assets)`
        ],
        [
          '4. Executor, Legal & Liquidation Friction',
          `-${formatCur(adminCosts)}`,
          `${((adminCosts / (grossEstate || 1)) * 100).toFixed(1)}%`,
          'Realtor closing fees on property plus statutory executor tariff compensation'
        ],
        [
          '5. Net Estate for Distribution to Heirs',
          formatCur(netEstate),
          `${((netEstate / (grossEstate || 1)) * 100).toFixed(1)}%`,
          'Net wealth transferred to next-of-kin, beneficiaries, or designated charities'
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.slate800,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3.5,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 160 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 75 },
        2: { halign: 'center', cellWidth: 65 },
        3: { cellWidth: 232 }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 12;

    // Section B: Expat Planning Contingency / Strategy
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text('Global Mobility & Non-Resident Expat Structuring (CRA S. 128.1)', 40, curY);

    curY += 8;

    const expatInputs = inputs.expat || DEFAULT_EXPAT_INPUTS;
    const expatPlan = calculateExpatRetirementPlan(expatInputs, inputs, yearlyResults, summary);
    const dest = expatPlan.destinationCountry;

    autoTable(doc, {
      startY: curY,
      margin: { left: 40, right: 40 },
      head: [['Expat Parameter', 'Configuration', 'Purchasing Power & Tax Matrix', 'CRA Statutory Assessment']],
      body: [
        [
          'Destination Country',
          `${dest.name} (${dest.currencyCode})`,
          `Cost of Living Index: ${(dest.costOfLivingIndex * 100).toFixed(0)}% of Canada`,
          `PPP Multiplier: ${(dest.purchasingPowerMultiplier).toFixed(2)}x Canadian purchasing power`
        ],
        [
          'Emigration Timeline',
          `Age ${expatInputs.emigrationAge || (inputs.retirementAge + 1)}`,
          `Exchange Rate: 1 CAD = ${dest.exchangeRateToCAD} ${dest.currencyCode}`,
          'Departure year triggers CRA deemed disposition on non-registered capital gains'
        ],
        [
          'CRA 20-Year OAS Rule',
          `${expatInputs.yearsLivedInCanadaAfter18} adult years in Canada`,
          expatPlan.qualifiesForLifetimeWorldwideOAS ? 'Qualified for Lifetime Worldwide OAS' : 'Disqualified (< 20 years)',
          expatPlan.qualifiesForLifetimeWorldwideOAS
            ? 'OAS benefits continue paying into foreign bank accounts indefinitely'
            : 'OAS halts 6 months after cessation of Canadian tax residency'
        ],
        [
          'Part XIII Withholding Rates',
          dest.hasTaxTreaty ? 'Bilateral Tax Treaty Enacted' : 'Statutory Default 25%',
          `CPP: ${dest.treatyRates.cppWithholding}% | OAS: ${dest.treatyRates.oasWithholding}% | RRIF: ${dest.treatyRates.rrspPeriodicWithholding}%`,
          'Non-resident withholding satisfies full Canadian tax liability on periodic pensions'
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: BRAND.indigo,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3.5,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 125 },
        1: { cellWidth: 105 },
        2: { cellWidth: 145 },
        3: { cellWidth: 157 }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 12;

    // Narrative Card
    renderNarrativeCard(
      doc,
      'Advanced Planning: Estate Governance & Cross-Border Advisory',
      narrative.advancedPlanning,
      40,
      curY,
      pageWidth - 80,
      pageHeight - curY - 36
    );
  }

  // =========================================================================
  // PAGE 6: USER PROFILE RISK ASSESSMENT (WHAT-IF SENSITIVITY & ASSET SAFETY)
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 'User Profile Risk Assessment', 'Section 5 • Sensitivity & Risk Analysis', pageWidth, clientName);

    let curY = 54;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text('What-If Scenario Stress Testing & Asset Vulnerability Matrix', 40, curY);

    curY += 10;

    const whatIfScenariosToTest = [
      {
        name: 'Baseline Plan',
        sub: 'Base expected returns & 2.1% target inflation',
        settings: { isActive: true, returnDelta: 0, appreciationDelta: 0, inflationDelta: 0 }
      },
      {
        name: 'Stagflation Shock',
        sub: '-2.0% Return, +2.0% Inflation, -1.0% Real Estate',
        settings: { isActive: true, returnDelta: -2.0, appreciationDelta: -1.0, inflationDelta: 2.0 }
      },
      {
        name: 'Sticky Inflation Drag',
        sub: '0.0% Return, +2.0% Inflation surge, 0.0% Real Estate',
        settings: { isActive: true, returnDelta: 0, appreciationDelta: 0, inflationDelta: 2.0 }
      },
      {
        name: 'Bear Market Compression',
        sub: '-2.0% Return, +1.0% Inflation, -2.0% Real Estate',
        settings: { isActive: true, returnDelta: -2.0, appreciationDelta: -2.0, inflationDelta: 1.0 }
      },
      {
        name: 'Bull Compounding',
        sub: '+2.0% Return, -0.5% Inflation, +2.0% Real Estate',
        settings: { isActive: true, returnDelta: 2.0, appreciationDelta: 2.0, inflationDelta: -0.5 }
      },
      {
        name: 'Severe Downturn Shock',
        sub: '-3.0% Return, +1.5% Inflation, -1.5% Real Estate',
        settings: { isActive: true, returnDelta: -3.0, appreciationDelta: -1.5, inflationDelta: 1.5 }
      }
    ];

    const whatIfRows = whatIfScenariosToTest.map((scen) => {
      const res = calculateWhatIfSimulation(inputs, scen.settings, summary, yearlyResults);
      const isBase = scen.settings.returnDelta === 0 && scen.settings.inflationDelta === 0 && scen.settings.appreciationDelta === 0;
      const nw = res.retirementNetWorth.whatIf;
      const delta = res.retirementNetWorth.delta;
      const pctDelta = res.retirementNetWorth.percentDelta;
      const monthlySpend = res.retirementCashflow.whatIfNominalMonthly;
      const isFunded = res.summary.isFullyFunded;
      const depletAge = res.summary.portfolioDepletionAge;

      const deltaFormatted = isBase
        ? '$0 (Baseline)'
        : `${delta >= 0 ? '+' : '-'}${formatCur(Math.abs(delta))} (${pctDelta >= 0 ? '+' : ''}${pctDelta.toFixed(0)}%)`;

      const solvencyText = isFunded
        ? '100% Fully Funded'
        : (depletAge ? `Depletes @ Age ${depletAge}` : 'Shortfall');

      let safetyTag = 'Safe / Resilient';
      if (!isFunded) {
        if (depletAge && depletAge >= inputs.lifeExpectancy - 3) {
          safetyTag = 'Moderate Risk';
        } else {
          safetyTag = 'High Shortfall Risk';
        }
      } else if (res.summary.netWorthAtLifeExpectancy < 150000) {
        safetyTag = 'Tight Cushion';
      }

      return [
        `${scen.name}\n${scen.sub}`,
        formatCur(nw),
        deltaFormatted,
        `${formatCur(monthlySpend)}/mo`,
        solvencyText,
        safetyTag
      ];
    });

    autoTable(doc, {
      startY: curY,
      margin: { left: 40, right: 40 },
      head: [['What-If Scenario & Parameters', 'Retirement Nest Egg', 'Net Worth Delta', 'Spendable Cash', 'Solvency Horizon', 'Asset Safety']],
      body: whatIfRows,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.slate800,
        fontSize: 7.25,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 6.75,
        cellPadding: 3,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 145 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 80 },
        2: { halign: 'right', cellWidth: 95 },
        3: { halign: 'right', cellWidth: 75 },
        4: { halign: 'center', cellWidth: 80 },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 57 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw);
          if (val.includes('Safe')) {
            data.cell.styles.textColor = BRAND.emerald;
          } else if (val.includes('Tight') || val.includes('Moderate')) {
            data.cell.styles.textColor = BRAND.amber;
          } else if (val.includes('High') || val.includes('Risk') || val.includes('Shortfall')) {
            data.cell.styles.textColor = BRAND.mapleRed;
          }
        }
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw);
          if (val.startsWith('-')) {
            data.cell.styles.textColor = BRAND.mapleRed;
          } else if (val.startsWith('+')) {
            data.cell.styles.textColor = BRAND.emerald;
          }
        }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 12;

    // Narrative Card
    renderNarrativeCard(
      doc,
      'User Profile Risk Assessment: Projection Limits & Asset Safety Analysis',
      narrative.riskAssessment,
      40,
      curY,
      pageWidth - 80,
      pageHeight - curY - 36
    );
  }

  // =========================================================================
  // PAGE 7+: DETAILED LEDGER (APPENDIX)
  // =========================================================================
  {
    doc.addPage();

    // Map all simulation rows for comprehensive appendix ledger
    const ledgerRows = yearlyResults.map((yr) => {
      let stage = yr.age < inputs.retirementAge ? 'Work' : 'Retire';
      if (yr.age === inputs.retirementAge) stage = 'Target';
      else if (yr.age === 71) stage = 'RRIF Roll';
      else if (yr.age === 72) stage = 'RRIF Min';

      return [
        String(yr.age),
        stage,
        formatCur(yr.rrspBalance),
        formatCur(yr.tfsaBalance),
        formatCur(yr.nonRegBalance),
        formatCur(yr.realEstateShare || 0),
        formatCur(yr.totalNetWorth),
        formatCur(yr.cppIncome),
        formatCur(yr.oasNetIncome),
        formatCur(yr.totalWithdrawals),
        formatCur(yr.totalTaxPaid),
        formatCur(yr.netSpendableCashflow)
      ];
    });

    autoTable(doc, {
      startY: 52,
      margin: { left: 35, right: 35, top: 52, bottom: 38 },
      head: [[
        'Age', 'Phase', 'RRSP/RRIF', 'TFSA', 'Non-Reg', 'Home Eq', 'Net Worth', 'CPP Net', 'OAS Net', 'Drawdowns', 'Tax Paid', 'Spendable'
      ]],
      body: ledgerRows,
      theme: 'striped',
      headStyles: {
        fillColor: BRAND.darkSlate,
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: 3,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 6.25,
        cellPadding: 2.25,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
        1: { halign: 'center', cellWidth: 38 },
        2: { halign: 'right', cellWidth: 48 },
        3: { halign: 'right', cellWidth: 45 },
        4: { halign: 'right', cellWidth: 45 },
        5: { halign: 'right', cellWidth: 45 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 55 },
        7: { halign: 'right', cellWidth: 42 },
        8: { halign: 'right', cellWidth: 42 },
        9: { halign: 'right', cellWidth: 48 },
        10: { halign: 'right', textColor: BRAND.mapleRed, cellWidth: 45 },
        11: { halign: 'right', fontStyle: 'bold', textColor: BRAND.emerald, cellWidth: 53 }
      },
      didDrawPage: (data) => {
        // Draw the recurring dark slate header bar on every appendix page
        doc.setFillColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
        doc.rect(0, 0, pageWidth, 38, 'F');

        doc.setFillColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
        doc.rect(0, 38, pageWidth, 2.5, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BRAND.white[0], BRAND.white[1], BRAND.white[2]);
        doc.text('Strata', 35, 23);

        const mWidth = doc.getTextWidth('Strata');

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(BRAND.slate300[0], BRAND.slate300[1], BRAND.slate300[2]);
        doc.text(' | Annual Simulation Ledger & Cash Flow Projections', 35 + mWidth, 23);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BRAND.slate400[0], BRAND.slate400[1], BRAND.slate400[2]);
        doc.text('APPENDIX • YEAR-BY-YEAR AUDIT LEDGER', pageWidth - 35, 23, { align: 'right' });
      }
    });
  }

  // =========================================================================
  // EXPAT MILESTONE LEDGER (FINAL PAGE IF EXPAT PLANNING ACTIVATED)
  // =========================================================================
  const isExpatActive = inputs.planExpatExit ?? Boolean(inputs.expat?.planToEmigrate);
  if (isExpatActive) {
    doc.addPage();

    const expatInputs = inputs.expat || DEFAULT_EXPAT_INPUTS;
    const expatPlan = calculateExpatRetirementPlan(expatInputs, inputs, yearlyResults, summary);
    const dest = expatPlan.destinationCountry;
    const destCurr = dest.currencySymbol || dest.currencyCode;

    drawPageHeader(
      doc,
      `Expat Milestone Ledger: ${dest.name} (${dest.currencyCode})`,
      `Final Schedule • ${dest.name.toUpperCase()} EMIGRATION PLAN`,
      pageWidth,
      clientName
    );

    let curY = 48;

    // 1. Top Expat Summary & KPI Card
    const cardX = 35;
    const cardW = pageWidth - 70;
    const cardH = 56;
    doc.setFillColor(BRAND.slate50[0], BRAND.slate50[1], BRAND.slate50[2]);
    doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(cardX, curY, cardW, cardH, 4, 4, 'FD');

    // Accent Pill
    doc.setFillColor(14, 165, 233); // Cyan 500
    doc.roundedRect(cardX, curY, 3.5, cardH, 1.5, 1.5, 'F');

    // Right KPI Badge: Average PPP Equivalent Spendable
    const badgeW = 150;
    const badgeH = 40;
    const badgeX = cardX + cardW - badgeW - 8;
    const badgeY = curY + (cardH - badgeH) / 2;
    doc.setFillColor(240, 253, 250); // soft teal
    doc.setDrawColor(204, 251, 241);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136); // Teal 600
    doc.text('AVERAGE RETIREMENT PURCHASING POWER', badgeX + badgeW / 2, badgeY + 11, { align: 'center' });

    doc.setFontSize(9.5);
    doc.text(`${formatCur(expatPlan.averagePPPEquivalentCAD)} / yr`, badgeX + badgeW / 2, badgeY + 23, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`+${expatPlan.purchasingPowerBoostPercent.toFixed(0)}% Canadian equivalent boost`, badgeX + badgeW / 2, badgeY + 33, { align: 'center' });

    // KPI Header Text (Constrained to left side so it never collides with badge)
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
    doc.text(
      `Destination: ${dest.name} (${dest.currencyCode}) • Emigration Target: Age ${expatPlan.departureAge} (${expatPlan.departureYear})`,
      46,
      curY + 13
    );

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
    doc.text(
      `Exchange Rate: 1 CAD = ${dest.exchangeRateToCAD} ${dest.currencyCode} • Cost of Living: ${(dest.costOfLivingIndex * 100).toFixed(0)}% of Canada • PPP Multiplier: ${dest.purchasingPowerMultiplier.toFixed(2)}x`,
      46,
      curY + 24
    );

    doc.setFontSize(7);
    doc.setTextColor(BRAND.slate700[0], BRAND.slate700[1], BRAND.slate700[2]);
    doc.text(
      `Treaty Withholding: CPP ${dest.treatyRates.cppWithholding}% | OAS ${dest.treatyRates.oasWithholding}% | RRIF ${dest.treatyRates.rrspPeriodicWithholding}% • Departure Tax: ${formatCur(expatPlan.departureTaxEstimateCAD)}`,
      46,
      curY + 35
    );

    const oasText = expatPlan.qualifiesForLifetimeWorldwideOAS
      ? '[Qualified] Lifetime Worldwide OAS Confirmed (20+ Adult Canadian Years)'
      : '[Warning] OAS Halts 6 Mo Post-Departure (<20 Adult Canadian Years)';
    doc.setFont('helvetica', 'bold');
    if (expatPlan.qualifiesForLifetimeWorldwideOAS) {
      doc.setTextColor(13, 148, 136); // Teal 600
    } else {
      doc.setTextColor(BRAND.mapleRed[0], BRAND.mapleRed[1], BRAND.mapleRed[2]);
    }
    doc.text(oasText, 46, curY + 46);

    curY += cardH + 6;

    // 2. Build Milestone Rows for Expat Schedule
    const milestoneAgesSet = new Set<number>();
    milestoneAgesSet.add(inputs.currentAge);
    milestoneAgesSet.add(expatPlan.departureAge);
    milestoneAgesSet.add(inputs.retirementAge);
    milestoneAgesSet.add(65); // CPP/OAS Standard
    milestoneAgesSet.add(71); // Mandatory RRIF
    milestoneAgesSet.add(inputs.lifeExpectancy);

    // Add 5-year intervals
    for (let a = inputs.currentAge; a <= inputs.lifeExpectancy; a++) {
      if (a % 5 === 0) milestoneAgesSet.add(a);
    }

    const milestoneAges = Array.from(milestoneAgesSet).sort((a, b) => a - b);

    const expatTableRows = milestoneAges.map((age) => {
      const expatYr = expatPlan.yearlyExpatResults.find((r) => r.age === age);
      const canYr = yearlyResults.find((r) => r.age === age);
      const isEmigrationYear = age === expatPlan.departureAge;
      const isAbroad = age >= expatPlan.departureAge;

      let residencyLabel = 'Canada (Res)';
      if (isEmigrationYear) {
        residencyLabel = 'Exit Year (Relocated)';
      } else if (isAbroad) {
        residencyLabel = `${dest.name} (Non-Res)`;
      }

      const grossCAD = expatYr?.grossIncomeCAD ?? (canYr?.totalGrossIncome ?? 0);
      const cppVal = expatYr?.cppReceivedCAD ?? (canYr?.cppIncome ?? 0);
      const oasVal = expatYr?.oasReceivedCAD ?? (canYr?.oasNetIncome ?? 0);
      const combinedPension = cppVal + oasVal;

      const partXIIITax = expatYr?.craPartXIIIWithholdingCAD ?? 0;
      const depTax = expatYr?.departureTaxCAD ?? 0;
      const totalCRAHold = partXIIITax + depTax;

      const netCAD = expatYr?.expatNetIncomeCAD ?? (canYr?.netSpendableCashflow ?? 0);
      const netLocal = expatYr?.expatNetIncomeLocalCurrency ?? (netCAD * dest.exchangeRateToCAD);
      const pppCAD = expatYr?.pppEquivalentPurchasingPowerCAD ?? netCAD;

      let notes = '';
      if (isEmigrationYear) {
        notes = depTax > 0
          ? `CRA S.128.1 Departure Tax: -${formatCur(depTax)}`
          : 'CRA Departure Year (Tax Residency Ceased)';
      } else if (age === inputs.retirementAge) {
        notes = isAbroad ? 'Retirement Abroad Commences' : 'Target Retirement Age';
      } else if (age === 65) {
        notes = expatPlan.qualifiesForLifetimeWorldwideOAS ? 'CPP & OAS Worldwide Inflows' : 'CPP Inflows (OAS Restricted)';
      } else if (age === 71) {
        notes = 'Mandatory RRIF Roll with Treaty Rate';
      } else if (age === inputs.lifeExpectancy) {
        notes = 'Plan Life Expectancy Horizon';
      } else if (isAbroad) {
        notes = `${(dest.purchasingPowerMultiplier).toFixed(1)}x Purchasing Power in ${dest.name}`;
      } else {
        notes = 'Domestic Pre-Departure Accumulation';
      }

      return [
        `Age ${age}`,
        residencyLabel,
        formatCur(grossCAD),
        formatCur(combinedPension),
        totalCRAHold > 0 ? `-${formatCur(totalCRAHold)}` : '$0',
        formatCur(netCAD),
        `${destCurr}${Math.round(netLocal).toLocaleString()}`,
        formatCur(pppCAD),
        notes
      ];
    });

    autoTable(doc, {
      startY: curY,
      margin: { left: 35, right: 35 },
      head: [[
        'Age', 'Residency', 'Gross CAD', 'CPP+OAS', 'CRA Part XIII', 'Net CAD', `Net Local (${dest.currencyCode})`, 'PPP Real Value', 'Expat Milestones & Statutory Notes'
      ]],
      body: expatTableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: 3.5,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 6.25,
        cellPadding: 2.5,
        textColor: BRAND.darkSlate
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 44 },
        1: { halign: 'center', cellWidth: 58 },
        2: { halign: 'right', cellWidth: 50 },
        3: { halign: 'right', cellWidth: 52 },
        4: { halign: 'right', textColor: BRAND.mapleRed, cellWidth: 54 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 52 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 64 },
        7: { halign: 'right', textColor: [13, 148, 136], fontStyle: 'bold', cellWidth: 58 },
        8: { cellWidth: 110 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.raw && Array.isArray(data.row.raw)) {
          const status = String(data.row.raw[1]);
          if (status.includes('Exit Year')) {
            data.cell.styles.fillColor = [254, 242, 242]; // very soft rose highlight
          }
        }
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 10;

    // Bottom Cross-Border Advisory Callout Box
    if (curY < pageHeight - 55) {
      doc.setFillColor(BRAND.slate50[0], BRAND.slate50[1], BRAND.slate50[2]);
      doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(35, curY, pageWidth - 70, pageHeight - curY - 26, 3, 3, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND.darkSlate[0], BRAND.darkSlate[1], BRAND.darkSlate[2]);
      doc.text('Key Canadian Statutory Expat Compliance Protocols:', 45, curY + 12);

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND.slate600[0], BRAND.slate600[1], BRAND.slate600[2]);
      doc.text(
        '1. CRA Emigration Filings: Submit Form NR73 for tax residency determination, Form T1161 (List of Properties by an Emigrant), and Form T1243 (Deemed Disposition).',
        45,
        curY + 22
      );
      doc.text(
        '2. Part XIII Withholding Certification: Provide CRA Form NR301 to all Canadian payers and banks to ensure non-resident treaty rates are correctly applied.',
        45,
        curY + 31
      );
      doc.text(
        '3. TFSA Non-Resident Status: Contributions cease upon departure. Existing balances grow and withdraw 100% tax-free under CRA rules with zero Part XIII tax.',
        45,
        curY + 40
      );
    }
  }

  // =========================================================================
  // UNIVERSAL FOOTER & PAGINATION (APPLIED ACROSS ALL PAGES)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Hairline divider
    doc.setDrawColor(BRAND.slate200[0], BRAND.slate200[1], BRAND.slate200[2]);
    doc.setLineWidth(0.5);
    doc.line(35, pageHeight - 22, pageWidth - 35, pageHeight - 22);

    // Left Disclaimer & Brand
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.slate500[0], BRAND.slate500[1], BRAND.slate500[2]);
    doc.text(
      'Strata • Canadian Retirement Wealth Advisory Dossier • CRA 2025/2026 Indexed • Confidential',
      35,
      pageHeight - 12
    );

    // Right Page Number
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 35, pageHeight - 12, { align: 'right' });
  }

  // Save PDF with descriptive filename
  const cleanClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Strata_Plan_${cleanClient}_Age${inputs.retirementAge}_${inputs.province}.pdf`);
}
