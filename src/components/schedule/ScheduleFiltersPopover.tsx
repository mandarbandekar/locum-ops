import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter } from 'lucide-react';
import { ScheduleFilters } from '@/hooks/useScheduleFilters';
import { Facility, SHIFT_COLORS } from '@/types';
import { Separator } from '@/components/ui/separator';

interface Props {
  filters: ScheduleFilters;
  facilities: Facility[];
  facilityColor: (id: string) => string;
  isDefault: boolean;
  onUpdate: <K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]) => void;
  onToggleClinic: (id: string) => void;
  onReset: () => void;
}

export function ScheduleFiltersPopover({ filters, facilities, facilityColor, isDefault, onUpdate, onToggleClinic, onReset }: Props) {
  const activeClinics = facilities.filter(f => f.status === 'active');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 relative h-8">
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filter</span>
          {!isDefault && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[13px] font-semibold">Filter calendar</h4>
          {!isDefault && (
            <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={onReset}>
              Reset
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Show</Label>
          <FilterToggle id="shifts" label="Shifts" checked={filters.showShifts} onChange={v => onUpdate('showShifts', v)} />
          <FilterToggle id="blocks" label="Time blocks" checked={filters.showBlocks} onChange={v => onUpdate('showBlocks', v)} />
          <FilterToggle id="creds" label="Credential expirations" checked={filters.showCredentials} onChange={v => onUpdate('showCredentials', v)} />
          <FilterToggle id="subs" label="Subscription renewals" checked={filters.showSubscriptions} onChange={v => onUpdate('showSubscriptions', v)} />
          <FilterToggle id="hol" label="Holidays" checked={filters.showHolidays} onChange={v => onUpdate('showHolidays', v)} />
          <FilterToggle id="tax" label="Tax dates" checked={filters.showTax} onChange={v => onUpdate('showTax', v)} />
        </div>

        <Separator className="my-3" />

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Focus</Label>
          <FilterToggle id="conflicts" label="Conflicts only" checked={filters.conflictsOnly} onChange={v => onUpdate('conflictsOnly', v)} />
        </div>

        {activeClinics.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Clinics</Label>
                {filters.clinicIds.length > 0 && (
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => onUpdate('clinicIds', [])}
                  >
                    All
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {activeClinics.map(f => {
                  const colorVal = facilityColor(f.id);
                  const colorDef = SHIFT_COLORS.find(c => c.value === colorVal) || SHIFT_COLORS[0];
                  const checked = filters.clinicIds.length === 0 || filters.clinicIds.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 text-[13px] cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onToggleClinic(f.id)}
                      />
                      <span className={`h-2.5 w-2.5 rounded-full ${colorDef.bg}`} />
                      <span className="truncate flex-1">{f.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function FilterToggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-[13px] cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span>{label}</span>
    </label>
  );
}
