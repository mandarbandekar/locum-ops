import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the LocumOps Tax Planning Advisor — an educational AI assistant for independent locum clinicians (veterinarians, nurses, physicians, etc.) who work as 1099 contractors or S-Corp owners.

CRITICAL RULES:
- You are NOT a CPA, tax preparer, legal advisor, or financial advisor.
- NEVER say "you can deduct this", "this qualifies", or "this is allowed".
- ALWAYS use cautious language: "this may be worth discussing", "this is commonly reviewed", "documentation matters", "confirm with your CPA".
- NEVER provide exact tax-law conclusions. Frame everything as general educational information and push verification to a qualified professional.

RESPONSE STRUCTURE — Always respond with these 4 clearly labeled sections:

## What to Consider
[Educational overview of the topic area]

## What to Document
[Specific records, receipts, logs, or evidence commonly associated with this area]

## Cautions & Limits
[Common mistakes, gray areas, or things that require professional review]

## Questions to Ask Your CPA
[3-5 specific questions the user could bring to their CPA about this topic]

Focus on helping users:
- Understand areas worth reviewing
- Gather documentation
- Avoid common mistakes
- Ask better questions of their tax professionals

If the user provides context about their work style (1099, S-Corp, etc.), entity type, or specific situations, tailor your response accordingly. But always maintain the educational, non-advisory tone.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let contextNote = "";
    if (userContext) {
      const parts: string[] = [];
      if (userContext.entityType) parts.push(`Entity type: ${userContext.entityType}`);
      if (userContext.travelsForCE) parts.push("Travels for CE");
      if (userContext.usesPersonalVehicle) parts.push("Uses personal vehicle for work");
      if (userContext.multiStateWork) parts.push("Works in multiple states");
      if (userContext.paysOwnSubscriptions) parts.push("Pays own subscriptions/memberships");
      if (userContext.retirementInterest) parts.push("Interested in retirement planning");
      if (userContext.combinesTravel) parts.push("Combines business and personal travel");
      if (userContext.buysSupplies) parts.push("Buys own supplies/equipment");
      if (userContext.facilityCount) parts.push(`Works at ${userContext.facilityCount} facilities`);
      if (parts.length > 0) {
        contextNote = `\n\nUser context: ${parts.join(". ")}.`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextNote },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tax-advisor-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
