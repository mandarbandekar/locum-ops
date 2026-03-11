import { isSameDay } from 'date-fns';

export interface CalendarMarker {
  date: Date;
  label: string;
  type: 'holiday' | 'tax';
  bg: string;
  text: string;
}

export const HOLIDAYS_2026: CalendarMarker[] = [
  { date: new Date(2026, 0, 1), label: "New Year's Day", type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 0, 19), label: 'MLK Day', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 1, 16), label: "Presidents' Day", type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 5, 19), label: 'Juneteenth', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 6, 4), label: 'Independence Day', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 8, 7), label: 'Labor Day', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 9, 12), label: 'Columbus Day', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 10, 11), label: 'Veterans Day', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 10, 26), label: 'Thanksgiving', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
  { date: new Date(2026, 11, 25), label: 'Christmas Day', type: 'holiday', bg: 'bg-red-900/25', text: 'text-red-900 dark:text-red-300' },
];

export const TAX_DATES_2026: CalendarMarker[] = [
  { date: new Date(2026, 0, 15), label: 'Q4 2025 Est. Tax Due', type: 'tax', bg: 'bg-amber-600/20', text: 'text-amber-800 dark:text-amber-300' },
  { date: new Date(2026, 3, 15), label: 'Q1 Est. Tax Due', type: 'tax', bg: 'bg-amber-600/20', text: 'text-amber-800 dark:text-amber-300' },
  { date: new Date(2026, 5, 15), label: 'Q2 Est. Tax Due', type: 'tax', bg: 'bg-amber-600/20', text: 'text-amber-800 dark:text-amber-300' },
  { date: new Date(2026, 8, 15), label: 'Q3 Est. Tax Due', type: 'tax', bg: 'bg-amber-600/20', text: 'text-amber-800 dark:text-amber-300' },
];

export const ALL_CALENDAR_MARKERS = [...HOLIDAYS_2026, ...TAX_DATES_2026];

export function getMarkersForDay(day: Date): CalendarMarker[] {
  return ALL_CALENDAR_MARKERS.filter(m => isSameDay(m.date, day));
}
