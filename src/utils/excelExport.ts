import ExcelJS from 'exceljs';
import { YearSimulationResult, RetirementInputs, SimulationSummary } from '../types/retirement';
import { EstateMilestoneRow, EstatePlanningInputs, EstateFilterMode } from '../types/estate';
import { ExpatDestinationCountry, ExpatInputs, ExpatSimulationSummary } from '../types/expat';
import {
  HISTORICAL_SCENARIOS,
  runStressScenarioSimulation,
  ScenarioDefinition,
  ScenarioSimulationDetails
} from './stressTestHealthCalculator';
import { generateEstateMilestoneLedger, DEFAULT_ESTATE_INPUTS } from './estatePlanning';
import { calculateExpatRetirementPlan } from './expatSimulator';
import { DEFAULT_EXPAT_INPUTS } from './expatCountries';

export interface ExcelExportOptions {
  data: YearSimulationResult[];
  filterMode: 'milestones' | 'retirement' | 'all';
  retirementAge: number;
  province?: string;
  inputs?: RetirementInputs;
  customTitle?: string;
  customSubtitle?: string;
}

export interface EstateExcelExportOptions {
  data: EstateMilestoneRow[];
  filterMode: EstateFilterMode;
  passingAge: number;
  retirementAge: number;
  province?: string;
  inputs?: RetirementInputs;
  estateInputs: EstatePlanningInputs;
}

export interface StressTestExcelExportOptions {
  scenario: ScenarioDefinition;
  stressDetails: ScenarioSimulationDetails;
  baselineResults: YearSimulationResult[];
  retirementAge: number;
  province?: string;
  inputs?: RetirementInputs;
}

export interface MasterExcelExportOptions {
  inputs: RetirementInputs;
  summary: SimulationSummary;
  yearlyResults: YearSimulationResult[];
  estateInputs?: EstatePlanningInputs;
  expatInputs?: ExpatInputs;
  stressTiming?: 'at_retirement' | 'immediate' | 'custom';
  customStressAge?: number;
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function populateSimulationLedgerSheet(
  worksheet: ExcelJS.Worksheet,
  {
    data,
    filterMode = 'all',
    retirementAge,
    province = 'Ontario',
    inputs,
    customTitle,
    customSubtitle
  }: ExcelExportOptions
): void {
  const filterLabels: Record<string, string> = {
    milestones: 'Key Milestones (5-Year Intervals & Major Life Events)',
    retirement: 'Retirement Years Only',
    all: 'Complete Projection (All Years)'
  };

  // 1. Column Definitions
  worksheet.columns = [
    { key: 'age', width: 12 },               // Col A
    { key: 'year', width: 14 },              // Col B
    { key: 'phase', width: 14 },             // Col C
    { key: 'rrsp', width: 17 },              // Col D
    { key: 'tfsa', width: 17 },              // Col E
    { key: 'fhsa', width: 17 },              // Col F
    { key: 'nonReg', width: 17 },            // Col G
    { key: 'homeEquity', width: 18 },        // Col H
    { key: 'totalNetWorth', width: 22 },     // Col I - TOTAL FORMULA COLUMN
    { key: 'cpp', width: 16 },               // Col J
    { key: 'oas', width: 16 },               // Col K
    { key: 'withdrawals', width: 18 },       // Col L
    { key: 'taxPaid', width: 16 },           // Col M
    { key: 'debtPayment', width: 18 },       // Col N
    { key: 'spendable', width: 20 },         // Col O
    { key: 'notes', width: 45 }              // Col P
  ];

  // 2. Title Block
  worksheet.mergeCells('A1:P1');
  const titleCell = worksheet.getCell('A1');
  const clientName = inputs?.userName?.trim();
  titleCell.value = customTitle || (clientName
    ? `Strata — Canadian Wealth & Retirement Ledger (Prepared for: ${clientName})`
    : 'Strata — Canadian Wealth & Retirement Simulation Annual Ledger');
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 30;

  // Subtitle / Metadata
  worksheet.mergeCells('A2:P2');
  const metaCell = worksheet.getCell('A2');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const clientTag = clientName ? `Client: ${clientName} | ` : '';
  const planInfo = inputs
    ? `Target Retirement: Age ${retirementAge} | Province: ${province} | Housing: ${inputs.realEstate?.ownsHome ? (inputs.realEstate.purchaseType === 'future' ? `Future Buy @ Age ${inputs.realEstate.futurePurchaseAge || 'Future'}` : 'Homeowner') : 'Renting'}`
    : `Target Retirement: Age ${retirementAge} | Province: ${province}`;
  metaCell.value = `${clientTag}Export View: ${filterLabels[filterMode] || filterMode} | ${planInfo} | Generated: ${todayStr}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(2).height = 20;

  // Blank spacer row 3
  worksheet.getRow(3).height = 8;

  // Explanation note for audit-grade ledger and formulas
  worksheet.mergeCells('A4:P4');
  const noteCell = worksheet.getCell('A4');
  noteCell.value = '[NOTE] Strata Audit-Grade Ledger: Account balances reflect exact simulation values (including home purchase down payments, equity transfers, and tax optimizations). Total Net Worth =SUM(D:H) and cumulative summaries feature dynamic Excel formulas.';
  noteCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF0369A1' } };
  noteCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' } // Sky 100
  };
  noteCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(4).height = 18;

  // 3. Table Column Headers (Row 5)
  const headerRowNumber = 5;
  const headers = [
    'Age',
    'Sim Year',
    'Phase',
    'RRSP / RRIF ($)',
    'TFSA ($)',
    'FHSA ($)',
    'Non-Reg ($)',
    'Home Equity ($)',
    'Total Net Worth ($)', // Total formula column
    'CPP Benefit ($)',
    'OAS Net ($)',
    'Withdrawals ($)',
    'Tax Paid ($)',
    'Debt Payments ($)',
    'Spendable Cash ($)',
    'Milestones & Planning Notes'
  ];

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 26;
  headers.forEach((hdr, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = hdr;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 3 ? 'center' : colNumber === 16 ? 'left' : 'right',
      wrapText: true
    };

    // Distinguish Total Net Worth with special header color
    if (colNumber === 9) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Deep Blue for Total column
      };
    } else if (colNumber === 8) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB45309' } // Amber/Orange for Home Equity
      };
    } else {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' } // Slate 700
      };
    }

    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF64748B' } },
      right: { style: 'thin', color: { argb: 'FF64748B' } }
    };
  });

  // Number format for currency
  const currencyFormat = '$#,##0;($#,##0);"-"';

  // 4. Data Rows
  let currentRowNumber = headerRowNumber + 1;
  const firstDataRow = currentRowNumber;

  const cppStartAge = inputs?.cppStartAge || 65;
  const oasStartAge = inputs?.oasStartAge || 65;

  data.forEach((row, index) => {
    const dataRow = worksheet.getRow(currentRowNumber);
    dataRow.height = 20;

    const isRetireTarget = row.age === retirementAge;
    const isHomeSold = row.homeSoldThisYear;
    const isZebra = (currentRowNumber % 2 === 0);

    // Default row background
    let rowBgColor = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';
    if (isRetireTarget) {
      rowBgColor = 'FFFFF1F2'; // Soft Rose for Retirement Target
    } else if (isHomeSold) {
      rowBgColor = 'FFFEF3C7'; // Soft Amber for Home Sold
    }

    // Col A: Age
    const cellA = dataRow.getCell(1);
    cellA.value = row.age;
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA.font = { name: 'Calibri', size: 10, bold: isRetireTarget };

    // Col B: Calendar Year
    const cellB = dataRow.getCell(2);
    cellB.value = row.year;
    cellB.alignment = { vertical: 'middle', horizontal: 'center' };
    cellB.font = { name: 'Calibri', size: 10 };

    // Col C: Phase -> Formula =IF(A#>=retireAge,"Retirement","Working")
    const cellC = dataRow.getCell(3);
    cellC.value = {
      formula: `IF(A${currentRowNumber}>=${retirementAge}, "Retirement", "Working")`,
      result: row.isRetired ? 'Retirement' : 'Working'
    };
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    cellC.font = {
      name: 'Calibri',
      size: 9.5,
      bold: true,
      color: { argb: row.isRetired ? 'FF059669' : 'FF475569' }
    };

    // Col D: RRSP / RRIF -> Exact simulation balance (converts to RRIF at age 71/72)
    const cellD = dataRow.getCell(4);
    cellD.value = Math.round((row.rrspBalance || 0) + (row.rrifBalance || 0));
    cellD.numFmt = currencyFormat;
    cellD.alignment = { vertical: 'middle', horizontal: 'right' };
    cellD.font = { name: 'Calibri', size: 10, color: { argb: 'FF1D4ED8' } };

    // Col E: TFSA -> Exact simulation balance
    const cellE = dataRow.getCell(5);
    cellE.value = Math.round(row.tfsaBalance || 0);
    cellE.numFmt = currencyFormat;
    cellE.alignment = { vertical: 'middle', horizontal: 'right' };
    cellE.font = { name: 'Calibri', size: 10, color: { argb: 'FF047857' } };

    // Col F: FHSA -> Exact simulation balance
    const cellF = dataRow.getCell(6);
    cellF.value = Math.round(row.fhsaBalance || 0);
    cellF.numFmt = currencyFormat;
    cellF.alignment = { vertical: 'middle', horizontal: 'right' };
    cellF.font = { name: 'Calibri', size: 10, color: { argb: 'FFB45309' } };

    // Col G: Non-Reg -> Exact simulation balance (reflects home down payments, sales, and RRSP meltdown reinvestment)
    const cellG = dataRow.getCell(7);
    cellG.value = Math.round(row.nonRegBalance || 0);
    cellG.numFmt = currencyFormat;
    cellG.alignment = { vertical: 'middle', horizontal: 'right' };
    cellG.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B21A8' } };

    // Col H: Home Equity -> Exact simulation balance (reflects down payment, appreciation, and amortization)
    const cellH = dataRow.getCell(8);
    cellH.value = Math.round(row.realEstateShare || 0);
    cellH.numFmt = currencyFormat;
    cellH.alignment = { vertical: 'middle', horizontal: 'right' };
    cellH.font = { name: 'Calibri', size: 10, color: { argb: 'FFC2410C' } };

    // Col I: Total Net Worth -> DYNAMIC FORMULA: =SUM(D{row}:H{row}) minus remaining debt if any
    const cellI = dataRow.getCell(9);
    const debtRemaining = Math.round(row.remainingDebt || 0);
    cellI.value = debtRemaining > 0
      ? {
          formula: `SUM(D${currentRowNumber}:H${currentRowNumber}) - ${debtRemaining}`,
          result: Math.round(row.totalNetWorth)
        }
      : {
          formula: `SUM(D${currentRowNumber}:H${currentRowNumber})`,
          result: Math.round(row.totalNetWorth)
        };
    cellI.numFmt = currencyFormat;
    cellI.alignment = { vertical: 'middle', horizontal: 'right' };
    cellI.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };

    // Col J: CPP Benefit -> Exact simulation income
    const cellJ = dataRow.getCell(10);
    cellJ.value = Math.round(row.cppIncome || 0);
    cellJ.numFmt = currencyFormat;
    cellJ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellJ.font = { name: 'Calibri', size: 10 };

    // Col K: OAS Net -> Exact simulation income
    const cellK = dataRow.getCell(11);
    cellK.value = Math.round(row.oasNetIncome || 0);
    cellK.numFmt = currencyFormat;
    cellK.alignment = { vertical: 'middle', horizontal: 'right' };
    cellK.font = { name: 'Calibri', size: 10 };

    // Col L: Withdrawals -> Exact simulation total withdrawals
    const cellL = dataRow.getCell(12);
    cellL.value = Math.round(row.totalWithdrawals || 0);
    cellL.numFmt = currencyFormat;
    cellL.alignment = { vertical: 'middle', horizontal: 'right' };
    cellL.font = { name: 'Calibri', size: 10 };

    // Col M: Tax Paid -> Exact simulation total tax paid
    const cellM = dataRow.getCell(13);
    cellM.value = Math.round(row.totalTaxPaid || 0);
    cellM.numFmt = currencyFormat;
    cellM.alignment = { vertical: 'middle', horizontal: 'right' };
    cellM.font = { name: 'Calibri', size: 10, color: { argb: 'FFE11D48' } };

    // Col N: Debt Payments -> Exact simulation debt payments
    const cellN = dataRow.getCell(14);
    cellN.value = Math.round(row.debtPayment || 0);
    cellN.numFmt = currencyFormat;
    cellN.alignment = { vertical: 'middle', horizontal: 'right' };
    cellN.font = { name: 'Calibri', size: 10, color: { argb: 'FFE11D48' } };

    // Col O: Spendable Cashflow -> Exact simulation net spendable cashflow
    const cellO = dataRow.getCell(15);
    cellO.value = Math.round(row.netSpendableCashflow || 0);
    cellO.numFmt = currencyFormat;
    cellO.alignment = { vertical: 'middle', horizontal: 'right' };
    cellO.font = { name: 'Calibri', size: 10, bold: true };

    // Col P: Milestones & Planning Notes
    const cellP = dataRow.getCell(16);
    const badges = (row.milestoneBadges || []).map(b => `[${b.label}]`);
    const fullNotes = [...badges, ...row.notes];
    cellP.value = fullNotes.length > 0 ? fullNotes.join(' • ') : '-';
    cellP.alignment = { vertical: 'middle', horizontal: 'left' };
    cellP.font = {
      name: 'Calibri',
      size: 9.5,
      italic: fullNotes.length > 0,
      color: { argb: fullNotes.length > 0 ? 'FF92400E' : 'FF94A3B8' }
    };

    // Apply borders and backgrounds
    for (let c = 1; c <= 16; c++) {
      const cell = dataRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: c === 9 && !isRetireTarget ? 'FFF0FDF4' : rowBgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
      };
    }

    currentRowNumber++;
  });

  const lastDataRow = currentRowNumber - 1;

  // 5. Totals / Summary Row
  if (data.length > 0) {
    const totalRow = worksheet.getRow(currentRowNumber);
    totalRow.height = 24;

    totalRow.getCell(1).value = 'TOTALS / ENDING';
    totalRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(`A${currentRowNumber}:C${currentRowNumber}`);

    const lastRow = data[data.length - 1];
    const endingRrspRrif = Math.round((lastRow.rrspBalance || 0) + (lastRow.rrifBalance || 0));

    // D-H: Ending balances
    totalRow.getCell(4).value = { formula: `D${lastDataRow}`, result: endingRrspRrif };
    totalRow.getCell(4).numFmt = currencyFormat;

    totalRow.getCell(5).value = { formula: `E${lastDataRow}`, result: Math.round(lastRow.tfsaBalance || 0) };
    totalRow.getCell(5).numFmt = currencyFormat;

    totalRow.getCell(6).value = { formula: `F${lastDataRow}`, result: Math.round(lastRow.fhsaBalance || 0) };
    totalRow.getCell(6).numFmt = currencyFormat;

    totalRow.getCell(7).value = { formula: `G${lastDataRow}`, result: Math.round(lastRow.nonRegBalance || 0) };
    totalRow.getCell(7).numFmt = currencyFormat;

    totalRow.getCell(8).value = { formula: `H${lastDataRow}`, result: Math.round(lastRow.realEstateShare || 0) };
    totalRow.getCell(8).numFmt = currencyFormat;

    // Col I: Ending Total Net Worth = SUM(D#:H#)
    const endingDebt = Math.round(lastRow.remainingDebt || 0);
    totalRow.getCell(9).value = endingDebt > 0
      ? {
          formula: `SUM(D${currentRowNumber}:H${currentRowNumber}) - ${endingDebt}`,
          result: Math.round(lastRow.totalNetWorth)
        }
      : {
          formula: `SUM(D${currentRowNumber}:H${currentRowNumber})`,
          result: Math.round(lastRow.totalNetWorth)
        };
    totalRow.getCell(9).numFmt = currencyFormat;

    // Col J-O: Cumulative sums across all displayed rows
    totalRow.getCell(10).value = { formula: `SUM(J${firstDataRow}:J${lastDataRow})` };
    totalRow.getCell(10).numFmt = currencyFormat;

    totalRow.getCell(11).value = { formula: `SUM(K${firstDataRow}:K${lastDataRow})` };
    totalRow.getCell(11).numFmt = currencyFormat;

    totalRow.getCell(12).value = { formula: `SUM(L${firstDataRow}:L${lastDataRow})` };
    totalRow.getCell(12).numFmt = currencyFormat;

    totalRow.getCell(13).value = { formula: `SUM(M${firstDataRow}:M${lastDataRow})` };
    totalRow.getCell(13).numFmt = currencyFormat;

    totalRow.getCell(14).value = { formula: `SUM(N${firstDataRow}:N${lastDataRow})` };
    totalRow.getCell(14).numFmt = currencyFormat;

    totalRow.getCell(15).value = { formula: `SUM(O${firstDataRow}:O${lastDataRow})` };
    totalRow.getCell(15).numFmt = currencyFormat;

    totalRow.getCell(16).value = 'Cumulative sum / ending values';
    totalRow.getCell(16).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };

    for (let c = 1; c <= 16; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200 accent
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Classic Excel Accounting Underline
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  }

}

export async function exportMilestoneTableToExcel(options: ExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Canadian Wealth Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = options.filterMode === 'milestones'
    ? 'Milestone Schedule'
    : options.filterMode === 'retirement'
    ? 'Retirement Phase'
    : 'Full Simulation';

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

  populateSimulationLedgerSheet(worksheet, options);

  const clientName = options.inputs?.userName?.trim();
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const safeModeName = options.filterMode.replace(/\s+/g, '_');
  const todayStr = new Date().toLocaleDateString('en-CA');
  await downloadWorkbook(workbook, `Strata_${safeClient}${safeModeName}_Ledger_${todayStr}.xlsx`);
}

/**
 * Exports the Canadian Estate Planning & Milestone Ledger to an audit-grade Excel workbook.
 */
export function populateEstateLedgerSheet(
  worksheet: ExcelJS.Worksheet,
  {
    data,
    filterMode = 'all',
    passingAge,
    retirementAge,
    province = 'Ontario',
    inputs,
    estateInputs
  }: EstateExcelExportOptions
): void {
  const filterLabels: Record<string, string> = {
    milestones: 'Key Estate Milestones (5-Year Intervals, Passing Age & Conversion Events)',
    retirement: 'Retirement Phase Liquidation',
    all: 'Complete Lifetime Estate Projection (All Years)'
  };

  // 1. Column Definitions (Col A through Col R)
  worksheet.columns = [
    { key: 'age', width: 10 },               // Col A
    { key: 'year', width: 12 },              // Col B
    { key: 'phase', width: 14 },             // Col C
    { key: 'rrsp', width: 17 },              // Col D
    { key: 'tfsa', width: 17 },              // Col E
    { key: 'fhsa', width: 16 },              // Col F
    { key: 'nonReg', width: 17 },            // Col G
    { key: 'homeEquity', width: 18 },        // Col H
    { key: 'totalGross', width: 22 },        // Col I - TOTAL FORMULA: =SUM(D:H)
    { key: 'terminalTax', width: 18 },       // Col J
    { key: 'probate', width: 17 },           // Col K
    { key: 'funeralAdmin', width: 18 },      // Col L
    { key: 'remainingDebt', width: 16 },     // Col M
    { key: 'totalDeductions', width: 20 },   // Col N - DEDUCTIONS FORMULA: =SUM(J:M)
    { key: 'netEstate', width: 22 },         // Col O - NET ESTATE FORMULA: =I-N
    { key: 'preservation', width: 16 },      // Col P - PRESERVATION RATE: =IF(I>0, O/I, 0)
    { key: 'recipient', width: 26 },         // Col Q
    { key: 'notes', width: 44 }              // Col R
  ];

  // 2. Title Block (Row 1)
  worksheet.mergeCells('A1:R1');
  const titleCell = worksheet.getCell('A1');
  const clientName = inputs?.userName?.trim();
  titleCell.value = clientName
    ? `Strata — Canadian Estate Planning & Liquidation Ledger (Prepared for: ${clientName})`
    : 'Strata — Canadian Estate Planning & Liquidation Ledger';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 30;

  // Subtitle / Metadata (Row 2)
  worksheet.mergeCells('A2:R2');
  const metaCell = worksheet.getCell('A2');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const clientTag = clientName ? `Client: ${clientName} | ` : '';
  const successionTag = estateInputs.hasNextOfKin
    ? (estateInputs.kinCategory === 'spouse' ? 'Spousal Rollover (CRA s.70(6))' : 'Family Heirs & Direct Beneficiaries')
    : (estateInputs.hasValidWill ? `Philanthropic Legacy (${estateInputs.charityAllocationPercent}% Charity)` : 'Intestate / No Will');
  
  metaCell.value = `${clientTag}Export View: ${filterLabels[filterMode] || filterMode} | Simulated Passing: Age ${passingAge} | Target Retirement: Age ${retirementAge} | Province: ${province} | Structure: ${successionTag} | Generated: ${todayStr}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(2).height = 20;

  // Blank spacer row 3
  worksheet.getRow(3).height = 8;

  // Explanation note for audit-grade ledger and formulas (Row 4)
  worksheet.mergeCells('A4:R4');
  const noteCell = worksheet.getCell('A4');
  noteCell.value = '[NOTE] Strata Canadian Estate Audit-Grade Ledger: Modeled under CRA Section 70(5) deemed disposition rules, Provincial Probate (Estate Administration Tax), and testamentary succession guidelines. Total Gross Estate =SUM(D:H), Total Deductions =SUM(J:M), Net Estate =I-N, and Preservation Rate =O/I feature dynamic Excel formulas.';
  noteCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF0369A1' } };
  noteCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' } // Sky 100
  };
  noteCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(4).height = 18;

