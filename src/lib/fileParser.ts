import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

/**
 * Reads a file and returns its text content.
 * Handles Excel (.xlsx/.xls), Word (.docx), PDF, and plain text files.
 */
export async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return readExcelAsCSV(file);
  }

  if (ext === 'docx') {
    return readDocxAsText(file);
  }

  if (ext === 'doc') {
    throw new Error(
      'Legacy .doc format is not supported. Please convert to .docx or PDF and try again.'
    );
  }

  if (ext === 'pdf') {
    return readPdfAsText(file);
  }

  // CSV, TXT, ICS, etc.
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

async function readDocxAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function readPdfAsText(file: File): Promise<string> {
  // Lazy-load pdfjs-dist to avoid DOMMatrix errors in Node/test environments
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str);
    pages.push(strings.join(' '));
  }

  return pages.join('\n\n');
}
