import { SettingsNav } from '@/components/SettingsNav';
import { CalendarSyncPanel } from '@/components/schedule/CalendarSyncPanel';

export default function SettingsCalendarSyncPage() {
  return (
    <div className="px-4 pt-3 md:px-0 md:pt-0">
      <SettingsNav />
      <CalendarSyncPanel />
    </div>
  );
}
