import ExcelJS from 'exceljs';
import { YearSimulationResult, RetirementInputs } from '../types/retirement';
import { EstateMilestoneRow, EstatePlanningInputs, EstateFilterMode } from '../types/estate';
import { ExpatDestinationCountry, ExpatInputs } from '../types/expat';

export interface ExcelExportOptions {
  data: YearSimulationResult[];
  filterMode: 'milestones' | 'retirement' | 'all';
  retirementAge: number;
  province?: string;
  inputs?: RetirementInputs;
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

export async function exportMilestoneTableToExcel({
  data,
  filterMode,
  retirementAge,
  province = 'Ontario',
  inputs
}: ExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Canadian Wealth Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const filterLabels: Record<string, string> = {
    milestones: 'Key Milestones (5-Year Intervals & Major Life Events)',
    retirement: 'Retirement Years Only',
    all: 'Complete Projection (All Years)'
  };

  const sheetName = filterMode === 'milestones'
    ? 'Milestone Schedule'
    : filterMode === 'retirement'
    ? 'Retirement Phase'
    : 'Full Simulation';

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

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
  titleCell.value = clientName
    ? `Strata — Canadian Wealth & Retirement Ledger (Prepared for: ${clientName})`
    : 'Strata — Canadian Wealth & Retirement Simulation Annual Ledger';
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

  // 6. Write Buffer & Trigger Browser Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const safeModeName = filterMode.replace(/\s+/g, '_');
  anchor.href = url;
  anchor.download = `Strata_${safeClient}${safeModeName}_Ledger_${todayStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Exports the Canadian Estate Planning & Milestone Ledger to an audit-grade Excel workbook.
 */
export async function exportEstateLedgerToExcel({
  data,
  filterMode,
  passingAge,
  retirementAge,
  province = 'Ontario',
  inputs,
  estateInputs
}: EstateExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Canadian Wealth & Estate Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const filterLabels: Record<string, string> = {
    milestones: 'Key Estate Milestones (5-Year Intervals, Passing Age & Conversion Events)',
    retirement: 'Retirement Phase Liquidation',
    all: 'Complete Lifetime Estate Projection (All Years)'
  };

  const sheetName = filterMode === 'milestones'
    ? 'Estate Milestones'
    : filterMode === 'retirement'
    ? 'Estate in Retirement'
    : 'Full Estate Projection';

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

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

  // 6. Write Buffer & Trigger Browser Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const safeModeName = filterMode.replace(/\s+/g, '_');
  anchor.href = url;
  anchor.download = `Strata_${safeClient}Estate_${safeModeName}_Ledger_${todayStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
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

export async function exportExpatLedgerToExcel({
  data,
  filterMode,
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
}: ExpatExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Strata Cross-Border & Expat Platform';
  workbook.lastModifiedBy = 'Strata';
  workbook.created = new Date();
  workbook.modified = new Date();

  const filterLabels: Record<string, string> = {
    milestones: 'Strategic Milestones (Departure, Pensions, & Key Transition Events)',
    expat: `Expat Years Only (Ages ${departureAge}+ Abroad in ${destinationCountry.name})`,
    retirement: 'Retirement Decumulation Phase',
    all: 'Complete Cross-Border Lifecycle (All Simulation Years)'
  };

  const sheetName = filterMode === 'milestones'
    ? 'Expat Milestones'
    : filterMode === 'expat'
    ? `${destinationCountry.name} Expat Phase`
    : filterMode === 'retirement'
    ? 'Retirement Phase'
    : 'Full Expat Lifecycle';

  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
  });

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

  // 6. Write Buffer & Trigger Browser Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeClient = clientName ? `${clientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  const safeCountry = destinationCountry.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeModeName = filterMode.replace(/\s+/g, '_');
  anchor.href = url;
  anchor.download = `Strata_${safeClient}Expat_${safeCountry}_${safeModeName}_Ledger_${todayStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

