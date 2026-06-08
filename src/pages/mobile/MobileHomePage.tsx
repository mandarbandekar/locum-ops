import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Phone, FileText, Receipt, CheckCircle2, AlertTriangle, Plus, DollarSign } from 'lucide-react';
import { formatTimeInTz, formatDateInTz } from '@/lib/tzTime';
import { computeInvoiceStatus, getShiftTotalRevenue } from '@/lib/businessLogic' as any;
// fallback shim — getShiftTotalRevenue lives in types
import { getShiftTotalRevenue as getShiftTotal } from '@/types';

export default function MobileHomePage() {
  const { facilities, shifts, invoices, contacts } = useData();

  const now = new Date();
  const nextShift = useMemo(() => {
    return [...shifts]
      .filter(s => new Date(s.end_datetime) >= now)
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))[0];
  }, [shifts]);

  const nextFacility = nextShift ? facilities.find(f => f.id === nextShift.facility_id) : null;
  const tz = nextFacility?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const overdueInvoices = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
  const unpaidInvoices = invoices.filter(i => ['sent', 'partial'].includes(i.status));

  const monthRevenue = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return shifts
      .filter(s => new Date(s.start_datetime) >= start && new Date(s.start_datetime) <= now)
      .reduce((sum, s) => sum + getShiftTotal(s), 0);
  }, [shifts]);

  const primaryContact = nextFacility
    ? contacts.find(c => c.facility_id === nextFacility.id && c.is_primary) ||
      contacts.find(c => c.facility_id === nextFacility.id)
    : null;

  const directionsUrl = nextFacility?.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextFacility.address)}`
    : null;

  return (
    <div className="space-y-4">
      {/* Next shift hero card */}
      {nextShift && nextFacility ? (
        <Card className="p-4 border-2 border-primary/30">
          <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wide mb-2">
            <Calendar className="h-3.5 w-3.5" /> Next shift
          </div>
          <h2 className="text-lg font-semibold leading-tight">{nextFacility.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDateInTz(nextShift.start_datetime, tz, 'EEE, MMM d')} ·{' '}
            {formatTimeInTz(nextShift.start_datetime, tz)} – {formatTimeInTz(nextShift.end_datetime, tz)}
          </p>
          {nextFacility.address && (
            <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{nextFacility.address}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            {directionsUrl && (
              <Button asChild variant="outline" size="sm" className="h-11">
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 mr-1.5" /> Directions
                </a>
              </Button>
            )}
            {primaryContact?.phone && (
              <Button asChild variant="outline" size="sm" className="h-11">
                <a href={`tel:${primaryContact.phone}`}>
                  <Phone className="h-4 w-4 mr-1.5" /> Call clinic
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="h-11">
              <Link to={`/facilities/${nextFacility.id}`}>
                <FileText className="h-4 w-4 mr-1.5" /> Notes
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11">
              <Link to={`/expenses?facility=${nextFacility.id}`}>
                <Receipt className="h-4 w-4 mr-1.5" /> Add expense
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming shifts</p>
          <Button asChild className="mt-3 h-11" size="sm">
            <Link to="/schedule"><Plus className="h-4 w-4 mr-1" /> Add a shift</Link>
          </Button>
        </Card>
      )}

      {/* Month revenue */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This month</p>
            <p className="text-2xl font-semibold mt-1">
              ${monthRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-muted-foreground/40" />
        </div>
      </Card>

      {/* Urgent tasks */}
      {(overdueInvoices.length > 0 || unpaidInvoices.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
            Needs attention
          </h3>
          {overdueInvoices.length > 0 && (
            <Link to="/invoices">
              <Card className="p-3 flex items-center gap-3 active:bg-accent">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{overdueInvoices.length} overdue invoice{overdueInvoices.length === 1 ? '' : 's'}</p>
                  <p className="text-xs text-muted-foreground">Tap to review</p>
                </div>
                <Badge variant="destructive">{overdueInvoices.length}</Badge>
              </Card>
            </Link>
          )}
          {unpaidInvoices.length > 0 && (
            <Link to="/invoices">
              <Card className="p-3 flex items-center gap-3 active:bg-accent">
                <Receipt className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{unpaidInvoices.length} unpaid invoice{unpaidInvoices.length === 1 ? '' : 's'}</p>
                  <p className="text-xs text-muted-foreground">Awaiting payment</p>
                </div>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Quick add FAB */}
      <Link
        to="/schedule"
        className="fixed right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        aria-label="Add shift"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
