import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  buildMonthlyMileageRows,
  buildMonthlyMileageByClinic,
  buildMonthlyPnL,
  buildMonthlyClinicIncome,
  buildMonthlyExpensesByCategory,
} from '@/lib/cpaPrepExports';
import { renderFullPacketPdf } from '@/lib/cpaPrepPdf';
import type { Expense } from '@/hooks/useExpenses';
import type { Invoice, Shift, Facility } from '@/types';

interface Props {
  year: number;
  irsRateCents: number;
  invoices: Invoice[];
  shifts: Shift[];
  facilities: Facility[];
  ytdExpenses: Expense[];
  confirmedMileageExpenses: Expense[];
  startingMiles?: number;
  startingMilesNote?: string;
  receivables: { draft: { count: number; totalCents: number }; sent: { count: number; totalCents: number }; overdue: { count: number; totalCents: number }; paid: { count: number; totalCents: number }; aging: { label: string; count: number; totalCents: number }[] };
  readiness: { label: string; status: 'ok' | 'warning' | 'missing' }[];
  agenda: string[];
}

export default function ExportCPAPacket(props: Props) {
  const handleExport = () => {
    try {
      const mileageRows = buildMonthlyMileageRows(props.confirmedMileageExpenses, props.year, props.irsRateCents);
      const mileageClinic = buildMonthlyMileageByClinic(props.confirmedMileageExpenses, props.facilities, props.year, props.irsRateCents);
      const pnl = buildMonthlyPnL(props.invoices, props.ytdExpenses, props.year);
      const clinicIncome = buildMonthlyClinicIncome(props.invoices, props.shifts, props.facilities, props.year);
      const expenseReview = buildMonthlyExpensesByCategory(props.ytdExpenses, props.year);

      const doc = renderFullPacketPdf({
        year: props.year,
        irsRateCents: props.irsRateCents,
        mileage: { monthly: mileageRows.rows, totals: mileageRows.totals, byClinic: mileageClinic, startingMiles: props.startingMiles, startingMilesNote: props.startingMilesNote },
        pnl,
        clinicIncome,
        expenseReview,
        receivables: props.receivables,
        readiness: { items: props.readiness, agenda: props.agenda },
      });
      doc.save(`CPA_Prep_Packet_${props.year}.pdf`);
      toast.success('CPA packet downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate packet');
    }
  };

  return (
    <Button onClick={handleExport} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Export Full Packet (PDF)
    </Button>
  );
}
