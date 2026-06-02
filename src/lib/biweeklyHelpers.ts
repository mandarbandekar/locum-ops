import { addDays, format, differenceInDays } from 'date-fns';

export function parseDateOnly(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function formatDateOnly(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export interface BiweeklyWindow {
  start: string;
  end: string;
}

function formatWindow(start: Date, end: Date): BiweeklyWindow {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth();

  if (sameYear && sameMonth) {
    return {
      start: format(start, 'MMM d'),
      end: format(end, 'MMM d, yyyy'),
    };
  }
  if (sameYear) {
    return {
      start: format(start, 'MMM d'),
      end: format(end, 'MMM d, yyyy'),
    };
  }
  return {
    start: format(start, 'MMM d, yyyy'),
    end: format(end, 'MMM d, yyyy'),
  };
}

export function computeBiweeklyWindows(anchorDateStr: string | null | undefined): BiweeklyWindow[] {
  const anchor = parseDateOnly(anchorDateStr);
  if (!anchor) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysDiff = differenceInDays(today, anchor);

  let periodStart: Date;
  if (daysDiff < 0) {
    periodStart = anchor;
  } else {
    const periodIndex = Math.floor(daysDiff / 14);
    periodStart = addDays(anchor, periodIndex * 14);
  }

  const windows: BiweeklyWindow[] = [];
  for (let i = 0; i < 2; i++) {
    const start = addDays(periodStart, i * 14);
    const end = addDays(start, 13);
    windows.push(formatWindow(start, end));
  }

  return windows;
}

/** @deprecated Use computeBiweeklyWindows instead */
export function computeNextBiweeklyWindow(anchorDateStr: string | null | undefined): BiweeklyWindow | null {
  const windows = computeBiweeklyWindows(anchorDateStr);
  return windows[0] ?? null;
}
