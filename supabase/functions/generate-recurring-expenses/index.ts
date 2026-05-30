import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { localYMDInTz } from "../_shared/tzTime.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    // Find all recurring expenses (parents only — no recurrence_parent_id)
    const { data: recurring, error: fetchErr } = await supabase
      .from("expenses")
      .select("*")
      .in("recurrence_type", ["monthly", "quarterly", "yearly"])
      .is("recurrence_parent_id", null);

    if (fetchErr) throw fetchErr;
    if (!recurring || recurring.length === 0) {
      return new Response(JSON.stringify({ created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch-fetch each owner's profile timezone in a single query so "today"
    // is computed in the user's local tz rather than UTC.
    const userIds = Array.from(new Set(recurring.map((e: any) => e.user_id).filter(Boolean)));
    const tzByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, timezone")
        .in("user_id", userIds);
      for (const p of profiles || []) {
        const tz = (p as any).timezone && String((p as any).timezone).trim();
        tzByUser.set((p as any).user_id, tz || "America/New_York");
      }
    }
    const resolveTz = (uid: string) => tzByUser.get(uid) || "America/New_York";

    let created = 0;

    for (const exp of recurring) {
      const userTz = resolveTz(exp.user_id);
      const todayStr = localYMDInTz(now, userTz);

      // Check if past end date (compared in the owner's local tz)
      if (exp.recurrence_end_date && exp.recurrence_end_date < todayStr) continue;


      // Determine the next expected date
      const baseDate = new Date(exp.expense_date + "T00:00:00Z");
      const candidates: string[] = [];

      // Generate all expected dates from base up to today
      let cursor = new Date(baseDate);
      while (true) {
        if (exp.recurrence_type === "monthly") {
          cursor = new Date(cursor);
          cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        } else if (exp.recurrence_type === "quarterly") {
          cursor = new Date(cursor);
          cursor.setUTCMonth(cursor.getUTCMonth() + 3);
        } else {
          cursor = new Date(cursor);
          cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
        }
        const cursorStr = cursor.toISOString().split("T")[0];
        if (cursorStr > todayStr) break;
        if (exp.recurrence_end_date && cursorStr > exp.recurrence_end_date) break;
        candidates.push(cursorStr);
        // Safety: max 60 iterations
        if (candidates.length > 60) break;
      }

      if (candidates.length === 0) continue;

      // Check which dates already have entries
      const { data: existing } = await supabase
        .from("expenses")
        .select("expense_date")
        .eq("recurrence_parent_id", exp.id);

      const existingDates = new Set((existing || []).map((e: any) => e.expense_date));

      for (const dateStr of candidates) {
        if (existingDates.has(dateStr)) continue;

        const { error: insErr } = await supabase.from("expenses").insert({
          user_id: exp.user_id,
          expense_date: dateStr,
          amount_cents: exp.amount_cents,
          category: exp.category,
          subcategory: exp.subcategory,
          description: exp.description,
          facility_id: exp.facility_id,
          deductible_amount_cents: exp.deductible_amount_cents,
          deductibility_type: exp.deductibility_type,
          home_office_sqft: exp.home_office_sqft,
          prorate_percent: exp.prorate_percent,
          recurrence_type: "none",
          recurrence_parent_id: exp.id,
        });

        if (!insErr) created++;
      }
    }

    return new Response(JSON.stringify({ created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recurring-expenses error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
