import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { import_job_id, lane, content, file_name } = await req.json();
    if (!lane || !content) {
      return new Response(JSON.stringify({ error: "Missing lane or content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let toolDef: any = null;

    if (lane === "facilities") {
      systemPrompt = `You are a data extraction assistant for a locum tenens practice management platform. Extract facility/clinic information from the provided data. For each facility found, extract: name, address, timezone (guess based on address if possible), contact_name, contact_email, contact_phone, contact_role, weekday_rate, weekend_rate, holiday_rate, notes. Return all facilities found. Assign a confidence score (0.0-1.0) based on data quality. If data is ambiguous, set lower confidence. Also identify potential duplicates by flagging facilities with similar names.`;
      toolDef = {
        type: "function",
        function: {
          name: "extract_facilities",
          description: "Extract facility records from uploaded data",
          parameters: {
            type: "object",
            properties: {
              facilities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    address: { type: "string" },
                    timezone: { type: "string" },
                    contact_name: { type: "string" },
                    contact_email: { type: "string" },
                    contact_phone: { type: "string" },
                    contact_role: { type: "string" },
                    weekday_rate: { type: "number" },
                    weekend_rate: { type: "number" },
                    holiday_rate: { type: "number" },
                    notes: { type: "string" },
                    confidence: { type: "number" },
                    possible_duplicate_of: { type: "string", description: "Name of another facility this might be a duplicate of" },
                  },
                  required: ["name", "confidence"],
                },
              },
            },
            required: ["facilities"],
          },
        },
      };
    } else if (lane === "contracts") {
      systemPrompt = `You are a contract terms extraction assistant for a locum tenens practice management platform. Extract key terms from the provided contract text. Extract: facility_name, weekday_rate, weekend_rate, holiday_rate, payment_terms_days, cancellation_policy, overtime_policy, late_payment_policy, invoicing_instructions, effective_date, end_date. Assign a confidence score (0.0-1.0) for each field based on how clearly it was stated. Return structured data. This is NOT legal advice - just data extraction for user review.`;
      toolDef = {
        type: "function",
        function: {
          name: "extract_contract_terms",
          description: "Extract contract terms from uploaded document",
          parameters: {
            type: "object",
            properties: {
              facility_name: { type: "string" },
              weekday_rate: { type: "number" },
              weekend_rate: { type: "number" },
              holiday_rate: { type: "number" },
              payment_terms_days: { type: "number" },
              cancellation_policy: { type: "string" },
              overtime_policy: { type: "string" },
              late_payment_policy: { type: "string" },
              invoicing_instructions: { type: "string" },
              effective_date: { type: "string" },
              end_date: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["confidence"],
          },
        },
      };
    } else if (lane === "shifts") {
      systemPrompt = `You are a schedule extraction assistant for a locum tenens practice management platform. Extract shift/appointment records from the provided calendar or schedule data. For each shift, extract: date, start_time (ISO), end_time (ISO), facility_name (best guess from event title/location), notes, status (booked or proposed). Assign a confidence score (0.0-1.0). Flag potential duplicates or overlapping shifts.`;
      toolDef = {
        type: "function",
        function: {
          name: "extract_shifts",
          description: "Extract shift records from schedule data",
          parameters: {
            type: "object",
            properties: {
              shifts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    start_time: { type: "string" },
                    end_time: { type: "string" },
                    facility_name: { type: "string" },
                    notes: { type: "string" },
                    status: { type: "string", enum: ["booked", "proposed"] },
                    confidence: { type: "number" },
                    has_overlap: { type: "boolean" },
                  },
                  required: ["date", "start_time", "end_time", "confidence"],
                },
              },
            },
            required: ["shifts"],
          },
        },
      };
    } else {
      return new Response(JSON.stringify({ error: "Unknown lane" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Source: ${file_name || "user input"}\n\n${content}` },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: toolDef.function.name } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store entities in imported_entities table if we have a job ID
    if (import_job_id) {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      if (lane === "facilities" && parsed.facilities) {
        const rows = parsed.facilities.map((f: any) => ({
          import_job_id,
          user_id: user.id,
          entity_type: "facility",
          raw_data: f,
          parsed_data: f,
          confidence_score: f.confidence ?? null,
          review_status: "pending",
        }));
        if (rows.length > 0) {
          await serviceClient.from("imported_entities").insert(rows);
        }
      } else if (lane === "contracts") {
        await serviceClient.from("imported_entities").insert({
          import_job_id,
          user_id: user.id,
          entity_type: "contract",
          raw_data: parsed,
          parsed_data: parsed,
          confidence_score: parsed.confidence ?? null,
          review_status: "pending",
        });
      } else if (lane === "shifts" && parsed.shifts) {
        const rows = parsed.shifts.map((s: any) => ({
          import_job_id,
          user_id: user.id,
          entity_type: "shift",
          raw_data: s,
          parsed_data: s,
          confidence_score: s.confidence ?? null,
          review_status: "pending",
        }));
        if (rows.length > 0) {
          await serviceClient.from("imported_entities").insert(rows);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-setup-parse error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
