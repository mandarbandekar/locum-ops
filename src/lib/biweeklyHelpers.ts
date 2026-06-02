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

export function computeNextBiweeklyWindow(anchorDateStr: string | null | undefined): BiweeklyWindow | null {
  const anchor = parseDateOnly(anchorDateStr);
  if (!anchor) return null;

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

  const periodEnd = addDays(periodStart, 13);

  const sameYear = periodStart.getFullYear() === periodEnd.getFullYear();
  const sameMonth = periodStart.getMonth() === periodEnd.getMonth();

  if (sameYear && sameMonth) {
    return {
      start: format(periodStart, 'MMM d'),
      end: format(periodEnd, 'MMM d, yyyy'),
    };
  }
  if (sameYear) {
    return {
      start: format(periodStart, 'MMM d'),
      end: format(periodEnd, 'MMM d, yyyy'),
    };
  }
  return {
    start: format(periodStart, 'MMM d, yyyy'),
    end: format(periodEnd, 'MMM d, yyyy'),
  };
}
