import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a concise business analyst for a locum veterinarian's practice management app. Given their key metrics for a recent period, write a 2-3 sentence plain-language summary of how their business is doing. Highlight what's going well and one area to watch. Be warm, professional, and actionable. Do NOT use markdown formatting, bullet points, or headers — just plain sentences. Keep it under 60 words.`;

    const userPrompt = `Here are my business metrics for the last ${metrics.periodLabel}:
- Total Revenue: $${metrics.totalRevenue.toLocaleString()}
- Collected: $${metrics.totalPaid.toLocaleString()} (${metrics.collectionRate}% collection rate)
- Revenue change vs previous period: ${metrics.revenueDelta}
- Total Shifts: ${metrics.totalShifts} (change: ${metrics.shiftsDelta})
- Effective Hourly Rate: $${metrics.effectiveRate}/hr
- Total Hours Worked: ${metrics.totalHours}h
- Fastest paying facility: ${metrics.fastestPayer || 'N/A'}
- Top revenue facility: ${metrics.topRevenueFacility || 'N/A'}
- Best earning day: ${metrics.bestDay || 'N/A'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("business-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
