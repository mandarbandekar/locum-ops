import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  periodLocalBounds,
  periodBoundsUtc,
  localYMDInTz,
  zonedWallClockToUtc,
} from "../_shared/tzTime.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_TZ = "America/New_York";

function resolveShiftTz(
  shift: { timezone_at_creation?: string | null } | null | undefined,
  facility: { timezone?: string | null } | null | undefined,
  profileTz?: string | null,
): string {
  const snap = shift?.timezone_at_creation?.trim();
  if (snap) return snap;
  const fac = facility?.timezone?.trim();
  if (fac) return fac;
  const prof = profileTz?.trim();
  if (prof) return prof;
  return FALLBACK_TZ;
}

interface Facility {
  id: string;
  name: string;
  billing_cadence: string;
  billing_cycle_anchor_date: string | null;
  billing_week_end_day: string;
  auto_generate_invoices: boolean;
  invoice_prefix: string;
  invoice_due_days: number;
  invoice_email_to: string;
  invoice_name_to: string;
  user_id: string;
  timezone: string | null;
}

interface Shift {
  id: string;
  facility_id: string;
  start_datetime: string;
  end_datetime: string;
  status: string;
  rate_applied: number;
  shift_type?: string | null;
  timezone_at_creation?: string | null;
}

const SHIFT_TYPE_SHORT: Record<string, string> = {
  gp: 'GP',
  er: 'ER',
  surgery: 'Surgery',
  dental: 'Dental',
  wellness: 'Wellness',
  oncall: 'On-Call',
  telemed: 'Telemed',
  specialty: 'Specialty',
  shelter: 'Shelter',
  other: 'Relief',
};

function coverageLabel(shiftType?: string | null): string {
  if (!shiftType) return 'Relief coverage';
  const short = SHIFT_TYPE_SHORT[shiftType] ?? shiftType;
  return `${short} relief coverage`;
}

interface Invoice {
  id: string;
  facility_id: string;
  invoice_number: string;
  status: string;
  generation_type: string;
  period_start: string;
  period_end: string;
  user_id: string;
}

