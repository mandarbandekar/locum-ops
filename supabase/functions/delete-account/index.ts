import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const body = await req.json().catch(() => ({}));
    const { reason, feedback } = body;

    // Use service role to delete all user data
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Store exit survey before deleting
    if (reason || feedback) {
      await admin.from("account_deletion_logs").insert({
        user_id: userId,
        email: user.email || "",
        reason: reason || "",
        feedback: feedback || "",
      });
    }

    // Delete from all user-owned tables (order matters for FK constraints)
    const userTables = [
      "shift_calendar_sync",
      "calendar_sync_preferences",
      "calendar_feed_tokens",
      "calendar_connections",
      "confirmation_shift_links",  // depends on confirmation_records
      "confirmation_activity",
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
      "credential_packet_items",
      "credential_packets",
      "credential_reminders",
      "credential_renewal_portals",
      "credential_history",
      "credential_documents",
      "ce_credential_links",
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

    for (const table of userTables) {
      const col = table === "profiles" ? "id" : "user_id";
      const { error } = await admin.from(table).delete().eq(col, userId);
      if (error) {
        console.error(`Failed to delete from ${table}:`, error.message);
      }
    }

    // Delete the auth user last
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
