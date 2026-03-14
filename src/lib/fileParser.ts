import * as XLSX from 'xlsx';

/**
 * Reads a file and returns its text content.
 * For Excel files (.xlsx, .xls), parses the binary data into CSV text.
 * For other files, reads as plain text.
 */
export async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return readExcelAsCSV(file);
  }

  return file.text();
}

async function readExcelAsCSV(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });

    if (csv.trim()) {
      if (workbook.SheetNames.length > 1) {
        sheets.push(`--- Sheet: ${sheetName} ---\n${csv}`);
      } else {
        sheets.push(csv);
      }
    }
  }

  return sheets.join('\n\n');
}
