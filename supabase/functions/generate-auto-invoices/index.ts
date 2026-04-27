import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
}

interface Shift {
  id: string;
  facility_id: string;
  start_datetime: string;
  end_datetime: string;
  status: string;
  rate_applied: number;
  shift_type?: string | null;
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
        .select("period_start, period_end")
        .eq("user_id", facility.user_id)
        .eq("facility_id", facility.id);
      const suppressedPeriods = (suppressedRows || []) as { period_start: string; period_end: string }[];

      // Get ALL booked/completed shifts for this facility (not just current period)
      const { data: allShifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("facility_id", facility.id)
        .eq("user_id", facility.user_id)
        .neq("status", "canceled")
        .neq("status", "proposed")
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

      // Group uninvoiced shifts by billing period
      const periodMap = new Map<string, { period: { start: Date; end: Date }; shifts: Shift[] }>();
      for (const shift of uninvoicedShifts) {
        const shiftDate = new Date(shift.start_datetime);
        const period = getBillingPeriod(cadence, shiftDate, facility.billing_cycle_anchor_date);
        const key = `${formatDate(period.start)}|${formatDate(period.end)}`;
        if (!periodMap.has(key)) {
          periodMap.set(key, { period, shifts: [] });
        }
        periodMap.get(key)!.shifts.push(shift);
      }

      // Process each billing period that has uninvoiced shifts
      for (const [periodKey, { period, shifts: periodShifts }] of periodMap) {
        const periodStartStr = formatDate(period.start);
        const periodEndStr = formatDate(period.end);

        // Check if this period has been suppressed by the user
        // Use overlap check to handle timezone differences in stored timestamps
        const isSuppressed = suppressedPeriods.some(sp => {
          const spStart = new Date(sp.period_start);
          const spEnd = new Date(sp.period_end);
          // Periods overlap if they share any time range — but for billing periods
          // we check if the date portions match within a 1-day tolerance
          const spStartStr = formatDate(spStart);
          const spEndStr = formatDate(spEnd);
          // Direct match
          if (spStartStr === periodStartStr && spEndStr === periodEndStr) return true;
          // Off-by-one from timezone: suppressed end may be +1 day due to UTC conversion
          const periodEndDate = new Date(periodEndStr + "T00:00:00Z");
          const spEndDate = new Date(spEndStr + "T00:00:00Z");
          const diffMs = Math.abs(spEndDate.getTime() - periodEndDate.getTime());
          return spStartStr === periodStartStr && diffMs <= 86400000;
        });
        if (isSuppressed) {
          results.push({ facility: facility.name, action: "period_suppressed", period: `${periodStartStr} to ${periodEndStr}` });
          continue;
        }

        // Also include any shifts already on a draft for this period (to rebuild correctly)
        const existingDraft = allInvoices.find(
          (inv) =>
            inv.status === "draft" &&
            inv.generation_type === "automatic" &&
            inv.facility_id === facility.id &&
            formatDate(new Date(inv.period_start)) === periodStartStr &&
            formatDate(new Date(inv.period_end)) === periodEndStr
        );

        // Combine: uninvoiced shifts for this period + shifts already on draft (minus protected)
        let allEligibleForPeriod = [...periodShifts];
        if (existingDraft) {
          // Get shifts already on this draft
          const draftLineItems = allLineItems.filter(li => li.invoice_id === existingDraft.id && li.shift_id);
          const draftShiftIds = new Set(draftLineItems.map(li => li.shift_id!));
          // Add existing draft shifts that aren't protected
          const existingDraftShifts = (allShifts as Shift[]).filter(
            s => draftShiftIds.has(s.id) && !protectedShiftIds.has(s.id)
          );
          // Merge without duplicates
          const mergedIds = new Set(allEligibleForPeriod.map(s => s.id));
          for (const s of existingDraftShifts) {
            if (!mergedIds.has(s.id)) {
              allEligibleForPeriod.push(s);
            }
          }
        }

        // Sort by start_datetime
        allEligibleForPeriod.sort(
          (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
        );

        if (allEligibleForPeriod.length === 0) continue;

        if (existingDraft) {
          // Update existing draft: rebuild line items
          await supabase
            .from("invoice_line_items")
            .delete()
            .eq("invoice_id", existingDraft.id);

          const newLineItems = allEligibleForPeriod.map((s) => ({
            user_id: facility.user_id,
            invoice_id: existingDraft.id,
            shift_id: s.id,
            description: `${formatShortDate(new Date(s.start_datetime))} — Relief coverage`,
            service_date: formatDate(new Date(s.start_datetime)),
            qty: 1,
            unit_rate: s.rate_applied,
            line_total: s.rate_applied,
          }));

          await supabase.from("invoice_line_items").insert(newLineItems);

          const total = newLineItems.reduce((sum, li) => sum + li.line_total, 0);

          // Invoice date = last shift date in period
          const lastShift = allEligibleForPeriod[allEligibleForPeriod.length - 1];
          const lastShiftDate = new Date(lastShift.start_datetime);
          const invoiceDate = new Date(lastShiftDate.getFullYear(), lastShiftDate.getMonth(), lastShiftDate.getDate(), 12, 0, 0);
          const dueDate = addDays(invoiceDate, facility.invoice_due_days || 15);

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
          // Generate invoice number
          const { data: allFacInvoices } = await supabase
            .from("invoices")
            .select("invoice_number")
            .eq("user_id", facility.user_id);

          const prefix = facility.invoice_prefix || "INV";
          const year = now.getFullYear();
          const existing = (allFacInvoices || [])
            .map((i: { invoice_number: string }) => i.invoice_number)
            .filter((n: string) => n.startsWith(`${prefix}-${year}`))
            .map((n: string) => parseInt(n.split("-")[2]) || 0);
          const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
          const invoiceNumber = `${prefix}-${year}-${String(next).padStart(3, "0")}`;

          // Build line items
          const lineItems = allEligibleForPeriod.map((s) => ({
            shift_id: s.id,
            description: `${formatShortDate(new Date(s.start_datetime))} — Relief coverage`,
            service_date: formatDate(new Date(s.start_datetime)),
            qty: 1,
            unit_rate: s.rate_applied,
            line_total: s.rate_applied,
          }));

          const total = lineItems.reduce((sum, li) => sum + li.line_total, 0);

          // Invoice date = last shift date in period
          const lastShift = allEligibleForPeriod[allEligibleForPeriod.length - 1];
          const lastShiftDate = new Date(lastShift.start_datetime);
          const invoiceDate = new Date(lastShiftDate.getFullYear(), lastShiftDate.getMonth(), lastShiftDate.getDate(), 12, 0, 0);
          const dueDate = addDays(invoiceDate, facility.invoice_due_days || 15);

          // Create invoice
          const { data: invData, error: invErr } = await supabase
            .from("invoices")
            .insert({
              user_id: facility.user_id,
              facility_id: facility.id,
              invoice_number: invoiceNumber,
              invoice_date: invoiceDate.toISOString(),
              period_start: period.start.toISOString(),
              period_end: period.end.toISOString(),
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

          // Insert line items
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
