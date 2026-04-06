import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const sixtyMinsAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find shifts that ended in the last 60 minutes
    const { data: recentShifts, error: shiftErr } = await supabase
      .from("shifts")
      .select("id, user_id, facility_id, start_datetime, end_datetime, status")
      .gte("end_datetime", sixtyMinsAgo.toISOString())
      .lte("end_datetime", now.toISOString())
      .in("status", ["completed", "booked"]);

    if (shiftErr) {
      console.error("Failed to fetch shifts:", shiftErr);
      return new Response(JSON.stringify({ error: "Failed to fetch shifts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recentShifts || recentShifts.length === 0) {
      return new Response(JSON.stringify({ message: "No recent shifts to process", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which shifts already have mileage expenses
    const shiftIds = recentShifts.map((s: any) => s.id);
    const { data: existingMileage } = await supabase
      .from("expenses")
      .select("shift_id")
      .in("shift_id", shiftIds)
      .eq("subcategory", "mileage")
      .eq("is_auto_mileage", true);

    const alreadyProcessed = new Set((existingMileage || []).map((e: any) => e.shift_id));
    const shiftsToProcess = recentShifts.filter((s: any) => !alreadyProcessed.has(s.id));

    if (shiftsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "All shifts already have mileage entries", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather unique user IDs and facility IDs
    const userIds = [...new Set(shiftsToProcess.map((s: any) => s.user_id))];
    const facilityIds = [...new Set(shiftsToProcess.map((s: any) => s.facility_id))];

    // Fetch user profiles (home address) and expense configs
    const [profilesRes, facilitiesRes, configsRes] = await Promise.all([
      supabase.from("user_profiles").select("user_id, home_address, company_address").in("user_id", userIds),
      supabase.from("facilities").select("id, name, address, mileage_override_miles, facility_coordinates").in("id", facilityIds),
      supabase.from("expense_config").select("user_id, irs_mileage_rate_cents").in("user_id", userIds),
    ]);

    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const facilityMap: Record<string, any> = {};
    (facilitiesRes.data || []).forEach((f: any) => { facilityMap[f.id] = f; });

    const configMap: Record<string, number> = {};
    (configsRes.data || []).forEach((c: any) => { configMap[c.user_id] = c.irs_mileage_rate_cents; });

    const expensesToInsert: any[] = [];
    let processed = 0;

    for (const shift of shiftsToProcess) {
      const profile = profileMap[shift.user_id];
      const facility = facilityMap[shift.facility_id];
      const irsMileageRateCents = configMap[shift.user_id] || 70; // default 70 cents/mi (2025)

      if (!profile || !facility) continue;

      const homeAddr = profile.home_address || profile.company_address;
      if (!homeAddr) continue;

      let oneWayMiles: number | null = null;

      // Use override if set
      if (facility.mileage_override_miles) {
        oneWayMiles = parseFloat(facility.mileage_override_miles);
      } else if (GOOGLE_MAPS_API_KEY && homeAddr && facility.address) {
        // Try Google Maps Distance Matrix API
        try {
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(homeAddr)}&destinations=${encodeURIComponent(facility.address)}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`;
          const resp = await fetch(url);
          const data = await resp.json();
          if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
            const meters = data.rows[0].elements[0].distance.value;
            oneWayMiles = Math.round((meters / 1609.344) * 10) / 10; // round to 1 decimal
          }
        } catch (e) {
          console.error("Distance API error:", e);
        }
      }

      // If we couldn't determine distance, skip (user can manually add)
      if (!oneWayMiles || oneWayMiles <= 0) continue;

      const roundTripMiles = oneWayMiles * 2;
      const amountCents = Math.round(roundTripMiles * irsMileageRateCents);
      const shiftDate = shift.start_datetime.split("T")[0];

      expensesToInsert.push({
        user_id: shift.user_id,
        expense_date: shiftDate,
        amount_cents: amountCents,
        category: "travel",
        subcategory: "mileage",
        description: `Auto-mileage: ${facility.name}`,
        facility_id: shift.facility_id,
        shift_id: shift.id,
        deductible_amount_cents: amountCents,
        deductibility_type: "full",
        mileage_miles: roundTripMiles,
        is_auto_mileage: true,
        mileage_status: "draft",
        route_description: `Home → ${facility.name} → Home (${roundTripMiles} mi)`,
      });
      processed++;
    }

    if (expensesToInsert.length > 0) {
      const { error: insertErr } = await supabase.from("expenses").insert(expensesToInsert);
      if (insertErr) {
        console.error("Failed to insert mileage expenses:", insertErr);
        return new Response(JSON.stringify({ error: "Failed to insert expenses" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${processed} mileage entries`, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Auto-mileage tracker error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
