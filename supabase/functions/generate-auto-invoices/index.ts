import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_RUN_HOUR = 5;

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

function formatDateTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const h12 = d.getHours() % 12 || 12;
  return `${h12}:${m.padStart(2, "0")} ${ampm}`;
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
    const today = startOfDay(now);
    const results: { facility: string; action: string; invoiceNumber?: string }[] = [];

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
      const period = getBillingPeriod(cadence, today, facility.billing_cycle_anchor_date);

      // Get all booked/completed shifts for this facility in the period
      const { data: shifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("facility_id", facility.id)
        .eq("user_id", facility.user_id)
        .neq("status", "canceled")
        .gte("start_datetime", period.start.toISOString())
        .lte("start_datetime", period.end.toISOString())
        .order("start_datetime");

      if (!shifts || shifts.length === 0) {
        results.push({ facility: facility.name, action: "no_shifts" });
        continue;
      }

      // For non-daily cadences: only generate on the day of the last scheduled shift
      if (cadence !== "daily") {
        const lastShiftDate = startOfDay(
          new Date(shifts[shifts.length - 1].start_datetime)
        );
        if (today.getTime() !== lastShiftDate.getTime()) {
          results.push({ facility: facility.name, action: "not_trigger_day" });
          continue;
        }
      }

      // Check existing invoices for this period
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("facility_id", facility.id)
        .eq("user_id", facility.user_id)
        .eq("generation_type", "automatic");

      // Check existing line items to find already-invoiced shifts
      const { data: existingLineItems } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("user_id", facility.user_id);

      const allInvoices = (existingInvoices || []) as Invoice[];
      const allLineItems = (existingLineItems || []) as LineItem[];

      // Get shift IDs on sent/paid invoices (protected)
      const sentInvoiceIds = new Set(
        allInvoices.filter((i) => i.status !== "draft").map((i) => i.id)
      );
      const protectedShiftIds = new Set(
        allLineItems
          .filter((li) => li.shift_id && sentInvoiceIds.has(li.invoice_id))
          .map((li) => li.shift_id!)
      );

      // Filter eligible shifts
      const eligibleShifts = (shifts as Shift[]).filter(
        (s) => !protectedShiftIds.has(s.id)
      );

      if (eligibleShifts.length === 0) {
        results.push({ facility: facility.name, action: "all_shifts_invoiced" });
        continue;
      }

      // Check for existing draft for this period
      const periodStartStr = formatDate(period.start);
      const periodEndStr = formatDate(period.end);
      const existingDraft = allInvoices.find(
        (inv) =>
          inv.status === "draft" &&
          inv.facility_id === facility.id &&
          formatDate(new Date(inv.period_start)) === periodStartStr &&
          formatDate(new Date(inv.period_end)) === periodEndStr
      );

      if (existingDraft) {
        // Update existing draft: rebuild line items
        await supabase
          .from("invoice_line_items")
          .delete()
          .eq("invoice_id", existingDraft.id);

        const newLineItems = eligibleShifts.map((s) => ({
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
        await supabase
          .from("invoices")
          .update({ total_amount: total, balance_due: total })
          .eq("id", existingDraft.id);

        results.push({
          facility: facility.name,
          action: "updated_draft",
          invoiceNumber: existingDraft.invoice_number,
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
        const lineItems = eligibleShifts.map((s) => ({
          shift_id: s.id,
          description: `${formatShortDate(new Date(s.start_datetime))} — Relief coverage`,
          service_date: formatDate(new Date(s.start_datetime)),
          qty: 1,
          unit_rate: s.rate_applied,
          line_total: s.rate_applied,
        }));

        const total = lineItems.reduce((sum, li) => sum + li.line_total, 0);
        const dueDate = addDays(now, facility.invoice_due_days || 15);

        // Create invoice
        const { data: invData, error: invErr } = await supabase
          .from("invoices")
          .insert({
            user_id: facility.user_id,
            facility_id: facility.id,
            invoice_number: invoiceNumber,
            invoice_date: now.toISOString(),
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
          results.push({ facility: facility.name, action: "error" });
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
        });
      }
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