  // 3. Table Column Headers (Row 5)
  const headerRowNumber = 5;
  const headers = [
    'Age',
    'Sim Year',
    'Life Phase',
    'RRSP / RRIF ($)',
    'TFSA ($)',
    'FHSA ($)',
    'Non-Reg ($)',
    'Home Equity ($)',
    'Total Gross Estate ($)',   // Col I - Total formula
    'CRA Terminal Tax ($)',     // Col J - Deemed disposition
    'Provincial Probate ($)',   // Col K - Probate fee
    'Funeral & Admin ($)',      // Col L - Funeral & executor fees
    'Remaining Debt ($)',       // Col M - Liabilities
    'Total Deductions ($)',     // Col N - Deductions formula
    'Net Estate to Heirs ($)',  // Col O - Net formula
    'Preservation Rate (%)',    // Col P - % formula
    'Primary Succession Recipient',
    'Succession & Legal Tax Notes'
  ];

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 26;
  headers.forEach((hdr, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = hdr;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 3 ? 'center' : colNumber === 16 ? 'center' : colNumber >= 17 ? 'left' : 'right',
      wrapText: true
    };

    // Distinguish key columns with special colors
    if (colNumber === 9) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Navy for Gross Estate
    } else if (colNumber === 10 || colNumber === 14) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F1239' } }; // Rose 800 for Taxes/Deductions
    } else if (colNumber === 15) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // Emerald 800 for Net Estate
    } else if (colNumber === 8) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }; // Amber 700 for Home Equity
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
    }

    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF64748B' } },
      right: { style: 'thin', color: { argb: 'FF64748B' } }
    };
  });

  // Number format strings
  const currencyFormat = '$#,##0;($#,##0);"-"';
  const percentFormat = '0.0%';

  // 4. Data Rows
  let currentRowNumber = headerRowNumber + 1;
  const firstDataRow = currentRowNumber;

  data.forEach((row) => {
    const dataRow = worksheet.getRow(currentRowNumber);
    dataRow.height = 20;

    const isPassingTarget = row.age === passingAge;
    const isRetireTarget = row.age === retirementAge;
    const isZebra = (currentRowNumber % 2 === 0);

    // Row background highlighting
    let rowBgColor = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';
    if (isPassingTarget) {
      rowBgColor = 'FFECFDF5'; // Soft Emerald for Simulated Passing Age
    } else if (isRetireTarget) {
      rowBgColor = 'FFFFF1F2'; // Soft Rose for Target Retirement Age
    }

    // Col A: Age
    const cellA = dataRow.getCell(1);
    cellA.value = row.age;
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA.font = { name: 'Calibri', size: 10, bold: isPassingTarget || isRetireTarget };

    // Col B: Year
    const cellB = dataRow.getCell(2);
    cellB.value = row.year;
    cellB.alignment = { vertical: 'middle', horizontal: 'center' };
    cellB.font = { name: 'Calibri', size: 10 };

    // Col C: Life Phase (Dynamic formula)
    const cellC = dataRow.getCell(3);
    cellC.value = {
      formula: `IF(A${currentRowNumber}>=${retirementAge}, "Retirement", "Working")`,
      result: row.phase
    };
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    cellC.font = {
      name: 'Calibri',
      size: 9.5,
      bold: true,
      color: { argb: row.isRetired ? 'FF059669' : 'FF475569' }
    };

    // Col D: RRSP / RRIF
    const cellD = dataRow.getCell(4);
    cellD.value = Math.round(row.rrspBalance || 0);
    cellD.numFmt = currencyFormat;
    cellD.alignment = { vertical: 'middle', horizontal: 'right' };
    cellD.font = { name: 'Calibri', size: 10, color: { argb: 'FF1D4ED8' } };

    // Col E: TFSA
    const cellE = dataRow.getCell(5);
    cellE.value = Math.round(row.tfsaBalance || 0);
    cellE.numFmt = currencyFormat;
    cellE.alignment = { vertical: 'middle', horizontal: 'right' };
    cellE.font = { name: 'Calibri', size: 10, color: { argb: 'FF047857' } };

    // Col F: FHSA
    const cellF = dataRow.getCell(6);
    cellF.value = Math.round(row.fhsaBalance || 0);
    cellF.numFmt = currencyFormat;
    cellF.alignment = { vertical: 'middle', horizontal: 'right' };
    cellF.font = { name: 'Calibri', size: 10, color: { argb: 'FFB45309' } };

    // Col G: Non-Reg
    const cellG = dataRow.getCell(7);
    cellG.value = Math.round(row.nonRegBalance || 0);
    cellG.numFmt = currencyFormat;
    cellG.alignment = { vertical: 'middle', horizontal: 'right' };
    cellG.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B21A8' } };

    // Col H: Home Equity
    const cellH = dataRow.getCell(8);
    cellH.value = Math.round(row.homeEquity || 0);
    cellH.numFmt = currencyFormat;
    cellH.alignment = { vertical: 'middle', horizontal: 'right' };
    cellH.font = { name: 'Calibri', size: 10, color: { argb: 'FFC2410C' } };

    // Col I: Total Gross Estate (Formula: =SUM(D:H))
    const cellI = dataRow.getCell(9);
    cellI.value = {
      formula: `SUM(D${currentRowNumber}:H${currentRowNumber})`,
      result: Math.round(row.totalGrossEstate)
    };
    cellI.numFmt = currencyFormat;
    cellI.alignment = { vertical: 'middle', horizontal: 'right' };
    cellI.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };

    // Col J: CRA Terminal Tax
    const cellJ = dataRow.getCell(10);
    cellJ.value = Math.round(row.terminalIncomeTax || 0);
    cellJ.numFmt = currencyFormat;
    cellJ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellJ.font = { name: 'Calibri', size: 10, color: { argb: 'FFBE123C' } };

    // Col K: Provincial Probate
    const cellK = dataRow.getCell(11);
    cellK.value = Math.round(row.probateFee || 0);
    cellK.numFmt = currencyFormat;
    cellK.alignment = { vertical: 'middle', horizontal: 'right' };
    cellK.font = { name: 'Calibri', size: 10, color: { argb: 'FFB45309' } };

    // Col L: Funeral & Admin
    const cellL = dataRow.getCell(12);
    cellL.value = Math.round(row.funeralAndAdminCosts || 0);
    cellL.numFmt = currencyFormat;
    cellL.alignment = { vertical: 'middle', horizontal: 'right' };
    cellL.font = { name: 'Calibri', size: 10 };

    // Col M: Remaining Debt
    const cellM = dataRow.getCell(13);
    cellM.value = Math.round(row.remainingDebt || 0);
    cellM.numFmt = currencyFormat;
    cellM.alignment = { vertical: 'middle', horizontal: 'right' };
    cellM.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };

    // Col N: Total Deductions (Formula: =SUM(J:M))
    const cellN = dataRow.getCell(14);
    cellN.value = {
      formula: `SUM(J${currentRowNumber}:M${currentRowNumber})`,
      result: Math.round(row.totalDeductions)
    };
    cellN.numFmt = currencyFormat;
    cellN.alignment = { vertical: 'middle', horizontal: 'right' };
    cellN.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9F1239' } };

    // Col O: Net Estate to Heirs (Formula: =I - N)
    const cellO = dataRow.getCell(15);
    cellO.value = {
      formula: `I${currentRowNumber}-N${currentRowNumber}`,
      result: Math.round(row.netEstateRemaining)
    };
    cellO.numFmt = currencyFormat;
    cellO.alignment = { vertical: 'middle', horizontal: 'right' };
    cellO.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF065F46' } };

    // Col P: Preservation Rate % (Formula: =IF(I>0, O/I, 0))
    const cellP = dataRow.getCell(16);
    cellP.value = {
      formula: `IF(I${currentRowNumber}>0, O${currentRowNumber}/I${currentRowNumber}, 0)`,
      result: row.preservationRate / 100
    };
    cellP.numFmt = percentFormat;
    cellP.alignment = { vertical: 'middle', horizontal: 'center' };
    cellP.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF047857' } };

    // Col Q: Primary Succession Recipient
    const cellQ = dataRow.getCell(17);
    cellQ.value = row.primaryRecipient;
    cellQ.alignment = { vertical: 'middle', horizontal: 'left' };
    cellQ.font = { name: 'Calibri', size: 9.5, bold: isPassingTarget };

    // Col R: Succession & Legal Tax Notes
    const cellR = dataRow.getCell(18);
    cellR.value = isPassingTarget ? `[ACTIVE PASSING AGE] ${row.notes}` : row.notes;
    cellR.alignment = { vertical: 'middle', horizontal: 'left' };
    cellR.font = { name: 'Calibri', size: 9, italic: true, color: { argb: isPassingTarget ? 'FF047857' : 'FF475569' } };

    // Apply borders and fill to all cells in the row
    for (let c = 1; c <= 18; c++) {
      const cell = dataRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor }
      };
      cell.border = {
        top: { style: isPassingTarget ? 'medium' : 'thin', color: { argb: isPassingTarget ? 'FF059669' : 'FFE2E8F0' } },
        bottom: { style: isPassingTarget ? 'medium' : 'thin', color: { argb: isPassingTarget ? 'FF059669' : 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    currentRowNumber++;
  });

  const lastDataRow = currentRowNumber - 1;

  // 5. Total / Average Summary Row
  if (data.length > 0) {
    const totalRow = worksheet.getRow(currentRowNumber);
    totalRow.height = 24;

    totalRow.getCell(1).value = 'METRICS';
    totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    totalRow.getCell(2).value = `${data.length} Yrs`;
    totalRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    totalRow.getCell(3).value = 'Peak / Avg';
    totalRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

    // Peak Gross Estate
    totalRow.getCell(9).value = { formula: `MAX(I${firstDataRow}:I${lastDataRow})` };
    totalRow.getCell(9).numFmt = currencyFormat;

    // Average Terminal Tax
    totalRow.getCell(10).value = { formula: `AVERAGE(J${firstDataRow}:J${lastDataRow})` };
    totalRow.getCell(10).numFmt = currencyFormat;

    // Average Probate
    totalRow.getCell(11).value = { formula: `AVERAGE(K${firstDataRow}:K${lastDataRow})` };
    totalRow.getCell(11).numFmt = currencyFormat;

    // Average Deductions
    totalRow.getCell(14).value = { formula: `AVERAGE(N${firstDataRow}:N${lastDataRow})` };
    totalRow.getCell(14).numFmt = currencyFormat;

    // Peak Net Estate
    totalRow.getCell(15).value = { formula: `MAX(O${firstDataRow}:O${lastDataRow})` };
    totalRow.getCell(15).numFmt = currencyFormat;

    // Average Preservation Rate
    totalRow.getCell(16).value = { formula: `AVERAGE(P${firstDataRow}:P${lastDataRow})` };
    totalRow.getCell(16).numFmt = percentFormat;

    totalRow.getCell(17).value = 'Simulated Lifecycle Range';
    totalRow.getCell(18).value = `Simulated passing age set to Age ${passingAge}`;
    totalRow.getCell(18).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF059669' } };

    for (let c = 1; c <= 18; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200 accent
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Classic Excel Accounting Underline
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  }

}

export async function exportEstateLedgerToExcel(options: EstateExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Canadian Wealth & Estate Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = options.filterMode === 'milestones'
    ? 'Estate Milestones'
    : options.filterMode === 'retirement'
    ? 'Estate in Retirement'
    : 'Full Estate Projection';

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

  populateEstateLedgerSheet(worksheet, options);

  const clientName = options.inputs?.userName?.trim();
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const safeModeName = options.filterMode.replace(/\s+/g, '_');
  const todayStr = new Date().toLocaleDateString('en-CA');
  await downloadWorkbook(workbook, `Strata_${safeClient}Estate_${safeModeName}_Ledger_${todayStr}.xlsx`);
}

export interface ExpatExcelExportRow {
  age: number;
  year: number;
  isNonResident: boolean;
  isRetired: boolean;
  isDeparture: boolean;
  rrspBalance: number;
  tfsaBalance: number;
  fhsaBalance: number;
  nonRegBalance: number;
  homeEquity: number;
  totalNetWorth: number;
  investmentGrowth: number;
  cppIncomeCAD: number;
  oasNetIncomeCAD: number;
  totalWithdrawalsCAD: number;
  totalTaxPaidCAD: number;
  craPartXIIICAD: number;
  destinationLocalTaxCAD: number;
  departureTaxCAD: number;
  spendableCashCAD: number;
  spendableCashLocal: number;
  livingTargetCAD: number;
  livingTargetLocal: number;
  notes: string[];
}

export interface ExpatExcelExportOptions {
  data: ExpatExcelExportRow[];
  filterMode: 'all' | 'milestones' | 'expat' | 'retirement';
  departureAge: number;
  departureYear: number;
  destinationCountry: ExpatDestinationCountry;
  exchangeRate: number;
  colIndex: number;
  qualifiesForLifetimeWorldwideOAS: boolean;
  departureTaxEstimateCAD: number;
  retirementAge: number;
  province?: string;
  inputs?: RetirementInputs;
  expatInputs?: ExpatInputs;
}

export function populateExpatLedgerSheet(
  worksheet: ExcelJS.Worksheet,
  {
    data,
    filterMode = 'all',
    departureAge,
    departureYear,
    destinationCountry,
    exchangeRate,
    colIndex,
    qualifiesForLifetimeWorldwideOAS,
    departureTaxEstimateCAD,
    retirementAge,
    province = 'Ontario',
    inputs,
    expatInputs
  }: ExpatExcelExportOptions
): void {
  const filterLabels: Record<string, string> = {
    milestones: 'Strategic Milestones (Departure, Pensions, & Key Transition Events)',
    expat: `Expat Years Only (Ages ${departureAge}+ Abroad in ${destinationCountry.name})`,
    retirement: 'Retirement Decumulation Phase',
    all: 'Complete Cross-Border Lifecycle (All Simulation Years)'
  };

  // 1. Column Definitions (21 Columns A to U)
  worksheet.columns = [
    { key: 'age', width: 10 },                 // Col A
    { key: 'year', width: 12 },                // Col B
    { key: 'phase', width: 22 },               // Col C: Residency & Phase
    { key: 'rrsp', width: 17 },                // Col D: RRSP/RRIF CAD
    { key: 'tfsa', width: 17 },                // Col E: TFSA CAD
    { key: 'fhsa', width: 16 },                // Col F: FHSA CAD
    { key: 'nonReg', width: 17 },              // Col G: Non-Reg CAD
    { key: 'homeEquity', width: 18 },          // Col H: Home Equity CAD
    { key: 'totalNetWorth', width: 22 },       // Col I: Total Net Worth CAD (FORMULA)
    { key: 'growth', width: 18 },              // Col J: Investment Return CAD
    { key: 'cpp', width: 16 },                 // Col K: CPP CAD
    { key: 'oas', width: 16 },                 // Col L: OAS Net CAD
    { key: 'withdrawals', width: 18 },         // Col M: Withdrawals CAD
    { key: 'craPartXIII', width: 19 },         // Col N: CRA Part XIII Withholding CAD
    { key: 'localTax', width: 19 },            // Col O: Destination Local Tax CAD
    { key: 'departureTax', width: 17 },        // Col P: CRA Departure Tax CAD
    { key: 'totalTaxes', width: 20 },          // Col Q: Total Taxes Paid CAD (FORMULA)
    { key: 'spendableCAD', width: 19 },        // Col R: Spendable Cash CAD
    { key: 'spendableLocal', width: 23 },      // Col S: Spendable Cash in Destination Currency
    { key: 'livingTargetLocal', width: 21 },   // Col T: Destination Living Target
    { key: 'notes', width: 48 }                // Col U: Expat Notes & Treaty Protocols
  ];

  // 2. Title Block (Row 1)
  worksheet.mergeCells('A1:U1');
  const titleCell = worksheet.getCell('A1');
  const clientName = inputs?.userName?.trim();
  titleCell.value = clientName
    ? `Strata — Canadian Cross-Border Expat Wealth Ledger (Prepared for: ${clientName})`
    : 'Strata — Canadian Cross-Border Expat Wealth & Simulation Ledger';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 30;

  // Subtitle / Metadata (Row 2)
  worksheet.mergeCells('A2:U2');
  const metaCell = worksheet.getCell('A2');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const clientTag = clientName ? `Client: ${clientName} | ` : '';
  const oasTag = qualifiesForLifetimeWorldwideOAS
    ? `OAS Worldwide: Qualified (${expatInputs?.yearsLivedInCanadaAfter18 || 20}+ yrs Canada)`
    : 'OAS Worldwide: Ceases after 6 months (<20 yrs Canada)';
  const exitTaxTag = departureTaxEstimateCAD > 0
    ? `CRA Exit Tax: C$${Math.round(departureTaxEstimateCAD).toLocaleString()}`
    : 'CRA Exit Tax: $0 (Exempt/No Taxable Gains)';
  
  metaCell.value = `${clientTag}Destination: ${destinationCountry.name} (${destinationCountry.currencyCode}) | Emigration: Age ${departureAge} (${departureYear}) | Target Retirement: Age ${retirementAge} | Exchange: 1 CAD = ${exchangeRate} ${destinationCountry.currencyCode} | ${oasTag} | ${exitTaxTag} | View: ${filterLabels[filterMode] || filterMode} | Generated: ${todayStr}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(2).height = 20;

  // Blank spacer row 3
  worksheet.getRow(3).height = 8;

  // Explanation note for audit-grade ledger and multi-currency rules (Row 4)
  worksheet.mergeCells('A4:U4');
  const noteCell = worksheet.getCell('A4');
  noteCell.value = `[NOTE] Strata Cross-Border Multi-Currency Architecture: Canadian portfolios (RRSP, TFSA, FHSA, Non-Reg) remain in CAD (C$) with CRA Part XIII non-resident withholding. Spendable cash & living targets convert to ${destinationCountry.name} ${destinationCountry.currencyCode} (${destinationCountry.currencySymbol}) adjusted for Purchasing Power Parity (PPP factor: ${(1/colIndex).toFixed(2)}x). Total Net Worth =SUM(D:H) features dynamic formulas.`;
  noteCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF0369A1' } };
  noteCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' } // Sky 100
  };
  noteCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(4).height = 18;

  // 3. Table Column Headers (Row 5)
  const headerRowNumber = 5;
  const headers = [
    'Age',
    'Sim Year',
    'Tax Residency & Phase',
    'RRSP / RRIF (CAD)',
    'TFSA (CAD)',
    'FHSA (CAD)',
    'Non-Reg (CAD)',
    'Home Equity (CAD)',
    'Total Net Worth (CAD)',        // Col I - Total formula =SUM(D:H)
    'Investment Growth (CAD)',
    'CPP Pension (CAD)',
    'OAS Net Pension (CAD)',
    'Withdrawals (CAD)',
    'CRA Part XIII Tax (CAD)',      // Col N - Non-resident withholding
    'Destination Tax (CAD)',        // Col O - Local tax in destination
    'CRA Exit Tax (CAD)',           // Col P - Departure tax
    'Total Taxes Paid (CAD)',       // Col Q - Total taxes formula
    'Spendable Cash (CAD)',         // Col R - CAD spendable
    `Spendable (${destinationCountry.currencyCode})`, // Col S - Destination spendable
    `Living Target (${destinationCountry.currencyCode})`, // Col T - Local living budget
    'Expat Strategic Notes & Tax Treaty Protocols' // Col U
  ];

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 26;
  headers.forEach((hdr, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = hdr;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber <= 3 ? 'center' : colNumber === 21 ? 'left' : 'right',
      wrapText: true
    };

    // Color code header columns by domain
    if (colNumber === 9) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Navy for Net Worth
    } else if (colNumber === 17) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F1239' } }; // Rose 800 for Total Taxes
    } else if (colNumber === 19 || colNumber === 20) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } }; // Cyan 700 for Local Currency Cash
    } else if (colNumber === 8) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }; // Amber 700 for Home Equity
    } else if (colNumber >= 14 && colNumber <= 16) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF881337' } }; // Deep Rose for Cross-border taxes
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700 standard
    }

    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF64748B' } },
      right: { style: 'thin', color: { argb: 'FF64748B' } }
    };
  });

  // Number format strings
  const currencyFormat = '$#,##0;($#,##0);"-"';
  const localCurrencyFormat = `${destinationCountry.currencySymbol}#,##0;(${destinationCountry.currencySymbol}#,##0);"-"`;

  // 4. Data Rows
  let currentRowNumber = headerRowNumber + 1;
  const firstDataRow = currentRowNumber;

  data.forEach((row) => {
    const dataRow = worksheet.getRow(currentRowNumber);
    dataRow.height = 20;

    const isDepartureYear = row.age === departureAge;
    const isRetireTarget = row.age === retirementAge;
    const isZebra = (currentRowNumber % 2 === 0);

    // Row background color
    let rowBgColor = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';
    if (isDepartureYear) {
      rowBgColor = 'FFECFEFF'; // Soft Cyan 50 for Emigration Year
    } else if (isRetireTarget) {
      rowBgColor = 'FFFFF1F2'; // Soft Rose 50 for Retirement Year
    } else if (row.isNonResident) {
      rowBgColor = isZebra ? 'FFF0F9FF' : 'FFF8FCFF'; // Soft Sky tint for Non-Resident years
    }

    // Col A: Age
    const cellA = dataRow.getCell(1);
    cellA.value = row.age;
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA.font = { name: 'Calibri', size: 10, bold: isDepartureYear || isRetireTarget };

    // Col B: Year
    const cellB = dataRow.getCell(2);
    cellB.value = row.year;
    cellB.alignment = { vertical: 'middle', horizontal: 'center' };
    cellB.font = { name: 'Calibri', size: 10 };

    // Col C: Tax Residency & Phase
    const cellC = dataRow.getCell(3);
    const residencyLabel = row.isNonResident
      ? `Non-Resident (${destinationCountry.name})`
      : 'Canadian Resident';
    cellC.value = residencyLabel;
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    cellC.font = {
      name: 'Calibri',
      size: 9.5,
      bold: true,
      color: { argb: row.isNonResident ? 'FF0891B2' : 'FF334155' }
    };

    // Col D: RRSP / RRIF CAD
    const cellD = dataRow.getCell(4);
    cellD.value = Math.round(row.rrspBalance || 0);
    cellD.numFmt = currencyFormat;
    cellD.alignment = { vertical: 'middle', horizontal: 'right' };
    cellD.font = { name: 'Calibri', size: 10, color: { argb: 'FF1D4ED8' } };

    // Col E: TFSA CAD
    const cellE = dataRow.getCell(5);
    cellE.value = Math.round(row.tfsaBalance || 0);
    cellE.numFmt = currencyFormat;
    cellE.alignment = { vertical: 'middle', horizontal: 'right' };
    cellE.font = { name: 'Calibri', size: 10, color: { argb: 'FF047857' } };

    // Col F: FHSA CAD
    const cellF = dataRow.getCell(6);
    cellF.value = Math.round(row.fhsaBalance || 0);
    cellF.numFmt = currencyFormat;
    cellF.alignment = { vertical: 'middle', horizontal: 'right' };
    cellF.font = { name: 'Calibri', size: 10, color: { argb: 'FFB45309' } };

    // Col G: Non-Reg CAD
    const cellG = dataRow.getCell(7);
    cellG.value = Math.round(row.nonRegBalance || 0);
    cellG.numFmt = currencyFormat;
    cellG.alignment = { vertical: 'middle', horizontal: 'right' };
    cellG.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B21A8' } };

    // Col H: Home Equity CAD
    const cellH = dataRow.getCell(8);
    cellH.value = Math.round(row.homeEquity || 0);
    cellH.numFmt = currencyFormat;
    cellH.alignment = { vertical: 'middle', horizontal: 'right' };
    cellH.font = { name: 'Calibri', size: 10, color: { argb: 'FFC2410C' } };

    // Col I: Total Net Worth CAD (Formula: =SUM(D:H))
    const cellI = dataRow.getCell(9);
    cellI.value = {
      formula: `SUM(D${currentRowNumber}:H${currentRowNumber})`,
      result: Math.round(row.totalNetWorth)
    };
    cellI.numFmt = currencyFormat;
    cellI.alignment = { vertical: 'middle', horizontal: 'right' };
    cellI.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };

    // Col J: Investment Growth CAD
    const cellJ = dataRow.getCell(10);
    cellJ.value = Math.round(row.investmentGrowth || 0);
    cellJ.numFmt = currencyFormat;
    cellJ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellJ.font = { name: 'Calibri', size: 10, color: { argb: 'FF059669' } };

    // Col K: CPP CAD
    const cellK = dataRow.getCell(11);
    cellK.value = Math.round(row.cppIncomeCAD || 0);
    cellK.numFmt = currencyFormat;
    cellK.alignment = { vertical: 'middle', horizontal: 'right' };
    cellK.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };

    // Col L: OAS Net CAD
    const cellL = dataRow.getCell(12);
    cellL.value = Math.round(row.oasNetIncomeCAD || 0);
    cellL.numFmt = currencyFormat;
    cellL.alignment = { vertical: 'middle', horizontal: 'right' };
    cellL.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };

    // Col M: Withdrawals CAD
    const cellM = dataRow.getCell(13);
    cellM.value = Math.round(row.totalWithdrawalsCAD || 0);
    cellM.numFmt = currencyFormat;
    cellM.alignment = { vertical: 'middle', horizontal: 'right' };
    cellM.font = { name: 'Calibri', size: 10 };

    // Col N: CRA Part XIII Withholding CAD
    const cellN = dataRow.getCell(14);
    cellN.value = Math.round(row.craPartXIIICAD || 0);
    cellN.numFmt = currencyFormat;
    cellN.alignment = { vertical: 'middle', horizontal: 'right' };
    cellN.font = { name: 'Calibri', size: 10, color: { argb: 'FFBE123C' } };

    // Col O: Destination Local Tax CAD
    const cellO = dataRow.getCell(15);
    cellO.value = Math.round(row.destinationLocalTaxCAD || 0);
    cellO.numFmt = currencyFormat;
    cellO.alignment = { vertical: 'middle', horizontal: 'right' };
    cellO.font = { name: 'Calibri', size: 10, color: { argb: 'FFBE123C' } };

    // Col P: CRA Departure Tax CAD
    const cellP = dataRow.getCell(16);
    cellP.value = Math.round(row.departureTaxCAD || 0);
    cellP.numFmt = currencyFormat;
    cellP.alignment = { vertical: 'middle', horizontal: 'right' };
    cellP.font = { name: 'Calibri', size: 10, color: { argb: 'FF9F1239' } };

    // Col Q: Total Taxes Paid CAD
    const cellQ = dataRow.getCell(17);
    cellQ.value = Math.round(row.totalTaxPaidCAD || 0);
    cellQ.numFmt = currencyFormat;
    cellQ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellQ.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9F1239' } };

    // Col R: Spendable Cash CAD
    const cellR = dataRow.getCell(18);
    cellR.value = Math.round(row.spendableCashCAD || 0);
    cellR.numFmt = currencyFormat;
    cellR.alignment = { vertical: 'middle', horizontal: 'right' };
    cellR.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };

    // Col S: Spendable Cash Local Currency
    const cellS = dataRow.getCell(19);
    cellS.value = Math.round(row.spendableCashLocal || 0);
    cellS.numFmt = localCurrencyFormat;
    cellS.alignment = { vertical: 'middle', horizontal: 'right' };
    cellS.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0E7490' } };

    // Col T: Local Living Target
    const cellT = dataRow.getCell(20);
    cellT.value = Math.round(row.livingTargetLocal || 0);
    cellT.numFmt = localCurrencyFormat;
    cellT.alignment = { vertical: 'middle', horizontal: 'right' };
    cellT.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };

    // Col U: Notes
    const cellU = dataRow.getCell(21);
    const combinedNotes = row.notes.length > 0 ? row.notes.join(' | ') : 'Standard trajectory';
    cellU.value = isDepartureYear ? `[EMIGRATION DAY] ${combinedNotes}` : combinedNotes;
    cellU.alignment = { vertical: 'middle', horizontal: 'left' };
    cellU.font = {
      name: 'Calibri',
      size: 9,
      italic: true,
      color: { argb: isDepartureYear ? 'FF0891B2' : 'FF475569' }
    };

    // Apply borders and fill
    for (let c = 1; c <= 21; c++) {
      const cell = dataRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor }
      };
      cell.border = {
        top: { style: isDepartureYear ? 'medium' : 'thin', color: { argb: isDepartureYear ? 'FF06B6D4' : 'FFE2E8F0' } },
        bottom: { style: isDepartureYear ? 'medium' : 'thin', color: { argb: isDepartureYear ? 'FF06B6D4' : 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    currentRowNumber++;
  });

  const lastDataRow = currentRowNumber - 1;

  // 5. Total / Average Summary Row
  if (data.length > 0) {
    const totalRow = worksheet.getRow(currentRowNumber);
    totalRow.height = 24;

    totalRow.getCell(1).value = 'METRICS';
    totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    totalRow.getCell(2).value = `${data.length} Yrs`;
    totalRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    totalRow.getCell(3).value = 'Peak / Total / Avg';
    totalRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

    // Peak Net Worth
    totalRow.getCell(9).value = { formula: `MAX(I${firstDataRow}:I${lastDataRow})` };
    totalRow.getCell(9).numFmt = currencyFormat;

    // Total Growth
    totalRow.getCell(10).value = { formula: `SUM(J${firstDataRow}:J${lastDataRow})` };
    totalRow.getCell(10).numFmt = currencyFormat;

    // Total CPP
    totalRow.getCell(11).value = { formula: `SUM(K${firstDataRow}:K${lastDataRow})` };
    totalRow.getCell(11).numFmt = currencyFormat;

    // Total OAS
    totalRow.getCell(12).value = { formula: `SUM(L${firstDataRow}:L${lastDataRow})` };
    totalRow.getCell(12).numFmt = currencyFormat;

    // Total Withdrawals
    totalRow.getCell(13).value = { formula: `SUM(M${firstDataRow}:M${lastDataRow})` };
    totalRow.getCell(13).numFmt = currencyFormat;

    // Total CRA Part XIII
    totalRow.getCell(14).value = { formula: `SUM(N${firstDataRow}:N${lastDataRow})` };
    totalRow.getCell(14).numFmt = currencyFormat;

    // Total Local Tax
    totalRow.getCell(15).value = { formula: `SUM(O${firstDataRow}:O${lastDataRow})` };
    totalRow.getCell(15).numFmt = currencyFormat;

    // Departure Tax
    totalRow.getCell(16).value = { formula: `SUM(P${firstDataRow}:P${lastDataRow})` };
    totalRow.getCell(16).numFmt = currencyFormat;

    // Total Taxes Paid
    totalRow.getCell(17).value = { formula: `SUM(Q${firstDataRow}:Q${lastDataRow})` };
    totalRow.getCell(17).numFmt = currencyFormat;

    // Average Spendable Local
    totalRow.getCell(19).value = { formula: `AVERAGE(S${firstDataRow}:S${lastDataRow})` };
    totalRow.getCell(19).numFmt = localCurrencyFormat;

    // Average Target Local
    totalRow.getCell(20).value = { formula: `AVERAGE(T${firstDataRow}:T${lastDataRow})` };
    totalRow.getCell(20).numFmt = localCurrencyFormat;

    totalRow.getCell(21).value = `Simulated relocation to ${destinationCountry.name} at Age ${departureAge}`;
    totalRow.getCell(21).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF0891B2' } };

    for (let c = 1; c <= 21; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200 accent
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Classic Excel Accounting Double Underline
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  }

}

export async function exportExpatLedgerToExcel(options: ExpatExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Cross-Border & Expat Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = options.filterMode === 'milestones'
    ? 'Expat Milestones'
    : options.filterMode === 'expat'
    ? `${options.destinationCountry.name} Expat Phase`
    : options.filterMode === 'retirement'
    ? 'Retirement Phase'
    : 'Full Expat Lifecycle';

  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

  populateExpatLedgerSheet(worksheet, options);

  const clientName = options.inputs?.userName?.trim();
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const safeCountry = options.destinationCountry.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeModeName = options.filterMode.replace(/\s+/g, '_');
  const todayStr = new Date().toLocaleDateString('en-CA');
  await downloadWorkbook(workbook, `Strata_${safeClient}Expat_${safeCountry}_${safeModeName}_Ledger_${todayStr}.xlsx`);
}

/**
 * Populates a formatted Stress Test Ledger worksheet for an economic shock scenario.
 */
export function populateStressTestLedgerSheet(
  worksheet: ExcelJS.Worksheet,
  {
    scenario,
    stressDetails,
    baselineResults,
    retirementAge,
    province = 'Ontario',
    inputs
  }: StressTestExcelExportOptions
): void {
  // 1. Column Definitions (18 columns A through R)
  worksheet.columns = [
    { key: 'age', width: 10 },               // Col A
    { key: 'year', width: 12 },              // Col B
    { key: 'phase', width: 14 },             // Col C
    { key: 'shockEvent', width: 22 },        // Col D: Shock Event / Drawdown indicator
    { key: 'rrsp', width: 17 },              // Col E: RRSP / RRIF
    { key: 'tfsa', width: 17 },              // Col F: TFSA
    { key: 'fhsa', width: 16 },              // Col G: FHSA
    { key: 'nonReg', width: 17 },            // Col H: Non-Reg
    { key: 'homeEquity', width: 18 },        // Col I: Home Equity
    { key: 'totalNetWorth', width: 23 },     // Col J: Total Stressed Net Worth (FORMULA)
    { key: 'cpp', width: 16 },               // Col K: CPP
    { key: 'oas', width: 16 },               // Col L: OAS Net
    { key: 'withdrawals', width: 18 },       // Col M: Withdrawals
    { key: 'taxPaid', width: 16 },           // Col N: Tax Paid
    { key: 'debtPayment', width: 18 },       // Col O: Debt Payments
    { key: 'spendable', width: 20 },         // Col P: Spendable Cash
    { key: 'netWorthDelta', width: 22 },     // Col Q: Delta vs Baseline Net Worth
    { key: 'notes', width: 48 }              // Col R: Milestones & Resilience Notes
  ];

  // 2. Title Block (Row 1)
  worksheet.mergeCells('A1:R1');
  const titleCell = worksheet.getCell('A1');
  const clientName = inputs?.userName?.trim();
  titleCell.value = clientName
    ? `Strata — Macroeconomic Stress Test: ${scenario.name} (Prepared for: ${clientName})`
    : `Strata — Macroeconomic Stress Test: ${scenario.name} (${scenario.severity.toUpperCase()} IMPACT)`;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 30;

  // Subtitle / Metadata (Row 2)
  worksheet.mergeCells('A2:R2');
  const metaCell = worksheet.getCell('A2');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const clientTag = clientName ? `Client: ${clientName} | ` : '';
  const solvencyTag = stressDetails.isSolvent
    ? 'Solvency: Fully Funded (Solvent Through Life Expectancy)'
    : `Solvency: Portfolio Depleted @ Age ${stressDetails.depletionAge} (${stressDetails.yearsFunded} Yrs Funded)`;
  const shockTag = stressDetails.shockDropPercent > 0
    ? `Shock Drawdown: -${stressDetails.shockDropPercent}% @ Age ${stressDetails.shockAge}`
    : 'Longevity Horizon (+95 extra years)';
  const deltaTag = `Terminal NW Delta: $${Math.round(stressDetails.terminalNetWorthDelta).toLocaleString()}`;
  
  metaCell.value = `${clientTag}Historical Shock: ${scenario.description} | ${shockTag} | ${solvencyTag} | ${deltaTag} | Province: ${province} | Generated: ${todayStr}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(2).height = 20;

  // Blank spacer row 3
  worksheet.getRow(3).height = 8;

  // Explanation note (Row 4)
  worksheet.mergeCells('A4:R4');
  const noteCell = worksheet.getCell('A4');
  noteCell.value = `[STRESS TEST AUDIT] Evaluates retirement portfolio durability under ${scenario.name}. Drawdown shock applied at Age ${stressDetails.shockAge} (-${stressDetails.shockDropPercent}% portfolio drop). Total Stressed Net Worth =SUM(E:I) features dynamic Excel formulas.`;
  noteCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF0369A1' } };
  noteCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' } // Sky 100
  };
  noteCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(4).height = 18;

  // 3. Table Column Headers (Row 5)
  const headerRowNumber = 5;
  const headers = [
    'Age',
    'Sim Year',
    'Phase',
    'Shock Event & Severity',
    'RRSP / RRIF ($)',
    'TFSA ($)',
    'FHSA ($)',
    'Non-Reg ($)',
    'Home Equity ($)',
    'Total Stressed Net Worth ($)', // Col J - Total formula =SUM(E:I)
    'CPP Benefit ($)',
    'OAS Net ($)',
    'Withdrawals ($)',
    'Tax Paid ($)',
    'Debt Payments ($)',
    'Spendable Cash ($)',
    'Baseline Net Worth Delta ($)',
    'Resilience Notes & Milestones'
  ];

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 26;
  headers.forEach((hdr, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = hdr;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber <= 4 ? 'center' : colNumber === 18 ? 'left' : 'right',
      wrapText: true
    };

    if (colNumber === 10) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Navy for Stressed Net Worth
    } else if (colNumber === 9) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }; // Amber for Home Equity
    } else if (colNumber === 4) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Crimson for Shock Event
    } else if (colNumber === 17) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; // Slate for Delta
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
    }

    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF64748B' } },
      right: { style: 'thin', color: { argb: 'FF64748B' } }
    };
  });

  const currencyFormat = '$#,##0;($#,##0);"-"';

  // 4. Data Rows
  let currentRowNumber = headerRowNumber + 1;
  const firstDataRow = currentRowNumber;

  stressDetails.yearlyResults.forEach((row) => {
    const dataRow = worksheet.getRow(currentRowNumber);
    dataRow.height = 20;

    const isRetireTarget = row.age === retirementAge;
    const isShockAge = row.age === stressDetails.shockAge && stressDetails.shockDropPercent > 0;
    const isDepletionAge = stressDetails.depletionAge !== null && row.age === stressDetails.depletionAge;
    const isZebra = currentRowNumber % 2 === 0;

    let rowBgColor = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';
    if (isShockAge) {
      rowBgColor = 'FFFEF3C7'; // Soft Amber for shock year
    } else if (isDepletionAge) {
      rowBgColor = 'FFFEE2E2'; // Soft Rose/Red for portfolio depletion
    } else if (isRetireTarget) {
      rowBgColor = 'FFFFF1F2'; // Soft Rose for Retirement Target
    }

    // Col A: Age
    const cellA = dataRow.getCell(1);
    cellA.value = row.age;
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA.font = { name: 'Calibri', size: 10, bold: isRetireTarget || isShockAge || isDepletionAge };

    // Col B: Calendar Year
    const cellB = dataRow.getCell(2);
    cellB.value = row.year;
    cellB.alignment = { vertical: 'middle', horizontal: 'center' };
    cellB.font = { name: 'Calibri', size: 10 };

    // Col C: Phase
    const cellC = dataRow.getCell(3);
    cellC.value = {
      formula: `IF(A${currentRowNumber}>=${retirementAge}, "Retirement", "Working")`,
      result: row.isRetired ? 'Retirement' : 'Working'
    };
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    cellC.font = {
      name: 'Calibri',
      size: 9.5,
      bold: true,
      color: { argb: row.isRetired ? 'FF059669' : 'FF475569' }
    };

    // Col D: Shock Event & Severity
    const cellD = dataRow.getCell(4);
    if (isShockAge) {
      cellD.value = `💥 -${stressDetails.shockDropPercent}% Shock`;
      cellD.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
    } else if (isDepletionAge) {
      cellD.value = `⚠️ Depleted @ Age ${row.age}`;
      cellD.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFE11D48' } };
    } else {
      cellD.value = '-';
      cellD.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF94A3B8' } };
    }
    cellD.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col E: RRSP / RRIF
    const cellE = dataRow.getCell(5);
    cellE.value = Math.round((row.rrspBalance || 0) + (row.rrifBalance || 0));
    cellE.numFmt = currencyFormat;
    cellE.alignment = { vertical: 'middle', horizontal: 'right' };
    cellE.font = { name: 'Calibri', size: 10, color: { argb: 'FF1D4ED8' } };

    // Col F: TFSA
    const cellF = dataRow.getCell(6);
    cellF.value = Math.round(row.tfsaBalance || 0);
    cellF.numFmt = currencyFormat;
    cellF.alignment = { vertical: 'middle', horizontal: 'right' };
    cellF.font = { name: 'Calibri', size: 10, color: { argb: 'FF047857' } };

    // Col G: FHSA
    const cellG = dataRow.getCell(7);
    cellG.value = Math.round(row.fhsaBalance || 0);
    cellG.numFmt = currencyFormat;
    cellG.alignment = { vertical: 'middle', horizontal: 'right' };
    cellG.font = { name: 'Calibri', size: 10, color: { argb: 'FFB45309' } };

    // Col H: Non-Reg
    const cellH = dataRow.getCell(8);
    cellH.value = Math.round(row.nonRegBalance || 0);
    cellH.numFmt = currencyFormat;
    cellH.alignment = { vertical: 'middle', horizontal: 'right' };
    cellH.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B21A8' } };

    // Col I: Home Equity
    const cellI = dataRow.getCell(9);
    cellI.value = Math.round(row.realEstateShare || 0);
    cellI.numFmt = currencyFormat;
    cellI.alignment = { vertical: 'middle', horizontal: 'right' };
    cellI.font = { name: 'Calibri', size: 10, color: { argb: 'FFC2410C' } };

    // Col J: Total Stressed Net Worth
    const cellJ = dataRow.getCell(10);
    const debtRemaining = Math.round(row.remainingDebt || 0);
    cellJ.value = debtRemaining > 0
      ? { formula: `SUM(E${currentRowNumber}:I${currentRowNumber}) - ${debtRemaining}`, result: Math.round(row.totalNetWorth) }
      : { formula: `SUM(E${currentRowNumber}:I${currentRowNumber})`, result: Math.round(row.totalNetWorth) };
    cellJ.numFmt = currencyFormat;
    cellJ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellJ.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };

    // Col K: CPP Benefit
    const cellK = dataRow.getCell(11);
    cellK.value = Math.round(row.cppIncome || 0);
    cellK.numFmt = currencyFormat;
    cellK.alignment = { vertical: 'middle', horizontal: 'right' };
    cellK.font = { name: 'Calibri', size: 10 };

    // Col L: OAS Net
    const cellL = dataRow.getCell(12);
    cellL.value = Math.round(row.oasNetIncome || 0);
    cellL.numFmt = currencyFormat;
    cellL.alignment = { vertical: 'middle', horizontal: 'right' };
    cellL.font = { name: 'Calibri', size: 10 };

    // Col M: Withdrawals
    const cellM = dataRow.getCell(13);
    cellM.value = Math.round(row.totalWithdrawals || 0);
    cellM.numFmt = currencyFormat;
    cellM.alignment = { vertical: 'middle', horizontal: 'right' };
    cellM.font = { name: 'Calibri', size: 10 };

    // Col N: Tax Paid
    const cellN = dataRow.getCell(14);
    cellN.value = Math.round(row.totalTaxPaid || 0);
    cellN.numFmt = currencyFormat;
    cellN.alignment = { vertical: 'middle', horizontal: 'right' };
    cellN.font = { name: 'Calibri', size: 10, color: { argb: 'FFE11D48' } };

    // Col O: Debt Payments
    const cellO = dataRow.getCell(15);
    cellO.value = Math.round(row.debtPayment || 0);
    cellO.numFmt = currencyFormat;
    cellO.alignment = { vertical: 'middle', horizontal: 'right' };
    cellO.font = { name: 'Calibri', size: 10, color: { argb: 'FFE11D48' } };

    // Col P: Spendable Cash
    const cellP = dataRow.getCell(16);
    cellP.value = Math.round(row.netSpendableCashflow || 0);
    cellP.numFmt = currencyFormat;
    cellP.alignment = { vertical: 'middle', horizontal: 'right' };
    cellP.font = { name: 'Calibri', size: 10, bold: true };

    // Col Q: Baseline Delta
    const cellQ = dataRow.getCell(17);
    const baselineRow = baselineResults.find((b) => b.age === row.age);
    const delta = baselineRow ? Math.round(row.totalNetWorth - baselineRow.totalNetWorth) : 0;
    cellQ.value = delta;
    cellQ.numFmt = currencyFormat;
    cellQ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellQ.font = {
      name: 'Calibri',
      size: 10,
      bold: delta !== 0,
      color: { argb: delta < 0 ? 'FFE11D48' : delta > 0 ? 'FF059669' : 'FF64748B' }
    };

    // Col R: Notes
    const cellR = dataRow.getCell(18);
    const badges = (row.milestoneBadges || []).map((b) => `[${b.label}]`);
    const fullNotes = [...badges, ...row.notes];
    if (isShockAge) {
      fullNotes.unshift(`⚠️ HISTORICAL DRAWDOWN: -${stressDetails.shockDropPercent}% portfolio shock applied`);
    }
    if (isDepletionAge) {
      fullNotes.unshift(`🚨 PORTFOLIO DEPLETION: Liquid capital exhausted at Age ${row.age}`);
    }
    cellR.value = fullNotes.length > 0 ? fullNotes.join(' • ') : '-';
    cellR.alignment = { vertical: 'middle', horizontal: 'left' };
    cellR.font = {
      name: 'Calibri',
      size: 9.5,
      italic: fullNotes.length > 0,
      color: { argb: fullNotes.length > 0 ? 'FF92400E' : 'FF94A3B8' }
    };

    // Apply borders and backgrounds
    for (let c = 1; c <= 18; c++) {
      const cell = dataRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: c === 10 && !isRetireTarget && !isShockAge && !isDepletionAge ? 'FFF0FDF4' : rowBgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
      };
    }

    currentRowNumber++;
  });

  const lastDataRow = currentRowNumber - 1;

  // 5. Totals / Summary Row
  if (stressDetails.yearlyResults.length > 0) {
    const totalRow = worksheet.getRow(currentRowNumber);
    totalRow.height = 24;

    totalRow.getCell(1).value = 'TOTALS / ENDING';
    totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    totalRow.getCell(5).value = { formula: `E${lastDataRow}` };
    totalRow.getCell(5).numFmt = currencyFormat;

    totalRow.getCell(6).value = { formula: `F${lastDataRow}` };
    totalRow.getCell(6).numFmt = currencyFormat;

    totalRow.getCell(7).value = { formula: `G${lastDataRow}` };
    totalRow.getCell(7).numFmt = currencyFormat;

    totalRow.getCell(8).value = { formula: `H${lastDataRow}` };
    totalRow.getCell(8).numFmt = currencyFormat;

    totalRow.getCell(9).value = { formula: `I${lastDataRow}` };
    totalRow.getCell(9).numFmt = currencyFormat;

    totalRow.getCell(10).value = { formula: `J${lastDataRow}` };
    totalRow.getCell(10).numFmt = currencyFormat;

    totalRow.getCell(11).value = { formula: `SUM(K${firstDataRow}:K${lastDataRow})` };
    totalRow.getCell(11).numFmt = currencyFormat;

    totalRow.getCell(12).value = { formula: `SUM(L${firstDataRow}:L${lastDataRow})` };
    totalRow.getCell(12).numFmt = currencyFormat;

    totalRow.getCell(13).value = { formula: `SUM(M${firstDataRow}:M${lastDataRow})` };
    totalRow.getCell(13).numFmt = currencyFormat;

    totalRow.getCell(14).value = { formula: `SUM(N${firstDataRow}:N${lastDataRow})` };
    totalRow.getCell(14).numFmt = currencyFormat;

    totalRow.getCell(15).value = { formula: `SUM(O${firstDataRow}:O${lastDataRow})` };
    totalRow.getCell(15).numFmt = currencyFormat;

    totalRow.getCell(16).value = { formula: `AVERAGE(P${firstDataRow}:P${lastDataRow})` };
    totalRow.getCell(16).numFmt = currencyFormat;

    totalRow.getCell(17).value = { formula: `Q${lastDataRow}` };
    totalRow.getCell(17).numFmt = currencyFormat;

    totalRow.getCell(18).value = stressDetails.isSolvent
      ? `Resilient: Fully Solvent Through Age ${inputs?.lifeExpectancy || 85}`
      : `Stressed Depletion at Age ${stressDetails.depletionAge} (${stressDetails.yearsFunded} Years Funded)`;
    totalRow.getCell(18).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: stressDetails.isSolvent ? 'FF059669' : 'FFE11D48' } };

    for (let c = 1; c <= 18; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Classic Excel Accounting Underline
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  }
}

/**
 * Overall Master Comprehensive Export:
 * Exports the Annual Simulation Ledger, Estate Planning Ledger, 6 Macro Stress Test Ledgers,
 * and Expat Planning Ledger all in one organized Excel (.xlsx) workbook with clearly labelled tabs.
 */
export async function exportMasterComprehensiveExcel({
  inputs,
  summary,
  yearlyResults,
  estateInputs,
  expatInputs,
  stressTiming = 'at_retirement',
  customStressAge
}: MasterExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Canadian Wealth Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const clientName = inputs?.userName?.trim();
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const todayStr = new Date().toLocaleDateString('en-CA');

  // 1. Tab: Annual Simulation Ledger
  const wsSim = workbook.addWorksheet('Annual Simulation Ledger', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });
  populateSimulationLedgerSheet(wsSim, {
    data: yearlyResults,
    filterMode: 'all',
    retirementAge: inputs.retirementAge,
    province: inputs.province,
    inputs,
    customTitle: clientName
      ? `Strata — Annual Simulation Ledger (Prepared for: ${clientName})`
      : 'Strata — Canadian Wealth & Retirement Simulation Annual Ledger'
  });

  // 2. Tab: Estate Planning Ledger
  const effEstateInputs: EstatePlanningInputs = estateInputs || {
    ...DEFAULT_ESTATE_INPUTS,
    passingAge: inputs.lifeExpectancy || 85,
    hasNextOfKin: inputs.maritalStatus === 'married' || Boolean(inputs.spouse),
    kinCategory: (inputs.maritalStatus === 'married' || Boolean(inputs.spouse)) ? 'spouse' : 'children'
  };
  const estateRows = generateEstateMilestoneLedger(effEstateInputs, inputs, yearlyResults);
  const wsEstate = workbook.addWorksheet('Estate Planning Ledger', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });
  populateEstateLedgerSheet(wsEstate, {
    data: estateRows,
    filterMode: 'all',
    passingAge: effEstateInputs.passingAge,
    retirementAge: inputs.retirementAge,
    province: inputs.province,
    inputs,
    estateInputs: effEstateInputs
  });

  // 3. Tabs: The Different Historical Stress Test Ledgers
  const scenarioTabNames: Record<string, string> = {
    gfc_2008: 'Stress - 2008 Crisis',
    stagflation_1973: 'Stress - 1970s Stagflation',
    sequence_of_returns: 'Stress - Sequence Shock',
    dotcom_2000: 'Stress - 2000 Dot-Com',
    immediate_crash: 'Stress - Immediate Shock',
    longevity_95: 'Stress - Longevity 95'
  };

  HISTORICAL_SCENARIOS.forEach((scen) => {
    const tabName = scenarioTabNames[scen.id] || `Stress - ${scen.name.slice(0, 20)}`;
    const stressDetails = runStressScenarioSimulation(inputs, scen.id, stressTiming, customStressAge);
    const wsStress = workbook.addWorksheet(tabName, {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
    });
    populateStressTestLedgerSheet(wsStress, {
      scenario: scen,
      stressDetails,
      baselineResults: yearlyResults,
      retirementAge: inputs.retirementAge,
      province: inputs.province,
      inputs
    });
  });

  // 4. Tab: Expat Planning Ledger
  const effExpatInputs: ExpatInputs = expatInputs || inputs.expat || DEFAULT_EXPAT_INPUTS;
  const expatSummary = calculateExpatRetirementPlan(effExpatInputs, inputs, yearlyResults, summary);
  const wsExpat = workbook.addWorksheet('Expat Planning Ledger', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

  const expatExcelRows: ExpatExcelExportRow[] = yearlyResults.map((yr) => {
    const isNonResident = yr.age >= expatSummary.departureAge;
    const isRetired = yr.age >= inputs.retirementAge;
    const isRetirement = yr.age === inputs.retirementAge;
    const isDeparture = yr.age === expatSummary.departureAge;
    const isOasAge = yr.age === 65;
    const isRrifAge = yr.age === 71;

    const expatYr = expatSummary.yearlyExpatResults.find((ey) => ey.age === yr.age);

    const craPartXIIICAD = isNonResident && expatYr ? expatYr.craPartXIIIWithholdingCAD : 0;
    const destinationLocalTaxCAD = isNonResident && expatYr ? expatYr.destinationLocalTaxCAD : 0;
    const departureTaxCAD = isDeparture && expatYr ? expatYr.departureTaxCAD : (isDeparture ? expatSummary.departureTaxEstimateCAD : 0);

    const totalTaxPaidCAD = isNonResident
      ? (craPartXIIICAD + destinationLocalTaxCAD + departureTaxCAD)
      : yr.totalTaxPaid;

    const spendableCashCAD = isNonResident && expatYr
      ? expatYr.expatNetIncomeCAD
      : yr.netSpendableCashflow;

    const exchangeRate = effExpatInputs.customExchangeRate || expatSummary.destinationCountry.exchangeRateToCAD;
    const colIndex = effExpatInputs.customCostOfLivingFactor || expatSummary.destinationCountry.costOfLivingIndex;
    const spendableCashLocal = isNonResident && expatYr
      ? expatYr.expatNetIncomeLocalCurrency
      : spendableCashCAD * exchangeRate;

    const livingTargetCAD = yr.targetSpendingNominal;
    const livingTargetLocal = isNonResident
      ? (livingTargetCAD * colIndex * exchangeRate)
      : (livingTargetCAD * exchangeRate);

    const cppIncomeCAD = isNonResident && expatYr ? expatYr.cppReceivedCAD : yr.cppIncome;
    const oasNetIncomeCAD = isNonResident && expatYr ? expatYr.oasReceivedCAD : yr.oasNetIncome;

    const rowNotes: string[] = [];
    if (isDeparture) {
      rowNotes.push(`✈️ Relocated to ${expatSummary.destinationCountry.name} (Age ${expatSummary.departureAge}). Non-resident Part XIII tax rules active.`);
      if (departureTaxCAD > 0) {
        rowNotes.push(`⚠️ Section 128.1 Departure Tax: C$${Math.round(departureTaxCAD).toLocaleString()}`);
      }
    }
    if (isRetirement && !isDeparture) {
      rowNotes.push(`🎯 Retirement Day: Decumulation begins with starting wealth C$${Math.round(yr.totalNetWorth).toLocaleString()}`);
    }
    if (isOasAge) {
      rowNotes.push(expatSummary.qualifiesForLifetimeWorldwideOAS ? `🇨🇦 OAS Worldwide Pension Active` : `⚠️ OAS Terminates Abroad (<20 yrs resident)`);
    }
    if (isRrifAge) {
      rowNotes.push(`👴 Age 71 RRIF Mandatory Conversion with ${expatSummary.destinationCountry.treatyRates.rrspPeriodicWithholding}% withholding`);
    }
    if (yr.notes) {
      yr.notes.forEach((n) => {
        if (!rowNotes.some((rn) => rn.includes(n.slice(0, 15)))) {
          rowNotes.push(n);
        }
      });
    }

    return {
      age: yr.age,
      year: yr.year,
      isNonResident,
      isRetired,
      isDeparture,
      rrspBalance: yr.rrspBalance,
      tfsaBalance: yr.tfsaBalance,
      fhsaBalance: yr.fhsaBalance,
      nonRegBalance: yr.nonRegBalance,
      homeEquity: yr.realEstateShare || yr.homeEquity || 0,
      totalNetWorth: yr.totalNetWorth,
      investmentGrowth: yr.totalInvestmentGrowth,
      cppIncomeCAD,
      oasNetIncomeCAD,
      totalWithdrawalsCAD: yr.totalWithdrawals,
      totalTaxPaidCAD,
      craPartXIIICAD,
      destinationLocalTaxCAD,
      departureTaxCAD,
      spendableCashCAD,
      spendableCashLocal,
      livingTargetCAD,
      livingTargetLocal,
      notes: rowNotes
    };
  });

  populateExpatLedgerSheet(wsExpat, {
    data: expatExcelRows,
    filterMode: 'all',
    departureAge: expatSummary.departureAge,
    departureYear: expatSummary.departureYear,
    destinationCountry: expatSummary.destinationCountry,
    exchangeRate: effExpatInputs.customExchangeRate || expatSummary.destinationCountry.exchangeRateToCAD,
    colIndex: effExpatInputs.customCostOfLivingFactor || expatSummary.destinationCountry.costOfLivingIndex,
    qualifiesForLifetimeWorldwideOAS: expatSummary.qualifiesForLifetimeWorldwideOAS,
    departureTaxEstimateCAD: expatSummary.departureTaxEstimateCAD,
    retirementAge: inputs.retirementAge,
    province: inputs.province,
    inputs,
    expatInputs: effExpatInputs
  });

  // 5. Tab: Current and Projected Cash Flows
  const wsCashFlow = workbook.addWorksheet('Cash Flow Projections', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });
  populateCashFlowLedgerSheet(wsCashFlow, {
    data: yearlyResults,
    filterMode: 'all',
    retirementAge: inputs.retirementAge,
    province: inputs.province,
    inputs
  });

  // 6. Download Master Unified Workbook
  await downloadWorkbook(workbook, `Strata_${safeClient}Comprehensive_Wealth_Plan_Master_Ledger_${todayStr}.xlsx`);
}

export interface CashFlowExcelExportOptions {
  data: YearSimulationResult[];
  filterMode?: 'all' | 'working' | 'retirement' | 'milestones';
  retirementAge: number;
  province?: string;
  inputs?: RetirementInputs;
}

/**
 * Populates an audit-grade Excel worksheet for Current & Projected Annual Cash Flows
 */
export function populateCashFlowLedgerSheet(
  worksheet: ExcelJS.Worksheet,
  {
    data,
    filterMode = 'all',
    retirementAge,
    province = 'Ontario',
    inputs
  }: CashFlowExcelExportOptions
): void {
  // 1. Column Definitions (17 columns A to Q)
  worksheet.columns = [
    { key: 'age', width: 10 },               // Col A: Age
    { key: 'year', width: 12 },              // Col B: Sim Year
    { key: 'phase', width: 14 },             // Col C: Phase
    { key: 'salary', width: 18 },            // Col D: Salary / Employment
    { key: 'pensions', width: 18 },          // Col E: CPP & OAS
    { key: 'withdrawals', width: 18 },       // Col F: Withdrawals
    { key: 'totalInflow', width: 22 },       // Col G: Total Inflow (FORMULA: =SUM(D:F))
    { key: 'livingExpenses', width: 18 },    // Col H: Living Expenses
    { key: 'rentOrMortgage', width: 18 },    // Col I: Rent / Mortgage
    { key: 'debtPayments', width: 16 },      // Col J: Debt Payments
    { key: 'totalOutflow', width: 20 },      // Col K: Total Outflow (FORMULA: =SUM(H:J))
    { key: 'taxPaid', width: 17 },           // Col L: Tax Paid
    { key: 'effTaxRate', width: 15 },        // Col M: Effective Tax %
    { key: 'margTaxRate', width: 15 },       // Col N: Marginal Tax %
    { key: 'savings', width: 18 },           // Col O: Registered & Total Savings
    { key: 'netSurplus', width: 22 },        // Col P: Post-Tax Cash Surplus (FORMULA: =G-K-L)
    { key: 'notes', width: 46 }              // Col Q: Milestones & Notes
  ];

  // 2. Title Block (Row 1)
  worksheet.mergeCells('A1:Q1');
  const titleCell = worksheet.getCell('A1');
  const clientName = inputs?.userName?.trim();
  titleCell.value = clientName
    ? `Strata — Current & Projected Annual Cash Flows (Prepared for: ${clientName})`
    : 'Strata — Current & Projected Annual Cash Flows';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 30;

  // Subtitle / Metadata (Row 2)
  worksheet.mergeCells('A2:Q2');
  const metaCell = worksheet.getCell('A2');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const clientTag = clientName ? `Client: ${clientName} | ` : '';
  metaCell.value = `${clientTag}Target Retirement: Age ${retirementAge} | Province: ${province} | Cash Flow Model: Inflows, Living/Housing/Debt Outflows, Taxes & Savings | Generated: ${todayStr}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(2).height = 20;

  // Spacer row 3
  worksheet.getRow(3).height = 8;

  // Note row 4
  worksheet.mergeCells('A4:Q4');
  const noteCell = worksheet.getCell('A4');
  noteCell.value = '[NOTE] Strata Cash Flow Ledger: Inflows reflect earned salaries, CPP, OAS, and portfolio drawdowns. Total Inflow =SUM(D:F), Total Outflow =SUM(H:J), and Post-Tax Surplus =G-K-L feature dynamic Excel accounting formulas.';
  noteCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF0369A1' } };
  noteCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' } // Sky 100
  };
  noteCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(4).height = 18;

  // 3. Headers (Row 5)
  const headerRowNumber = 5;
  const headers = [
    'Age',
    'Sim Year',
    'Phase',
    'Employment Salary ($)',
    'CPP & OAS Pensions ($)',
    'Portfolio Withdrawals ($)',
    'Total Cash Inflows ($)',    // Col G - Header Emerald FF047857
    'Living Expenses ($)',
    'Rent / Mortgage ($)',
    'Debt Payments ($)',
    'Total Outflows ($)',        // Col K - Header Amber FFB45309
    'CRA Income Tax ($)',        // Col L - Header Rose FFE11D48
    'Effective Tax Rate',
    'Marginal Tax Bracket',
    'Total Savings Added ($)',
    'Post-Tax Cash Surplus ($)', // Col P - Header Deep Navy FF1E3A8A
    'Milestones & Strategic Notes'
  ];

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 26;
  headers.forEach((hdr, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = hdr;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber <= 3 || colNumber === 13 || colNumber === 14 ? 'center' : colNumber === 17 ? 'left' : 'right',
      wrapText: true
    };

    if (colNumber === 7) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // Emerald 800
    } else if (colNumber === 11) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }; // Amber 700
    } else if (colNumber === 12) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F1239' } }; // Rose 800
    } else if (colNumber === 16) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Navy
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
    }

    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF64748B' } },
      right: { style: 'thin', color: { argb: 'FF64748B' } }
    };
  });

  const currencyFormat = '$#,##0;($#,##0);"-"';
  const percentFormat = '0.0%';

  // 4. Data Rows
  let currentRowNumber = headerRowNumber + 1;
  const firstDataRow = currentRowNumber;

  data.forEach((row) => {
    const dataRow = worksheet.getRow(currentRowNumber);
    dataRow.height = 20;

    const isRetireTarget = row.age === retirementAge;
    const isZebra = currentRowNumber % 2 === 0;
    const rowBgColor = isRetireTarget ? 'FFFFF1F2' : isZebra ? 'FFF8FAFC' : 'FFFFFFFF';

    const rentMortVal = Math.round(row.rentOrMortgagePayment ?? 0);
    const livingExpVal = Math.round(row.livingExpensesNominal ?? Math.max(0, row.targetSpendingNominal - rentMortVal));
    const debtVal = Math.round(row.debtPayment || 0);
    const totalInflowVal = Math.round(row.employmentIncome + row.cppIncome + row.oasNetIncome + row.totalWithdrawals);
    const totalOutflowVal = livingExpVal + rentMortVal + debtVal;

    // Col A: Age
    const cellA = dataRow.getCell(1);
    cellA.value = row.age;
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA.font = { name: 'Calibri', size: 10, bold: isRetireTarget };

    // Col B: Year
    const cellB = dataRow.getCell(2);
    cellB.value = row.year;
    cellB.alignment = { vertical: 'middle', horizontal: 'center' };
    cellB.font = { name: 'Calibri', size: 10 };

    // Col C: Phase
    const cellC = dataRow.getCell(3);
    cellC.value = {
      formula: `IF(A${currentRowNumber}>=${retirementAge}, "Retirement", "Working")`,
      result: row.isRetired ? 'Retirement' : 'Working'
    };
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    cellC.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: row.isRetired ? 'FF059669' : 'FF475569' } };

    // Col D: Employment Salary
    const cellD = dataRow.getCell(4);
    cellD.value = Math.round(row.employmentIncome);
    cellD.numFmt = currencyFormat;
    cellD.alignment = { vertical: 'middle', horizontal: 'right' };
    cellD.font = { name: 'Calibri', size: 10, color: { argb: 'FF4338CA' } };

    // Col E: CPP & OAS
    const cellE = dataRow.getCell(5);
    cellE.value = Math.round(row.cppIncome + row.oasNetIncome);
    cellE.numFmt = currencyFormat;
    cellE.alignment = { vertical: 'middle', horizontal: 'right' };
    cellE.font = { name: 'Calibri', size: 10, color: { argb: 'FF1D4ED8' } };

    // Col F: Withdrawals
    const cellF = dataRow.getCell(6);
    cellF.value = Math.round(row.totalWithdrawals);
    cellF.numFmt = currencyFormat;
    cellF.alignment = { vertical: 'middle', horizontal: 'right' };
    cellF.font = { name: 'Calibri', size: 10, color: { argb: 'FF0D9488' } };

    // Col G: Total Cash Inflow (Formula: =SUM(D:F))
    const cellG = dataRow.getCell(7);
    cellG.value = {
      formula: `SUM(D${currentRowNumber}:F${currentRowNumber})`,
      result: totalInflowVal
    };
    cellG.numFmt = currencyFormat;
    cellG.alignment = { vertical: 'middle', horizontal: 'right' };
    cellG.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF065F46' } };

    // Col H: Living Expenses
    const cellH = dataRow.getCell(8);
    cellH.value = livingExpVal;
    cellH.numFmt = currencyFormat;
    cellH.alignment = { vertical: 'middle', horizontal: 'right' };
    cellH.font = { name: 'Calibri', size: 10, color: { argb: 'FFB45309' } };

    // Col I: Rent / Mortgage
    const cellI = dataRow.getCell(9);
    cellI.value = rentMortVal;
    cellI.numFmt = currencyFormat;
    cellI.alignment = { vertical: 'middle', horizontal: 'right' };
    cellI.font = { name: 'Calibri', size: 10, color: { argb: 'FF0369A1' } };

    // Col J: Debt Payments
    const cellJ = dataRow.getCell(10);
    cellJ.value = debtVal;
    cellJ.numFmt = currencyFormat;
    cellJ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellJ.font = { name: 'Calibri', size: 10, color: { argb: 'FFEA580C' } };

    // Col K: Total Outflow (Formula: =SUM(H:J))
    const cellK = dataRow.getCell(11);
    cellK.value = {
      formula: `SUM(H${currentRowNumber}:J${currentRowNumber})`,
      result: totalOutflowVal
    };
    cellK.numFmt = currencyFormat;
    cellK.alignment = { vertical: 'middle', horizontal: 'right' };
    cellK.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9A3412' } };

    // Col L: Tax Paid
    const cellL = dataRow.getCell(12);
    cellL.value = Math.round(row.totalTaxPaid);
    cellL.numFmt = currencyFormat;
    cellL.alignment = { vertical: 'middle', horizontal: 'right' };
    cellL.font = { name: 'Calibri', size: 10, color: { argb: 'FFE11D48' } };

    // Col M: Effective Tax Rate
    const cellM = dataRow.getCell(13);
    cellM.value = row.effectiveTaxRate;
    cellM.numFmt = percentFormat;
    cellM.alignment = { vertical: 'middle', horizontal: 'center' };
    cellM.font = { name: 'Calibri', size: 10 };

    // Col N: Marginal Tax Rate
    const cellN = dataRow.getCell(14);
    cellN.value = row.marginalTaxRate;
    cellN.numFmt = percentFormat;
    cellN.alignment = { vertical: 'middle', horizontal: 'center' };
    cellN.font = { name: 'Calibri', size: 10 };

    // Col O: Registered & Total Savings
    const cellO = dataRow.getCell(15);
    const savings = Math.round(row.rrspContribution + row.tfsaContribution + row.fhsaContribution + row.nonRegContribution);
    cellO.value = savings;
    cellO.numFmt = currencyFormat;
    cellO.alignment = { vertical: 'middle', horizontal: 'right' };
    cellO.font = { name: 'Calibri', size: 10, color: { argb: 'FF4F46E5' } };

    // Col P: Post-Tax Cash Surplus (Formula: =G-K-L)
    const cellP = dataRow.getCell(16);
    cellP.value = {
      formula: `G${currentRowNumber}-K${currentRowNumber}-L${currentRowNumber}`,
      result: Math.round(totalInflowVal - totalOutflowVal - row.totalTaxPaid)
    };
    cellP.numFmt = currencyFormat;
    cellP.alignment = { vertical: 'middle', horizontal: 'right' };
    cellP.font = { name: 'Calibri', size: 10, bold: true, color: { argb: row.netSpendableCashflow >= 0 ? 'FF059669' : 'FFE11D48' } };

    // Col Q: Notes
    const cellQ = dataRow.getCell(17);
    const badges = (row.milestoneBadges || []).map((b) => `[${b.label}]`);
    const fullNotes = [...badges, ...row.notes];
    cellQ.value = fullNotes.length > 0 ? fullNotes.join(' • ') : '-';
    cellQ.alignment = { vertical: 'middle', horizontal: 'left' };
    cellQ.font = {
      name: 'Calibri',
      size: 9.5,
      italic: fullNotes.length > 0,
      color: { argb: fullNotes.length > 0 ? 'FF92400E' : 'FF94A3B8' }
    };

    // Apply borders and backgrounds
    for (let c = 1; c <= 17; c++) {
      const cell = dataRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: c === 7 && !isRetireTarget ? 'FFF0FDF4' : c === 16 && !isRetireTarget ? 'FFEFF6FF' : rowBgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
      };
    }

    currentRowNumber++;
  });

  const lastDataRow = currentRowNumber - 1;

  // 5. Totals / Summary Row
  if (data.length > 0) {
    const totalRow = worksheet.getRow(currentRowNumber);
    totalRow.height = 24;

    totalRow.getCell(1).value = 'TOTALS / AVERAGES';
    totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    totalRow.getCell(4).value = { formula: `SUM(D${firstDataRow}:D${lastDataRow})` };
    totalRow.getCell(4).numFmt = currencyFormat;

    totalRow.getCell(5).value = { formula: `SUM(E${firstDataRow}:E${lastDataRow})` };
    totalRow.getCell(5).numFmt = currencyFormat;

    totalRow.getCell(6).value = { formula: `SUM(F${firstDataRow}:F${lastDataRow})` };
    totalRow.getCell(6).numFmt = currencyFormat;

    totalRow.getCell(7).value = { formula: `SUM(G${firstDataRow}:G${lastDataRow})` };
    totalRow.getCell(7).numFmt = currencyFormat;

    totalRow.getCell(8).value = { formula: `SUM(H${firstDataRow}:H${lastDataRow})` };
    totalRow.getCell(8).numFmt = currencyFormat;

    totalRow.getCell(9).value = { formula: `SUM(I${firstDataRow}:I${lastDataRow})` };
    totalRow.getCell(9).numFmt = currencyFormat;

    totalRow.getCell(10).value = { formula: `SUM(J${firstDataRow}:J${lastDataRow})` };
    totalRow.getCell(10).numFmt = currencyFormat;

    totalRow.getCell(11).value = { formula: `SUM(K${firstDataRow}:K${lastDataRow})` };
    totalRow.getCell(11).numFmt = currencyFormat;

    totalRow.getCell(12).value = { formula: `SUM(L${firstDataRow}:L${lastDataRow})` };
    totalRow.getCell(12).numFmt = currencyFormat;

    totalRow.getCell(13).value = { formula: `AVERAGE(M${firstDataRow}:M${lastDataRow})` };
    totalRow.getCell(13).numFmt = percentFormat;

    totalRow.getCell(14).value = { formula: `AVERAGE(N${firstDataRow}:N${lastDataRow})` };
    totalRow.getCell(14).numFmt = percentFormat;

    totalRow.getCell(15).value = { formula: `SUM(O${firstDataRow}:O${lastDataRow})` };
    totalRow.getCell(15).numFmt = currencyFormat;

    totalRow.getCell(16).value = { formula: `SUM(P${firstDataRow}:P${lastDataRow})` };
    totalRow.getCell(16).numFmt = currencyFormat;

    totalRow.getCell(17).value = 'Lifetime Cumulative Cash Flow Model';
    totalRow.getCell(17).font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF059669' } };

    for (let c = 1; c <= 17; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Classic Excel Accounting Underline
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  }
}

export async function exportCashFlowLedgerToExcel(options: CashFlowExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Canadian Wealth Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Cash Flow Projections', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

  populateCashFlowLedgerSheet(worksheet, options);

  const clientName = options.inputs?.userName?.trim();
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const todayStr = new Date().toLocaleDateString('en-CA');
  await downloadWorkbook(workbook, `Strata_${safeClient}Current_Projected_Cash_Flows_${todayStr}.xlsx`);
}

