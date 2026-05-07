import { useCallback, useEffect, useState } from 'react';

export interface ScheduleFilters {
  clinicIds: string[]; // empty = all
  showShifts: boolean;
  showBlocks: boolean;
  showCredentials: boolean;
  showSubscriptions: boolean;
  showHolidays: boolean;
  showTax: boolean;
  conflictsOnly: boolean;
}

const STORAGE_KEY = 'schedule-filters-v1';

const DEFAULTS: ScheduleFilters = {
  clinicIds: [],
  showShifts: true,
  showBlocks: true,
  showCredentials: true,
  showSubscriptions: true,
  showHolidays: true,
  showTax: true,
  conflictsOnly: false,
};

export function isDefaultFilters(f: ScheduleFilters): boolean {
  return (
    f.clinicIds.length === 0 &&
    f.showShifts &&
    f.showBlocks &&
    f.showCredentials &&
    f.showSubscriptions &&
    f.showHolidays &&
    f.showTax &&
    !f.conflictsOnly
  );
}

export function useScheduleFilters() {
  const [filters, setFilters] = useState<ScheduleFilters>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setFilters({ ...DEFAULTS, ...parsed });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  const update = useCallback(<K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleClinic = useCallback((id: string) => {
    setFilters(prev => ({
      ...prev,
      clinicIds: prev.clinicIds.includes(id)
        ? prev.clinicIds.filter(c => c !== id)
        : [...prev.clinicIds, id],
    }));
  }, []);

  const reset = useCallback(() => setFilters(DEFAULTS), []);

  return { filters, setFilters, update, toggleClinic, reset, isDefault: isDefaultFilters(filters) };
}
