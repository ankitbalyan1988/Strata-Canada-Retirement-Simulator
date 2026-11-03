import ExcelJS from 'exceljs';
import { YearSimulationResult, RetirementInputs } from '../types/retirement';

export interface ExcelExportOptions {
  data: YearSimulationResult[];
  filterMode: 'milestones' | 'retirement' | 'all';
  retirementAge: number;
  province?: string;
  inputs?: RetirementInputs;
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
  titleCell.value = 'Strata — Canadian Wealth & Retirement Simulation Annual Ledger';
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
  const planInfo = inputs
    ? `Target Retirement: Age ${retirementAge} | Province: ${province} | Housing: ${inputs.realEstate?.ownsHome ? (inputs.realEstate.purchaseType === 'future' ? `Future Buy @ Age ${inputs.realEstate.futurePurchaseAge || 'Future'}` : 'Homeowner') : 'Renting'}`
    : `Target Retirement: Age ${retirementAge} | Province: ${province}`;
  metaCell.value = `Export View: ${filterLabels[filterMode] || filterMode} | ${planInfo} | Generated: ${todayStr}`;
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
  noteCell.value = '💡 Strata Audit-Grade Ledger: Account balances reflect exact simulation values (including home purchase down payments, equity transfers, and tax optimizations). Total Net Worth =SUM(D:H) and cumulative summaries feature dynamic Excel formulas.';
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
  const safeModeName = filterMode.replace(/\s+/g, '_');
  anchor.href = url;
  anchor.download = `Strata_${safeModeName}_Ledger_${todayStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
