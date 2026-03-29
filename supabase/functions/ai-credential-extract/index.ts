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

    const { file_name, content } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "Missing content" }), {
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

    const systemPrompt = `You are a credential document extraction assistant for a veterinary locum tenens practice management platform. 
Analyze the provided document text and extract credential information. 
Extract: credential_type (one of: veterinary_license, dea_registration, state_controlled_substance, malpractice_insurance, professional_liability_insurance, usda_accreditation, business_license, ce_certificate, background_check, custom), 
custom_title (human-readable title like "Oregon Veterinary License"), 
holder_name, issuing_authority, jurisdiction (US state name if applicable), 
credential_number, issue_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD), 
document_type_label (e.g. "License Copy", "DEA Certificate", "Insurance Policy").
For each extracted field, provide a confidence level: "high", "review", or "unclear".
If you cannot determine a field, omit it or set confidence to "unclear".
This is NOT legal advice — just data extraction for user review.`;

    const toolDef = {
      type: "function",
      function: {
        name: "extract_credential",
        description: "Extract credential details from an uploaded document",
        parameters: {
          type: "object",
          properties: {
            credential_type: { type: "string" },
            credential_type_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            custom_title: { type: "string" },
            custom_title_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            holder_name: { type: "string" },
            holder_name_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            issuing_authority: { type: "string" },
            issuing_authority_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            jurisdiction: { type: "string" },
            jurisdiction_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            credential_number: { type: "string" },
            credential_number_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            issue_date: { type: "string" },
            issue_date_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            expiration_date: { type: "string" },
            expiration_date_confidence: { type: "string", enum: ["high", "review", "unclear"] },
            document_type_label: { type: "string" },
            overall_confidence: { type: "number", description: "0.0-1.0 overall extraction confidence" },
          },
          required: ["credential_type", "custom_title", "overall_confidence"],
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Document filename: ${file_name || "unknown"}\n\nDocument content:\n${content}` },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "extract_credential" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
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

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-credential-extract error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
