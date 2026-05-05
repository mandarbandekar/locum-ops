import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") || "";

interface PreviewShift {
  id: string;
  facility_name: string;
  shift_date: string;
  estimated_miles: number;
  estimated_deduction_cents: number;
}

async function getOneWayMiles(homeAddr: string, facility: any): Promise<number | null> {
  if (facility.mileage_override_miles) {
    return parseFloat(facility.mileage_override_miles);
  }
  if (GOOGLE_MAPS_API_KEY && homeAddr && facility.address) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(homeAddr)}&destinations=${encodeURIComponent(facility.address)}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
        const meters = data.rows[0].elements[0].distance.value;
        return Math.round((meters / 1609.344) * 10) / 10;
      }
    } catch (e) {
      console.error("Distance API error:", e);
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: any, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "preview";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all user shifts
    const { data: allShifts, error: shiftErr } = await supabase
      .from("shifts")
      .select("id, facility_id, start_datetime, end_datetime")
      .eq("user_id", userId)
      .lte("end_datetime", new Date().toISOString())
      .order("start_datetime", { ascending: false });

    if (shiftErr) {
      console.error("Failed to fetch shifts:", shiftErr);
      return json({ error: "Failed to fetch shifts" }, 500);
    }

    if (!allShifts || allShifts.length === 0) {
      return json({ shifts: [] });
    }

    // Exclude shifts that already have mileage expenses
    const shiftIds = allShifts.map((s: any) => s.id);
    const { data: existingMileage } = await supabase
      .from("expenses")
      .select("shift_id")
      .in("shift_id", shiftIds)
      .eq("subcategory", "mileage")
      .eq("is_auto_mileage", true);

    const alreadyProcessed = new Set((existingMileage || []).map((e: any) => e.shift_id));
    const eligibleShifts = allShifts.filter((s: any) => !alreadyProcessed.has(s.id));

    if (eligibleShifts.length === 0) {
      return json({ shifts: [] });
    }

    // Fetch profile and facilities
    const facilityIds = [...new Set(eligibleShifts.map((s: any) => s.facility_id))];
    const [profileRes, facilitiesRes, configRes] = await Promise.all([
      supabase.from("user_profiles").select("home_address, company_address").eq("user_id", userId).maybeSingle(),
      supabase.from("facilities").select("id, name, address, mileage_override_miles, facility_coordinates").in("id", facilityIds),
      supabase.from("expense_config").select("irs_mileage_rate_cents").eq("user_id", userId).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const homeAddr = profile?.home_address || profile?.company_address;
    if (!homeAddr) {
      return json({ error: "Home address not set. Please set your home address in Settings > Profile." }, 400);
    }

    const facilityMap: Record<string, any> = {};
    (facilitiesRes.data || []).forEach((f: any) => { facilityMap[f.id] = f; });

    const irsMileageRateCents = configRes.data?.irs_mileage_rate_cents || 70;

    // Calculate distances for eligible shifts
    // Cache distances per facility to avoid redundant API calls
    const distanceCache: Record<string, number | null> = {};

    const previewShifts: PreviewShift[] = [];
    for (const shift of eligibleShifts) {
      const facility = facilityMap[shift.facility_id];
      if (!facility) continue;

      if (!(shift.facility_id in distanceCache)) {
        distanceCache[shift.facility_id] = await getOneWayMiles(homeAddr, facility);
      }

      const oneWayMiles = distanceCache[shift.facility_id];
      if (!oneWayMiles || oneWayMiles <= 0) continue;

      const roundTripMiles = oneWayMiles * 2;
      const deductionCents = Math.round(roundTripMiles * irsMileageRateCents);

      previewShifts.push({
        id: shift.id,
        facility_name: facility.name,
        shift_date: shift.start_datetime.split("T")[0],
        estimated_miles: roundTripMiles,
        estimated_deduction_cents: deductionCents,
      });
    }

    if (action === "preview") {
      return json({ shifts: previewShifts });
    }

    // Confirm mode: insert selected shifts as draft mileage expenses
    if (action === "confirm") {
      const selectedIds: string[] = body.shiftIds || [];
      if (selectedIds.length === 0) {
        return json({ error: "No shift IDs provided" }, 400);
      }

      const toInsert = previewShifts
        .filter((s) => selectedIds.includes(s.id))
        .map((s) => {
          const shift = eligibleShifts.find((es: any) => es.id === s.id)!;
          const facility = facilityMap[shift.facility_id];
          return {
            user_id: userId,
            expense_date: s.shift_date,
            amount_cents: s.estimated_deduction_cents,
            category: "travel",
            subcategory: "mileage",
            description: `Backfill mileage: ${s.facility_name}`,
            facility_id: shift.facility_id,
            shift_id: shift.id,
            deductible_amount_cents: s.estimated_deduction_cents,
            deductibility_type: "full",
            mileage_miles: s.estimated_miles,
            is_auto_mileage: true,
            mileage_status: "draft",
            route_description: `Home → ${facility?.name || "Clinic"} → Home (${s.estimated_miles} mi)`,
          };
        });

      if (toInsert.length === 0) {
        return json({ inserted: 0 });
      }

      const { error: insertErr } = await supabase.from("expenses").insert(toInsert);
      if (insertErr) {
        console.error("Failed to insert backfill expenses:", insertErr);
        return json({ error: "Failed to insert expenses" }, 500);
      }

      return json({ inserted: toInsert.length });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("Backfill mileage error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
