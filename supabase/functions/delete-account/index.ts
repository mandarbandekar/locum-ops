import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://locum-ops.lovable.app',
  'https://id-preview--2263427a-5054-4595-ad6b-d5ed09d0eb59.lovable.app',
  'https://2263427a-5054-4595-ad6b-d5ed09d0eb59.lovableproject.com',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const MAX_REASON_LEN = 500;
const MAX_FEEDBACK_LEN = 2000;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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
        email: user.email || "",
        reason,
        feedback,
      });
    }

    const userTables = [
      "shift_calendar_sync",
      "calendar_sync_preferences",
      "calendar_feed_tokens",
      "calendar_connections",
      "confirmation_shift_links",
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
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
