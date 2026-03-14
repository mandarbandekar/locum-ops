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

    const { facility_id, facility_name, content, source_label } = await req.json();
    if (!facility_id || !content) {
      return new Response(JSON.stringify({ error: "Missing facility_id or content" }), {
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

    const systemPrompt = `You are a data extraction assistant for a locum tenens practice management platform. The user is enriching data for a specific facility called "${facility_name || 'Unknown'}". Extract any relevant information from the provided text. Look for:
- Contact names, emails, phones, and roles (practice manager, billing contact, office manager, etc.)
- Rates: weekday rate, weekend rate, holiday rate, partial day rate, telemedicine rate
- Payment terms (net days)
- Cancellation policy text
- Overtime policy text
- Late payment policy text
- Invoicing instructions
- General notes about the facility
- Contract metadata: effective date, end date, title

Return ALL findings. Assign a confidence score (0.0-1.0) to each suggestion based on how clearly it was stated. Group suggestions by category.`;

    const toolDef = {
      type: "function",
      function: {
        name: "extract_facility_data",
        description: "Extract facility enrichment data from uploaded content",
        parameters: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  role: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["name", "confidence"],
              },
            },
            rates: {
              type: "object",
              properties: {
                weekday_rate: { type: "number" },
                weekend_rate: { type: "number" },
                holiday_rate: { type: "number" },
                partial_day_rate: { type: "number" },
                telemedicine_rate: { type: "number" },
                confidence: { type: "number" },
              },
            },
            terms: {
              type: "object",
              properties: {
                payment_terms_days: { type: "number" },
                cancellation_policy: { type: "string" },
                overtime_policy: { type: "string" },
                late_payment_policy: { type: "string" },
                invoicing_instructions: { type: "string" },
                confidence: { type: "number" },
              },
            },
            contract: {
              type: "object",
              properties: {
                title: { type: "string" },
                effective_date: { type: "string" },
                end_date: { type: "string" },
                confidence: { type: "number" },
              },
            },
            notes: {
              type: "string",
              description: "Any additional notes or observations about the facility",
            },
          },
          required: [],
        },
      },
    };

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
          { role: "user", content: `Source: ${source_label || "user input"}\n\n${content}` },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "extract_facility_data" } },
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

    // Build grouped suggestions
    const suggestions: any[] = [];

    if (parsed.contacts?.length) {
      for (const c of parsed.contacts) {
        suggestions.push({
          category: "contacts",
          action: "add",
          data: c,
          confidence: c.confidence ?? null,
          source_label: source_label || "upload",
        });
      }
    }

    if (parsed.rates && Object.keys(parsed.rates).some(k => k !== "confidence" && parsed.rates[k] != null)) {
      suggestions.push({
        category: "rates",
        action: "update",
        data: parsed.rates,
        confidence: parsed.rates.confidence ?? null,
        source_label: source_label || "upload",
      });
    }

    if (parsed.terms && Object.keys(parsed.terms).some(k => k !== "confidence" && parsed.terms[k])) {
      suggestions.push({
        category: "terms",
        action: "update",
        data: parsed.terms,
        confidence: parsed.terms.confidence ?? null,
        source_label: source_label || "upload",
      });
    }

    if (parsed.contract && Object.keys(parsed.contract).some(k => k !== "confidence" && parsed.contract[k])) {
      suggestions.push({
        category: "contracts",
        action: "add",
        data: parsed.contract,
        confidence: parsed.contract.confidence ?? null,
        source_label: source_label || "upload",
      });
    }

    if (parsed.notes) {
      suggestions.push({
        category: "notes",
        action: "update",
        data: { notes: parsed.notes },
        confidence: 0.7,
        source_label: source_label || "upload",
      });
    }

    return new Response(JSON.stringify({ success: true, suggestions, raw: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-facility-enrich error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
