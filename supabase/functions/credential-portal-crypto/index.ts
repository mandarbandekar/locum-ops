import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://locum-ops.lovable.app',
  'https://id-preview--2263427a-5054-4595-ad6b-d5ed09d0eb59.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const ENC_KEY_NAME = "PORTAL_ENCRYPTION_KEY";

async function deriveKey(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function hexEncode(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexDecode(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );
  return hexEncode(iv.buffer as ArrayBuffer) + hexEncode(ciphertext);
}

async function decrypt(blob: string, key: CryptoKey): Promise<string> {
  const iv = hexDecode(blob.slice(0, 24));
  const ciphertext = hexDecode(blob.slice(24));
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuf);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get(ENC_KEY_NAME);
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "Encryption key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, text, credential_id } = body;

    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: "Missing or invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = await deriveKey(secret);
    let result: string;

    if (action === "encrypt") {
      if (!text || typeof text !== 'string' || text.length > 1000) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid text (max 1000 chars)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = await encrypt(text, key);
    } else if (action === "decrypt") {
      // For decrypt: require credential_id and verify ownership
      if (!credential_id || typeof credential_id !== 'string') {
        return new Response(
          JSON.stringify({ error: "credential_id is required for decryption" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use service role to look up the encrypted value scoped to the requesting user
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceKey);

      const { data: portal, error: portalError } = await adminClient
        .from('credential_renewal_portals')
        .select('renewal_password_encrypted')
        .eq('credential_id', credential_id)
        .eq('user_id', user.id)
        .single();

      if (portalError || !portal?.renewal_password_encrypted) {
        return new Response(
          JSON.stringify({ error: "No encrypted password found for this credential" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      result = await decrypt(portal.renewal_password_encrypted, key);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
