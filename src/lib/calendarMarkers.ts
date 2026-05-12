import { isSameDay } from 'date-fns';

export interface CalendarMarker {
  date: Date;
  label: string;
  type: 'holiday' | 'tax';
  bg: string;
  text: string;
}

const HOLIDAY_BG = 'bg-red-900/25';
const HOLIDAY_TEXT = 'text-red-900 dark:text-red-300';
const TAX_BG = 'bg-amber-600/20';
const TAX_TEXT = 'text-amber-800 dark:text-amber-300';

// nth weekday of month (weekday: 0=Sun..6=Sat, n: 1-based)
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}

export function getFederalHolidaysForYear(year: number): CalendarMarker[] {
  const mk = (date: Date, label: string): CalendarMarker => ({
    date, label, type: 'holiday', bg: HOLIDAY_BG, text: HOLIDAY_TEXT,
  });
  return [
    mk(new Date(year, 0, 1), "New Year's Day"),
    mk(nthWeekdayOfMonth(year, 0, 1, 3), 'MLK Day'),
    mk(nthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day"),
    mk(lastWeekdayOfMonth(year, 4, 1), 'Memorial Day'),
    mk(new Date(year, 5, 19), 'Juneteenth'),
    mk(new Date(year, 6, 4), 'Independence Day'),
    mk(nthWeekdayOfMonth(year, 8, 1, 1), 'Labor Day'),
    mk(nthWeekdayOfMonth(year, 9, 1, 2), 'Columbus Day'),
    mk(new Date(year, 10, 11), 'Veterans Day'),
    mk(nthWeekdayOfMonth(year, 10, 4, 4), 'Thanksgiving'),
    mk(new Date(year, 11, 25), 'Christmas Day'),
  ];
}

// Generate holidays for a rolling window: previous year through +5 years.
const CURRENT_YEAR = new Date().getFullYear();
const HOLIDAY_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 1 + i);

export const FEDERAL_HOLIDAYS: CalendarMarker[] = HOLIDAY_YEARS.flatMap(getFederalHolidaysForYear);

export const TAX_DATES_2026: CalendarMarker[] = [
  { date: new Date(2026, 0, 15), label: 'Q4 2025 Est. Tax Due', type: 'tax', bg: TAX_BG, text: TAX_TEXT },
  { date: new Date(2026, 3, 15), label: 'Q1 Est. Tax Due', type: 'tax', bg: TAX_BG, text: TAX_TEXT },
  { date: new Date(2026, 5, 15), label: 'Q2 Est. Tax Due', type: 'tax', bg: TAX_BG, text: TAX_TEXT },
  { date: new Date(2026, 8, 15), label: 'Q3 Est. Tax Due', type: 'tax', bg: TAX_BG, text: TAX_TEXT },
];

export const ALL_CALENDAR_MARKERS = [...FEDERAL_HOLIDAYS, ...TAX_DATES_2026];

export function getMarkersForDay(day: Date): CalendarMarker[] {
  return ALL_CALENDAR_MARKERS.filter(m => isSameDay(m.date, day));
}
