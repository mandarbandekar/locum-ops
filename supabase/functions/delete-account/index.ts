import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_REASON_LEN = 500;
const MAX_FEEDBACK_LEN = 2000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use anon client with user's auth header to validate session
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Use getClaims for fast JWT validation
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Claims validation error:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    // Validate and truncate input
    let body: any;
    try {
      const raw = await req.text();
      if (raw.length > 50_000) {
        return new Response(JSON.stringify({ error: "Request too large" }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    const reason = typeof body.reason === 'string' ? body.reason.slice(0, MAX_REASON_LEN) : '';
    const feedback = typeof body.feedback === 'string' ? body.feedback.slice(0, MAX_FEEDBACK_LEN) : '';

    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (reason || feedback) {
      await admin.from("account_deletion_logs").insert({
        user_id: userId,
        email: userEmail,
        reason,
        feedback,
      });
    }

    // Tables with user_id column (order matters for FK dependencies)
    const userTables = [
      "shift_calendar_sync",
      "calendar_sync_preferences",
      "calendar_feed_tokens",
      "calendar_connections",
      "confirmation_records",
      "invoice_activity",
      "invoice_payments",
      "invoice_line_items",
      "invoices",
      "contract_terms",
      "contract_checklist_items",
      "contracts",
      "facility_contacts",
      "email_logs",
      "shifts",
      "facilities",
      "credential_packets",
      "credential_reminders",
      "credential_renewal_portals",
      "credential_documents",
      "ce_entries",
      "clinic_requirement_mappings",
      "clinic_requirements",
      "credentials",
      "deduction_categories",
      "cpa_questions",
      "saved_tax_questions",
      "required_subscriptions",
      "reminder_category_settings",
      "reminder_preferences",
      "reminders",
      "imported_entities",
      "import_files",
      "import_jobs",
      "user_profiles",
      "profiles",
    ];

    // Tables without user_id that are cleaned via cascade or don't need direct deletion:
    // confirmation_shift_links, confirmation_activity, credential_packet_items,
    // credential_history, ce_credential_links — these cascade from parent tables

    for (const table of userTables) {
      const col = table === "profiles" ? "id" : "user_id";
      const { error } = await admin.from(table).delete().eq(col, userId);
      if (error) {
        console.error(`Failed to delete from ${table}:`, error.message);
      }
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error("Failed to delete auth user:", deleteUserError.message);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
