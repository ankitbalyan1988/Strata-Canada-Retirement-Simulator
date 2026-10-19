import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RetirementInputs, SimulationSummary, YearSimulationResult } from '../types/retirement';
import { PROVINCIAL_BRACKETS } from './canadianTax';
import { calculateSavingsPulse } from './simulator';

export function generateRetirementPdfReport(
  inputs: RetirementInputs,
  summary: SimulationSummary,
  yearlyResults: YearSimulationResult[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const provinceName = PROVINCIAL_BRACKETS[inputs.province]?.name || inputs.province;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Maple accent bar
  doc.setFillColor(225, 29, 72); // rose-600 / maple red
  doc.rect(0, 80, pageWidth, 4, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MapleRetire | Canadian Retirement Wealth Dossier', 40, 36);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Comprehensive Analysis for ${provinceName}, Canada • Generated on ${new Date().toLocaleDateString('en-CA')}`, 40, 56);

  // Executive KPI summary cards
  const startY = 106;
  const cardWidth = (pageWidth - 80 - 30) / 4;
  const cardHeight = 62;

  const kpis = [
    {
      label: 'RETIREMENT AGE',
      value: `Age ${summary.retirementAge}`,
      sub: `Current: Age ${inputs.currentAge}`,
      color: [30, 58, 138] // navy
    },
    {
      label: 'READINESS STATUS',
      value: summary.isFullyFunded ? '100% Fully Funded' : `Shortfall at Age ${summary.portfolioDepletionAge}`,
      sub: `${summary.yearsFunded} of ${summary.totalYearsInRetirement} yrs funded`,
      color: summary.isFullyFunded ? [16, 149, 102] : [225, 29, 72]
    },
    {
      label: 'NET WORTH AT RETIRE',
      value: `$${(summary.netWorthAtRetirement / 1000).toFixed(0)}k`,
      sub: `Peak: $${(summary.peakNetWorth / 1000).toFixed(0)}k (Age ${summary.peakNetWorthAge})`,
      color: [14, 116, 144]
    },
    {
      label: 'LIFETIME PENSIONS',
      value: `$${((summary.lifetimeCppReceived + summary.lifetimeOasReceived) / 1000).toFixed(0)}k`,
      sub: `CPP: $${(summary.lifetimeCppReceived / 1000).toFixed(0)}k | OAS: $${(summary.lifetimeOasReceived / 1000).toFixed(0)}k`,
      color: [109, 40, 217]
    }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * (cardWidth + 10);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, startY, cardWidth, cardHeight, 4, 4, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(kpi.label, x + 8, startY + 16);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 8, startY + 34);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 8, startY + 49);
  });

  // Section 1: Inputs & Parameters Summary Table
  const formatCur = (val: number) => `$${Math.round(val).toLocaleString('en-CA')}`;

  const strategyNames: Record<string, string> = {
    tax_efficient: 'Tax-Efficient (Non-Reg -> RRSP -> TFSA Last)',
    rrsp_meltdown: 'RRSP Meltdown (Bracket Smoothing before 71)',
    proportional: 'Proportional Withdrawal (Pro-rata)',
    tfsa_first: 'TFSA First'
  };

  const pulse = calculateSavingsPulse(inputs, summary);

  const paramRows = [
    [
      'Marital Status',
      inputs.maritalStatus === 'married' ? 'Married (Couple Plan)' : 'Single / Divorced (Individual Plan)',
      'Spouse Details',
      inputs.maritalStatus === 'married' && inputs.spouse
        ? `${inputs.spouse.name || 'Spouse'} (Age ${inputs.spouse.currentAge}, Retire @ ${inputs.spouse.retirementAge})`
        : 'N/A (Individual Plan)'
    ],
    [
      'Annual Income & Wage Trend',
      `${formatCur(inputs.currentAnnualIncome)} (${inputs.incomeGrowthRate >= 0 ? '+' : ''}${inputs.incomeGrowthRate}%/yr)${inputs.careerDisruption?.enabled ? ` [Shock: -${inputs.careerDisruption.reductionPercent}% @ Age ${inputs.careerDisruption.shockAge}]` : ''}${inputs.maritalStatus === 'married' && inputs.spouse ? ` + Spouse: ${formatCur(inputs.spouse.annualIncome)}` : ''}`,
      'Target Retirement Spending (Today $)', formatCur(inputs.targetRetirementSpendingToday)
    ],
    [
      'Province of Residence', provinceName,
      'Inflation Rate / Tax Drag', `${inputs.inflationRate}% / ${inputs.nonRegYieldTaxRate}%`
    ],
    [
      'RRSP Current / Annual Contrib', `${formatCur(inputs.rrspBalance)} / ${formatCur(inputs.rrspAnnualContribution)}`,
      'Account Returns (RRSP / TFSA)', `${inputs.accountReturns?.rrspReturn ?? 6.5}% / ${inputs.accountReturns?.tfsaReturn ?? 7.0}%`
    ],
    [
      'TFSA Current / Annual Contrib', `${formatCur(inputs.tfsaBalance)} / ${formatCur(inputs.tfsaAnnualContribution)}`,
      'CPP Start Age / % of Max', `Age ${inputs.cppStartAge} / ${inputs.cppEstimatedPercentOfMax}%`
    ],
    [
      'FHSA Balance / 15-Yr Rollover', `${formatCur(inputs.fhsaBalance)} (Opened ${inputs.fhsaOpenYear || 2023} → Rolls @ Age ${Math.min(71, inputs.currentAge + ((inputs.fhsaOpenYear || 2023) + 15 - 2026))})`,
      'OAS Start Age / Canada Years', `Age ${inputs.oasStartAge} / ${inputs.oasEligibleYearsInCanada} yrs`
    ],
    [
      'Non-Reg (SA) Balance / Contrib', `${formatCur(inputs.nonRegBalance)} / ${formatCur(inputs.nonRegAnnualContribution)}${inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0 ? ` [${inputs.nonRegCustomAccounts.length} custom sub-accts]` : ''}`,
      'Drawdown Strategy', strategyNames[inputs.drawdownStrategy] || inputs.drawdownStrategy
    ],
    [
      'Monthly Savings Pulse', `${formatCur(pulse.currentMonthlySavings)}/mo (${pulse.currentSavingsRate}%)`,
      'Target Requirement Pace', `${formatCur(pulse.requiredMonthlySavings)}/mo (${pulse.monthlyGap <= 0 ? 'Surplus +' + formatCur(Math.abs(pulse.monthlyGap)) : 'Gap -' + formatCur(pulse.monthlyGap)})`
    ]
  ];

  if (inputs.realEstate?.ownsHome) {
    paramRows.push([
      'Home Valuation / Equity Share',
      `${formatCur(inputs.realEstate.currentMarketValue)} (${inputs.realEstate.ownershipSharePercent}% ownership share)`,
      'Mortgage & Disposition Plan',
      `${inputs.realEstate.mortgageInterestRate}% (${inputs.realEstate.mortgageTermYears}yr term) | ${inputs.realEstate.planToSellHome ? `Sell @ Age ${inputs.realEstate.sellHomeAge} (into Non-Reg)` : 'Retain home'}`
    ]);
  }

  autoTable(doc, {
    startY: startY + cardHeight + 14,
    margin: { left: 40, right: 40 },
    head: [['Planning Parameters', 'Pre-Retirement Inputs', 'Retirement & Market Rules', 'Value']],
    body: paramRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 140 },
      1: { cellWidth: 110 },
      2: { fontStyle: 'bold', cellWidth: 150 },
      3: { cellWidth: 132 }
    }
  });

  // Section 2: Milestone Account Balance Projections Table
  const milestoneAges = [
    inputs.currentAge,
    inputs.retirementAge,
    Math.min(71, inputs.lifeExpectancy),
    Math.min(72, inputs.lifeExpectancy),
    Math.min(80, inputs.lifeExpectancy),
    Math.min(85, inputs.lifeExpectancy),
    inputs.lifeExpectancy
  ];
  // Deduplicate and sort
  const uniqueAges = Array.from(new Set(milestoneAges)).sort((a, b) => a - b);

  const milestoneRows = uniqueAges.map(age => {
    const yr = yearlyResults.find(r => r.age === age);
    if (!yr) return [String(age), '-', '-', '-', '-', '-', '-', '-'];
    let stage = 'Working';
    if (age === inputs.retirementAge) stage = 'Retirement Target';
    else if (age === 71) stage = 'RRIF Mandatory Roll';
    else if (age >= 72 && yr.isRetired) stage = 'RRIF Drawdown';
    else if (yr.isRetired) stage = 'Retired';

    return [
      `Age ${age}`,
      stage,
      formatCur(yr.rrspBalance),
      formatCur(yr.tfsaBalance),
      formatCur(yr.fhsaBalance),
      formatCur(yr.nonRegBalance),
      formatCur(yr.realEstateShare || 0),
      formatCur(yr.totalNetWorth)
    ];
  });

  const lastTableEnd = (doc as any).lastAutoTable.finalY || 240;

  autoTable(doc, {
    startY: lastTableEnd + 14,
    margin: { left: 40, right: 40 },
    head: [['Milestone Age', 'Phase', 'RRSP / RRIF', 'TFSA', 'FHSA', 'Non-Reg (SA)', 'Home Equity', 'Total Net Worth']],
    body: milestoneRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // teal-700
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 80 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', textColor: [180, 83, 9] },
      7: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
    }
  });

  // Page 2: Detailed Decumulation Table & Canadian Tax Guidance
  doc.addPage();

  // Page 2 Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Retirement Decumulation Cash Flow & Tax Breakdown', 40, 26);

  // Filter retirement years sample
  const retirementRows = yearlyResults
    .filter(y => y.isRetired)
    .filter((_, idx, arr) => {
      // Pick every year for first 6 years, then every 2-3 years, and final years
      return idx < 6 || idx % 2 === 0 || idx === arr.length - 1;
    })
    .map(yr => [
      `Age ${yr.age}`,
      formatCur(yr.targetSpendingNominal),
      formatCur(yr.cppIncome),
      formatCur(yr.oasNetIncome),
      formatCur(yr.rrspWithdrawal),
      formatCur(yr.tfsaWithdrawal),
      formatCur(yr.nonRegWithdrawal),
      formatCur(yr.totalTaxPaid),
      `${(yr.effectiveTaxRate * 100).toFixed(1)}%`,
      formatCur(yr.totalNetWorth)
    ]);

  autoTable(doc, {
    startY: 55,
    margin: { left: 40, right: 40 },
    head: [[
      'Age', 'Target Spend', 'CPP Net', 'OAS Net', 'RRSP Draw', 'TFSA Draw', 'Taxable Draw', 'Est Tax', 'Eff Rate', 'End Net Worth'
    ]],
    body: retirementRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138], // navy-800
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 3.5
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 3,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', textColor: [185, 28, 28] },
      8: { halign: 'center' },
      9: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const p2TableEnd = (doc as any).lastAutoTable.finalY || 450;

  // Canadian Strategic Insights Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(40, p2TableEnd + 15, pageWidth - 80, 150, 4, 4, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Key Canadian Retirement Strategy Takeaways', 52, p2TableEnd + 33);

  const bulletPoints = [
    `• CPP Timing: Commencing CPP at age ${inputs.cppStartAge} modifies your standard age-65 benefit by ${
      inputs.cppStartAge < 65
        ? `-${((65 - inputs.cppStartAge) * 7.2).toFixed(1)}% permanently`
        : inputs.cppStartAge > 65
        ? `+${((inputs.cppStartAge - 65) * 8.4).toFixed(1)}% permanent deferral bonus`
        : '0% (Standard age-65 entitlement)'
    }.`,
    `• OAS Recovery Tax (Clawback): Threshold begins at ~$93,208 (indexed). Your selected strategy ${
      inputs.drawdownStrategy === 'rrsp_meltdown' ? 'melts down RRSP earlier to avoid OAS clawback spikes' : 'monitors ordinary taxable income against the 15% recovery threshold'
    }.`,
    `• Mandatory RRIF Conversion: In the calendar year you turn 71, RRSP accounts must convert to an RRIF. Minimum annual distributions are legally required starting at age 72 (~5.4% climbing to 20% at age 95).`,
    `• TFSA Advantage: All TFSA withdrawals are 100% tax-free and do not reduce OAS, GIS, or age credit amounts. Preserving TFSA balances creates a tax-free emergency and legacy buffer.`,
    `• Lifetime Taxes: Total projected lifetime tax liability across pre and post-retirement is estimated at ${formatCur(summary.lifetimeTaxesPaid)}.`
  ];

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  bulletPoints.forEach((bp, i) => {
    doc.text(bp, 52, p2TableEnd + 52 + i * 18, { maxWidth: pageWidth - 104 });
  });

  // Footer Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Disclaimer: This simulation is created for illustrative and educational financial planning purposes only based on Canada Revenue Agency (CRA) guidelines. It does not constitute binding financial, tax, or legal advice. Consult a certified financial planner (CFP) or tax professional.',
    40,
    pageHeight - 25,
    { maxWidth: pageWidth - 80 }
  );

  doc.save(`MapleRetire_Plan_Age_${inputs.retirementAge}_${inputs.province}.pdf`);
}
