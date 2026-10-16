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
  workbook.creator = 'MapleRetire Canadian Wealth Planner';
  workbook.lastModifiedBy = 'MapleRetire';
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
    { key: 'spendable', width: 20 },         // Col N
    { key: 'notes', width: 45 }              // Col O
  ];

  // 2. Title Block
  worksheet.mergeCells('A1:O1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '🍁 MapleRetire — Canadian Retirement Simulation & Annual Ledger';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 30;

  // Subtitle / Metadata
  worksheet.mergeCells('A2:O2');
  const metaCell = worksheet.getCell('A2');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const planInfo = inputs
    ? `Target Retirement: Age ${retirementAge} | Province: ${province} | Homeowner: ${inputs.realEstate?.ownsHome ? 'Yes' : 'No'}`
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

  // Explanation note for formula
  worksheet.mergeCells('A4:O4');
  const noteCell = worksheet.getCell('A4');
  noteCell.value = 'Note: The "Total Net Worth" column retains dynamic Excel formulas: =SUM(D#:H#) summing RRSP, TFSA, FHSA, Non-Reg, and Home Equity. Totals row at the bottom includes Excel SUM / Final formulas.';
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
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 3 ? 'center' : colNumber === 15 ? 'left' : 'right',
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

  data.forEach((row) => {
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

    // Set Values
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

    // Col C: Phase
    const cellC = dataRow.getCell(3);
    cellC.value = row.isRetired ? 'Retirement' : 'Working';
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    cellC.font = {
      name: 'Calibri',
      size: 9.5,
      bold: true,
      color: { argb: row.isRetired ? 'FF059669' : 'FF475569' }
    };

    // Col D: RRSP / RRIF
    const cellD = dataRow.getCell(4);
    cellD.value = Math.round(row.rrspBalance);
    cellD.numFmt = currencyFormat;
    cellD.alignment = { vertical: 'middle', horizontal: 'right' };
    cellD.font = { name: 'Calibri', size: 10, color: { argb: 'FF1D4ED8' } };

    // Col E: TFSA
    const cellE = dataRow.getCell(5);
    cellE.value = Math.round(row.tfsaBalance);
    cellE.numFmt = currencyFormat;
    cellE.alignment = { vertical: 'middle', horizontal: 'right' };
    cellE.font = { name: 'Calibri', size: 10, color: { argb: 'FF047857' } };

    // Col F: FHSA
    const cellF = dataRow.getCell(6);
    cellF.value = Math.round(row.fhsaBalance);
    cellF.numFmt = currencyFormat;
    cellF.alignment = { vertical: 'middle', horizontal: 'right' };
    cellF.font = { name: 'Calibri', size: 10, color: { argb: 'FFB45309' } };

    // Col G: Non-Reg
    const cellG = dataRow.getCell(7);
    cellG.value = Math.round(row.nonRegBalance);
    cellG.numFmt = currencyFormat;
    cellG.alignment = { vertical: 'middle', horizontal: 'right' };
    cellG.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B21A8' } };

    // Col H: Home Equity
    const cellH = dataRow.getCell(8);
    cellH.value = Math.round(row.realEstateShare);
    cellH.numFmt = currencyFormat;
    cellH.alignment = { vertical: 'middle', horizontal: 'right' };
    cellH.font = { name: 'Calibri', size: 10, color: { argb: 'FFC2410C' } };

    // Col I: Total Net Worth -> DYNAMIC FORMULA: =SUM(D{row}:H{row})
    const cellI = dataRow.getCell(9);
    cellI.value = {
      formula: `SUM(D${currentRowNumber}:H${currentRowNumber})`,
      result: Math.round(row.totalNetWorth)
    };
    cellI.numFmt = currencyFormat;
    cellI.alignment = { vertical: 'middle', horizontal: 'right' };
    cellI.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };

    // Col J: CPP Benefit
    const cellJ = dataRow.getCell(10);
    cellJ.value = Math.round(row.cppIncome);
    cellJ.numFmt = currencyFormat;
    cellJ.alignment = { vertical: 'middle', horizontal: 'right' };
    cellJ.font = { name: 'Calibri', size: 10 };

    // Col K: OAS Net
    const cellK = dataRow.getCell(11);
    cellK.value = Math.round(row.oasNetIncome);
    cellK.numFmt = currencyFormat;
    cellK.alignment = { vertical: 'middle', horizontal: 'right' };
    cellK.font = { name: 'Calibri', size: 10 };

    // Col L: Withdrawals
    const cellL = dataRow.getCell(12);
    cellL.value = Math.round(row.totalWithdrawals);
    cellL.numFmt = currencyFormat;
    cellL.alignment = { vertical: 'middle', horizontal: 'right' };
    cellL.font = { name: 'Calibri', size: 10 };

    // Col M: Tax Paid
    const cellM = dataRow.getCell(13);
    cellM.value = Math.round(row.totalTaxPaid);
    cellM.numFmt = currencyFormat;
    cellM.alignment = { vertical: 'middle', horizontal: 'right' };
    cellM.font = { name: 'Calibri', size: 10, color: { argb: 'FFE11D48' } };

    // Col N: Spendable Cashflow
    const cellN = dataRow.getCell(14);
    cellN.value = Math.round(row.netSpendableCashflow);
    cellN.numFmt = currencyFormat;
    cellN.alignment = { vertical: 'middle', horizontal: 'right' };
    cellN.font = { name: 'Calibri', size: 10, bold: true };

    // Col O: Notes
    const cellO = dataRow.getCell(15);
    cellO.value = row.notes.length > 0 ? row.notes.join(' • ') : '-';
    cellO.alignment = { vertical: 'middle', horizontal: 'left' };
    cellO.font = {
      name: 'Calibri',
      size: 9.5,
      italic: row.notes.length > 0,
      color: { argb: row.notes.length > 0 ? 'FF92400E' : 'FF94A3B8' }
    };

    // Apply borders and backgrounds
    for (let c = 1; c <= 15; c++) {
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

    // D-H: Ending balances
    totalRow.getCell(4).value = { formula: `D${lastDataRow}`, result: Math.round(data[data.length - 1].rrspBalance) };
    totalRow.getCell(4).numFmt = currencyFormat;

    totalRow.getCell(5).value = { formula: `E${lastDataRow}`, result: Math.round(data[data.length - 1].tfsaBalance) };
    totalRow.getCell(5).numFmt = currencyFormat;

    totalRow.getCell(6).value = { formula: `F${lastDataRow}`, result: Math.round(data[data.length - 1].fhsaBalance) };
    totalRow.getCell(6).numFmt = currencyFormat;

    totalRow.getCell(7).value = { formula: `G${lastDataRow}`, result: Math.round(data[data.length - 1].nonRegBalance) };
    totalRow.getCell(7).numFmt = currencyFormat;

    totalRow.getCell(8).value = { formula: `H${lastDataRow}`, result: Math.round(data[data.length - 1].realEstateShare) };
    totalRow.getCell(8).numFmt = currencyFormat;

    // Col I: Ending Total Net Worth = SUM(D#:H#)
    totalRow.getCell(9).value = {
      formula: `SUM(D${currentRowNumber}:H${currentRowNumber})`,
      result: Math.round(data[data.length - 1].totalNetWorth)
    };
    totalRow.getCell(9).numFmt = currencyFormat;

    // Col J-N: Cumulative sums across all displayed rows
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

    totalRow.getCell(15).value = 'Cumulative sum / ending values';
    totalRow.getCell(15).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };

    for (let c = 1; c <= 15; c++) {
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
  anchor.download = `MapleRetire_${safeModeName}_Ledger_${todayStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
