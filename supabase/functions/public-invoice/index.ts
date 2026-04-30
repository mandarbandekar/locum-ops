import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch invoice by share_token
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('share_token', token)
    .is('share_token_revoked_at', null)
    .single();

  if (invErr || !invoice) {
    return new Response(JSON.stringify({ error: 'Invoice not found or link revoked' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch related data
  const [liRes, facRes, profileRes, contactRes] = await Promise.all([
    supabase.from('invoice_line_items').select('description, service_date, qty, unit_rate, line_total, shift_id').eq('invoice_id', invoice.id).order('service_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
    supabase.from('facilities').select('name, address, invoice_name_to, invoice_email_to').eq('id', invoice.facility_id).single(),
    supabase.from('user_profiles').select('first_name, last_name, company_name, company_address, invoice_email, invoice_phone').eq('user_id', invoice.user_id).single(),
    supabase.from('facility_contacts').select('name, email').eq('facility_id', invoice.facility_id).or('is_primary.eq.true,role.eq.billing').limit(1).single(),
  ]);

  return new Response(JSON.stringify({
    invoice: {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      total_amount: invoice.total_amount,
      balance_due: invoice.balance_due,
      notes: invoice.notes,
      status: invoice.status,
    },
    line_items: liRes.data || [],
    facility: facRes.data,
    sender: profileRes.data,
    billing_contact: contactRes.data,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