interface LineItem {
  id: string;
  invoice_id: string;
  shift_id: string | null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return startOfDay(mon);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getBillingPeriod(
  cadence: string,
  ref: Date,
  anchorDate?: string | null
): { start: Date; end: Date } {
  switch (cadence) {
    case "daily":
      return { start: startOfDay(ref), end: endOfDay(ref) };
    case "weekly": {
      const ws = startOfWeek(ref);
      return { start: ws, end: endOfDay(addDays(ws, 6)) };
    }
    case "biweekly": {
      const anchor = anchorDate ? new Date(anchorDate) : new Date("2026-01-01");
      const daysSince = Math.floor(
        (ref.getTime() - anchor.getTime()) / 86400000
      );
      const periodNum = Math.floor(daysSince / 14);
      const periodStart = addDays(anchor, periodNum * 14);
      return { start: startOfDay(periodStart), end: endOfDay(addDays(periodStart, 13)) };
    }
    case "monthly":
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    default:
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShortDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const results: { facility: string; action: string; invoiceNumber?: string; period?: string }[] = [];

    // Get all facilities with auto_generate enabled
    const { data: facilities, error: facErr } = await supabase
      .from("facilities")
      .select("*")
      .eq("auto_generate_invoices", true);

    if (facErr) throw facErr;
    if (!facilities || facilities.length === 0) {
      return new Response(
        JSON.stringify({ message: "No facilities with auto-generate enabled", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each facility
    for (const facility of facilities as Facility[]) {
      const cadence = facility.billing_cadence;

      // Load suppressed periods for this facility's user
      const { data: suppressedRows } = await supabase
        .from("suppressed_invoice_periods")
        .select("period_start, period_end, period_start_date, period_end_date")
        .eq("user_id", facility.user_id)
        .eq("facility_id", facility.id);
      const suppressedPeriods = (suppressedRows || []) as {
        period_start: string;
        period_end: string;
        period_start_date: string | null;
        period_end_date: string | null;
      }[];

      // Get ALL shifts for this facility. Per product model, shifts no longer
      // carry a status (all shifts are active; cancellation = delete). We keep
      // the `canceled` exclusion only as a safety net for legacy rows.
      const { data: allShifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("facility_id", facility.id)
        .eq("user_id", facility.user_id)
        .neq("status", "canceled")
        .order("start_datetime");

      if (!allShifts || allShifts.length === 0) {
        results.push({ facility: facility.name, action: "no_shifts" });
        continue;
      }

      // Get all existing invoices and line items for this facility
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("facility_id", facility.id)
        .eq("user_id", facility.user_id);

      const { data: existingLineItems } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("user_id", facility.user_id);

      const allInvoices = (existingInvoices || []) as Invoice[];
      const allLineItems = (existingLineItems || []) as LineItem[];

      // Get shift IDs on sent/paid invoices (protected — can't be re-invoiced)
      const sentInvoiceIds = new Set(
        allInvoices.filter((i) => i.status !== "draft").map((i) => i.id)
      );
      const protectedShiftIds = new Set(
        allLineItems
          .filter((li) => li.shift_id && sentInvoiceIds.has(li.invoice_id))
          .map((li) => li.shift_id!)
      );

      // Get shift IDs already on ANY invoice (including drafts)
      const allInvoicedShiftIds = new Set(
        allLineItems
          .filter((li) => li.shift_id)
          .map((li) => li.shift_id!)
      );

      // Find uninvoiced eligible shifts
      const uninvoicedShifts = (allShifts as Shift[]).filter(
        (s) => !allInvoicedShiftIds.has(s.id)
      );

      if (uninvoicedShifts.length === 0) {
        results.push({ facility: facility.name, action: "all_shifts_invoiced" });
        continue;
      }

      // Group uninvoiced shifts by billing period — IN THE CLINIC'S LOCAL TZ.
      // Each shift's resolved tz (snapshot > facility > NY) drives the period
      // it belongs to, so a 11 PM May 31 Pacific shift sits in the May period
      // even though its UTC stamp is June 1.
      const facilityTz = facility.timezone?.trim() || FALLBACK_TZ;
      type PeriodBucket = {
        startYMD: string;
        endYMD: string;
        startUtc: Date;
        endUtcExclusive: Date;
        shifts: Shift[];
        tz: string; // tz used to compute these bounds (facility-level, for storage)
      };
      const periodMap = new Map<string, PeriodBucket>();
      for (const shift of uninvoicedShifts) {
        const shiftTz = resolveShiftTz(shift, facility);
        const bounds = periodBoundsUtc(
          cadence,
          shift.start_datetime,
          shiftTz,
          facility.billing_cycle_anchor_date,
        );
        const key = `${bounds.startYMD}|${bounds.endYMD}`;
        if (!periodMap.has(key)) {
          // Store period bounds using the facility-level tz for stable invoice
          // rows (snapshot is per-shift, but invoice periods are facility-wide).
          const facBounds = periodBoundsUtc(
            cadence,
            shift.start_datetime,
            facilityTz,
            facility.billing_cycle_anchor_date,
          );
          periodMap.set(key, {
            startYMD: bounds.startYMD,
            endYMD: bounds.endYMD,
            startUtc: facBounds.startUtc,
            endUtcExclusive: facBounds.endUtcExclusive,
            shifts: [],
            tz: facilityTz,
          });
        }
        periodMap.get(key)!.shifts.push(shift);
      }

      // Process each billing period that has uninvoiced shifts
      for (const [, bucket] of periodMap) {
        const periodStartStr = bucket.startYMD;
        const periodEndStr = bucket.endYMD;
        const periodShifts = bucket.shifts;

        // Suppression check — compare on clinic-local YMD, no UTC tolerance hack.
        const isSuppressed = suppressedPeriods.some((sp) => {
          const spStartYMD = localYMDInTz(sp.period_start, facilityTz);
          const spEndYMD = localYMDInTz(sp.period_end, facilityTz);
          return spStartYMD === periodStartStr && spEndYMD === periodEndStr;
        });
        if (isSuppressed) {
          results.push({ facility: facility.name, action: "period_suppressed", period: `${periodStartStr} to ${periodEndStr}` });
          continue;
        }

        // Also include any shifts already on a draft for this period (to rebuild correctly).
        // Compare on absolute UTC timestamps (what's stored) so a facility timezone change
        // can't make us miss an existing draft and create a second one for the same period.
        const bucketStartMs = bucket.startUtc.getTime();
        const bucketEndMs = new Date(bucket.endUtcExclusive.getTime() - 1).getTime();
        const existingDraft = allInvoices.find(
          (inv) =>
            inv.status === "draft" &&
            inv.generation_type === "automatic" &&
            inv.facility_id === facility.id &&
            (
              // Primary: absolute UTC match (resilient to tz changes).
              new Date(inv.period_start).getTime() === bucketStartMs ||
              // Fallback: clinic-local YMD match for legacy drafts written with
              // slightly different bounds (e.g. older anchor handling).
              (localYMDInTz(inv.period_start, facilityTz) === periodStartStr &&
                localYMDInTz(inv.period_end, facilityTz) === periodEndStr)
            )
        );
        void bucketEndMs;

        // Combine: uninvoiced shifts for this period + shifts already on draft (minus protected)
        let allEligibleForPeriod = [...periodShifts];
        if (existingDraft) {
          const draftLineItems = allLineItems.filter(li => li.invoice_id === existingDraft.id && li.shift_id);
          const draftShiftIds = new Set(draftLineItems.map(li => li.shift_id!));
          const existingDraftShifts = (allShifts as Shift[]).filter(
            s => draftShiftIds.has(s.id) && !protectedShiftIds.has(s.id)
          );
          const mergedIds = new Set(allEligibleForPeriod.map(s => s.id));
          for (const s of existingDraftShifts) {
            if (!mergedIds.has(s.id)) allEligibleForPeriod.push(s);
          }
        }

        // Sort by start_datetime (absolute UTC order is fine here)
        allEligibleForPeriod.sort(
          (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
        );

        if (allEligibleForPeriod.length === 0) continue;

        // Helper: local YMD for a shift in its own tz (snapshot > facility).
        const shiftLocalYMD = (s: Shift) =>
          localYMDInTz(s.start_datetime, resolveShiftTz(s, facility));
        const shiftLocalShortDate = (s: Shift): string => {
          const ymd = shiftLocalYMD(s);
          const [y, m, d] = ymd.split('-').map(Number);
          return `${MONTHS[m - 1]} ${d}, ${y}`;
        };

        const buildLineItem = (s: Shift) => ({
          shift_id: s.id,
          description: `${shiftLocalShortDate(s)} — ${coverageLabel(s.shift_type)}`,
          service_date: shiftLocalYMD(s),
          qty: 1,
          unit_rate: s.rate_applied,
          line_total: s.rate_applied,
        });

        // Invoice date = last shift's clinic-local date at 12:00 in facility tz.
        const lastShift = allEligibleForPeriod[allEligibleForPeriod.length - 1];
        const lastShiftLocalYMD = shiftLocalYMD(lastShift);
        const invoiceDate = zonedWallClockToUtc(lastShiftLocalYMD, '12:00', facilityTz);
        const dueDate = addDays(invoiceDate, facility.invoice_due_days || 15);

        if (existingDraft) {
          await supabase
            .from("invoice_line_items")
            .delete()
            .eq("invoice_id", existingDraft.id);

          const newLineItems = allEligibleForPeriod.map((s) => ({
            user_id: facility.user_id,
            invoice_id: existingDraft.id,
            ...buildLineItem(s),
          }));

          await supabase.from("invoice_line_items").insert(newLineItems);
          const total = newLineItems.reduce((sum, li) => sum + li.line_total, 0);

          await supabase
            .from("invoices")
            .update({
              total_amount: total,
              balance_due: total,
              invoice_date: invoiceDate.toISOString(),
              due_date: dueDate.toISOString(),
            })
            .eq("id", existingDraft.id);

          results.push({
            facility: facility.name,
            action: "updated_draft",
            invoiceNumber: existingDraft.invoice_number,
            period: `${periodStartStr} to ${periodEndStr}`,
          });
        } else {
          const prefix = facility.invoice_prefix || "INV";
          // Use the facility-local year of the invoice date so a cron run that
          // crosses the UTC year boundary (e.g. Jan 1 02:00 UTC for a PT Dec
          // period) numbers the invoice under the clinic-local year (2025),
          // not the runtime UTC year (2026).
          const year = Number(
            new Intl.DateTimeFormat('en-US', { timeZone: facilityTz, year: 'numeric' })
              .format(invoiceDate)
          );
          let invoiceNumber: string;
          const { data: rpcNum, error: rpcErr } = await supabase.rpc(
            "next_invoice_number_for_user",
            { _user_id: facility.user_id, _prefix: prefix, _year: year }
          );
          if (rpcErr || !rpcNum) {
            console.error("next_invoice_number_for_user failed, falling back:", rpcErr);
            const { data: allFacInvoices } = await supabase
              .from("invoices")
              .select("invoice_number")
              .eq("user_id", facility.user_id);
            const existing = (allFacInvoices || [])
              .map((i: { invoice_number: string }) => i.invoice_number)
              .filter((n: string) => n.startsWith(`${prefix}-${year}`))
              .map((n: string) => parseInt(n.split("-")[2]) || 0);
            const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
            invoiceNumber = `${prefix}-${year}-${String(next).padStart(3, "0")}`;
          } else {
            invoiceNumber = rpcNum as string;
          }

          const lineItems = allEligibleForPeriod.map(buildLineItem);
          const total = lineItems.reduce((sum, li) => sum + li.line_total, 0);

          // Store period_end as last-instant-of-period in facility tz
          // (one ms before the next day's midnight) so the row reads as
          // "May 31 23:59:59 Pacific" not "Jun 1 00:00 Pacific".
          const periodEndStored = new Date(bucket.endUtcExclusive.getTime() - 1);

          const { data: invData, error: invErr } = await supabase
            .from("invoices")
            .insert({
              user_id: facility.user_id,
              facility_id: facility.id,
              invoice_number: invoiceNumber,
              invoice_date: invoiceDate.toISOString(),
              period_start: bucket.startUtc.toISOString(),
              period_end: periodEndStored.toISOString(),
              total_amount: total,
              balance_due: total,
              status: "draft",
              sent_at: null,
              paid_at: null,
              due_date: dueDate.toISOString(),
              notes: "",
              invoice_type: "bulk",
              generation_type: "automatic",
              billing_cadence: cadence,
            })
            .select()
            .single();

          if (invErr) {
            console.error(`Failed to create invoice for ${facility.name}:`, invErr);
            results.push({ facility: facility.name, action: "error", period: `${periodStartStr} to ${periodEndStr}` });
            continue;
          }

          const toInsert = lineItems.map((li) => ({
            user_id: facility.user_id,
            invoice_id: invData.id,
            ...li,
          }));
          await supabase.from("invoice_line_items").insert(toInsert);

          results.push({
            facility: facility.name,
            action: "created_draft",
            invoiceNumber,
            period: `${periodStartStr} to ${periodEndStr}`,
          });
        }
      }
    }


    // Fix stale invoice dates on existing drafts where invoice_date != last shift date
    try {
      const { data: allDrafts } = await supabase
        .from("invoices")
        .select("id, invoice_date, due_date, facility_id")
        .eq("status", "draft")
        .eq("generation_type", "automatic");

      for (const draft of (allDrafts || [])) {
        const { data: draftLines } = await supabase
          .from("invoice_line_items")
          .select("service_date")
          .eq("invoice_id", draft.id)
          .not("service_date", "is", null)
          .order("service_date", { ascending: false })
          .limit(1);

        if (draftLines && draftLines.length > 0) {
          const lastServiceDate = draftLines[0].service_date;
          const currentInvDate = draft.invoice_date ? formatDate(new Date(draft.invoice_date)) : null;
          if (lastServiceDate && currentInvDate !== lastServiceDate) {
            const fac = (facilities as Facility[]).find(f => f.id === draft.facility_id);
            const dueDays = fac?.invoice_due_days || 15;
            const newInvDate = new Date(lastServiceDate + "T12:00:00");
            const newDueDate = addDays(newInvDate, dueDays);
            await supabase
              .from("invoices")
              .update({ invoice_date: newInvDate.toISOString(), due_date: newDueDate.toISOString() })
              .eq("id", draft.id);
            results.push({ facility: fac?.name || "unknown", action: "fixed_draft_dates", invoiceNumber: undefined, period: lastServiceDate });
          }
        }
      }
    } catch (fixErr) {
      console.error("Date fix pass error:", fixErr);
    }

    return new Response(
      JSON.stringify({ message: "Auto-invoice generation complete", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auto-invoice generation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
