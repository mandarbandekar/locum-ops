import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const invoiceId = url.searchParams.get('invoice_id');
  const shareToken = url.searchParams.get('token');

  if (!invoiceId && !shareToken) {
    return new Response(JSON.stringify({ error: 'Missing invoice_id or token' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let invoice: any;

  if (shareToken) {
    const { data, error } = await supabase
      .from('invoices').select('*')
      .eq('share_token', shareToken)
      .is('share_token_revoked_at', null)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    invoice = data;
  } else {
    // Verify ownership via auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data, error } = await supabase
      .from('invoices').select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    invoice = data;
  }

  // Fetch related data
  const [liRes, facRes, profileRes, contactRes] = await Promise.all([
    supabase.from('invoice_line_items').select('*').eq('invoice_id', invoice.id).order('created_at'),
    supabase.from('facilities').select('name, address').eq('id', invoice.facility_id).single(),
    supabase.from('user_profiles').select('first_name, last_name, company_name, company_address, invoice_email, invoice_phone').eq('user_id', invoice.user_id).single(),
    supabase.from('facility_contacts').select('name, email').eq('facility_id', invoice.facility_id).or('is_primary.eq.true,role.eq.billing').limit(1).single(),
  ]);

  const lineItems = liRes.data || [];
  const facility = facRes.data;
  const sender = profileRes.data;
  const billingContact = contactRes.data;

  // Generate PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0.1, 0.1, 0.12);
  const gray = rgb(0.45, 0.45, 0.5);
  const primary = rgb(0.18, 0.55, 0.47); // teal-ish to match app
  const lightGray = rgb(0.93, 0.93, 0.95);

  const margin = 50;
  const pageWidth = 612 - margin * 2;
  let y = 742;

  function drawText(text: string, x: number, yPos: number, options: { font?: any; size?: number; color?: any; maxWidth?: number } = {}) {
    const font = options.font || helvetica;
    const size = options.size || 10;
    const color = options.color || black;
    page.drawText(text || '', { x, y: yPos, size, font, color, maxWidth: options.maxWidth });
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(amount: number) {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // === HEADER ===
  // Company name
  drawText(sender?.company_name || 'Invoice', margin, y, { font: helveticaBold, size: 18, color: black });
  // "INVOICE" label
  drawText('INVOICE', 612 - margin - helveticaBold.widthOfTextAtSize('INVOICE', 22), y, { font: helveticaBold, size: 22, color: primary });
  y -= 18;

  // Sender name
  if (sender?.first_name || sender?.last_name) {
    drawText(`${sender.first_name || ''} ${sender.last_name || ''}`.trim(), margin, y, { size: 10, color: gray });
  }
  // Invoice number
  const invNumText = invoice.invoice_number || '';
  drawText(invNumText, 612 - margin - helveticaBold.widthOfTextAtSize(invNumText, 11), y, { font: helveticaBold, size: 11 });
  y -= 14;

  // Sender address
  if (sender?.company_address) {
    const lines = sender.company_address.split('\n');
    for (const line of lines) {
      drawText(line, margin, y, { size: 9, color: gray });
      y -= 12;
    }
  }
  if (sender?.invoice_email) {
    drawText(sender.invoice_email, margin, y, { size: 9, color: gray });
    y -= 12;
  }
  if (sender?.invoice_phone) {
    drawText(sender.invoice_phone, margin, y, { size: 9, color: gray });
    y -= 12;
  }

  y -= 10;

  // === BILL TO + DATES ===
  const billToX = margin;
  const datesX = 370;

  drawText('BILL TO', billToX, y, { font: helveticaBold, size: 8, color: gray });
  drawText('INVOICE DATE', datesX, y, { font: helveticaBold, size: 8, color: gray });
  y -= 14;

  drawText(facility?.name || 'Unknown', billToX, y, { font: helveticaBold, size: 11 });
  drawText(formatDate(invoice.invoice_date), datesX, y, { size: 10 });
  y -= 14;

  if (billingContact?.name) {
    drawText(billingContact.name, billToX, y, { size: 9, color: gray });
  }
  drawText('DUE DATE', datesX, y, { font: helveticaBold, size: 8, color: gray });
  y -= 14;

  if (billingContact?.email) {
    drawText(billingContact.email, billToX, y, { size: 9, color: gray });
  }
  drawText(formatDate(invoice.due_date), datesX, y, { size: 10 });
  y -= 14;

  if (facility?.address) {
    drawText(facility.address, billToX, y, { size: 9, color: gray, maxWidth: 250 });
  }
  y -= 24;

  // === LINE ITEMS TABLE ===
  // Header row background
  page.drawRectangle({
    x: margin, y: y - 4, width: pageWidth, height: 20,
    color: lightGray,
  });

  const colX = { desc: margin + 8, date: 310, qty: 380, rate: 420, amount: 490 };

  drawText('Description', colX.desc, y, { font: helveticaBold, size: 8, color: gray });
  drawText('Date', colX.date, y, { font: helveticaBold, size: 8, color: gray });
  drawText('Qty', colX.qty, y, { font: helveticaBold, size: 8, color: gray });
  drawText('Rate', colX.rate, y, { font: helveticaBold, size: 8, color: gray });
  drawText('Amount', colX.amount, y, { font: helveticaBold, size: 8, color: gray });
  y -= 22;

  for (const li of lineItems) {
    if (y < 100) {
      // Add new page if running out of space
      break; // simplified — for very long invoices
    }
    // Separator line
    page.drawLine({ start: { x: margin, y: y + 12 }, end: { x: 612 - margin, y: y + 12 }, thickness: 0.5, color: lightGray });

    const desc = (li.description || '').substring(0, 50);
    drawText(desc, colX.desc, y, { size: 9 });
    drawText(li.service_date ? formatDate(li.service_date) : '—', colX.date, y, { size: 9, color: gray });
    drawText(String(li.qty), colX.qty, y, { size: 9 });
    drawText(formatCurrency(li.unit_rate), colX.rate, y, { size: 9 });
    const amtText = formatCurrency(li.line_total);
    drawText(amtText, colX.amount, y, { font: helveticaBold, size: 9 });
    y -= 18;
  }

  if (lineItems.length === 0) {
    drawText('No line items', colX.desc, y, { size: 9, color: gray });
    y -= 18;
  }

  y -= 10;

  // Separator
  page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 1, color: lightGray });
  y -= 20;

  // === TOTALS ===
  const totalsX = 400;
  drawText('Subtotal', totalsX, y, { size: 10, color: gray });
  const subtotalText = formatCurrency(invoice.total_amount);
  drawText(subtotalText, 612 - margin - helvetica.widthOfTextAtSize(subtotalText, 10), y, { size: 10 });
  y -= 20;

  // Amount Due line
  page.drawLine({ start: { x: totalsX - 10, y: y + 14 }, end: { x: 612 - margin, y: y + 14 }, thickness: 0.5, color: lightGray });
  drawText('Amount Due', totalsX, y, { font: helveticaBold, size: 12 });
  const dueText = formatCurrency(invoice.balance_due);
  drawText(dueText, 612 - margin - helveticaBold.widthOfTextAtSize(dueText, 12), y, { font: helveticaBold, size: 12, color: primary });
  y -= 30;

  // === NOTES ===
  if (invoice.notes) {
    drawText('NOTES', margin, y, { font: helveticaBold, size: 8, color: gray });
    y -= 14;
    const noteLines = invoice.notes.split('\n');
    for (const line of noteLines) {
      drawText(line, margin, y, { size: 9, color: gray, maxWidth: pageWidth });
      y -= 12;
    }
  }

  // Generate bytes
  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number || 'invoice'}.pdf"`,
    },
  });
});
