import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Reliable date formatting without toLocaleDateString (unreliable in Deno edge runtime)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// Reliable currency formatting without toLocaleString
function formatCurrency(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, dec] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}$${withCommas}.${dec}`;
}

// Word-wrap text to fit within maxWidth
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    const words = para.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      supabase.from('facilities').select('name, address, invoice_name_to, invoice_email_to, invoice_name_cc, invoice_email_cc, invoice_name_bcc, invoice_email_bcc').eq('id', invoice.facility_id).single(),
      supabase.from('user_profiles').select('first_name, last_name, company_name, company_address, invoice_email, invoice_phone').eq('user_id', invoice.user_id).single(),
      supabase.from('facility_contacts').select('name, email, phone, role').eq('facility_id', invoice.facility_id).or('is_primary.eq.true,role.eq.billing').limit(1).single(),
    ]);

    const lineItems = liRes.data || [];
    const facility = facRes.data;
    const sender = profileRes.data;
    const billingContact = contactRes.data;

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0.1, 0.1, 0.12);
    const gray = rgb(0.45, 0.45, 0.5);
    const primary = rgb(0.18, 0.55, 0.47);
    const lightGray = rgb(0.93, 0.93, 0.95);
    const white = rgb(1, 1, 1);

    const PAGE_W = 612;
    const PAGE_H = 792;
    const margin = 50;
    const pageWidth = PAGE_W - margin * 2;
    const FOOTER_MARGIN = 60;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = 742;
    let pageNum = 1;

    function ensureSpace(needed: number) {
      if (y - needed < FOOTER_MARGIN) {
        // Draw page number on current page
        const pnText = `Page ${pageNum}`;
        page.drawText(pnText, {
          x: PAGE_W / 2 - helvetica.widthOfTextAtSize(pnText, 8) / 2,
          y: 30, size: 8, font: helvetica, color: gray,
        });
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = 742;
        pageNum++;
      }
    }

    function drawText(text: string, x: number, yPos: number, options: { font?: any; size?: number; color?: any } = {}) {
      const font = options.font || helvetica;
      const size = options.size || 10;
      const color = options.color || black;
      // Sanitize: pdf-lib can't render certain chars
      const safe = (text || '').replace(/[^\x20-\x7E]/g, '');
      page.drawText(safe, { x, y: yPos, size, font, color });
    }

    function drawTextRight(text: string, rightX: number, yPos: number, options: { font?: any; size?: number; color?: any } = {}) {
      const font = options.font || helvetica;
      const size = options.size || 10;
      const safe = (text || '').replace(/[^\x20-\x7E]/g, '');
      const w = font.widthOfTextAtSize(safe, size);
      drawText(safe, rightX - w, yPos, options);
    }

    function drawWrapped(text: string, x: number, startY: number, maxW: number, options: { font?: any; size?: number; color?: any; lineHeight?: number } = {}): number {
      const font = options.font || helvetica;
      const size = options.size || 9;
      const lh = options.lineHeight || 12;
      const lines = wrapText(text, font, size, maxW);
      let cy = startY;
      for (const line of lines) {
        ensureSpace(lh);
        drawText(line, x, cy, { ...options, font, size });
        cy -= lh;
      }
      return cy;
    }

    // === HEADER ===
    drawText(sender?.company_name || 'Invoice', margin, y, { font: helveticaBold, size: 18 });
    drawTextRight('INVOICE', PAGE_W - margin, y, { font: helveticaBold, size: 22, color: primary });
    y -= 20;

    // Sender name
    if (sender?.first_name || sender?.last_name) {
      drawText(`${sender.first_name || ''} ${sender.last_name || ''}`.trim(), margin, y, { size: 10, color: gray });
    }
    // Invoice number
    drawTextRight(invoice.invoice_number || '', PAGE_W - margin, y, { font: helveticaBold, size: 11 });
    y -= 14;

    // Sender address (wrapped)
    if (sender?.company_address) {
      y = drawWrapped(sender.company_address, margin, y, 250, { size: 9, color: gray });
    }
    if (sender?.invoice_email) {
      drawText(sender.invoice_email, margin, y, { size: 9, color: gray });
      y -= 12;
    }
    if (sender?.invoice_phone) {
      drawText(sender.invoice_phone, margin, y, { size: 9, color: gray });
      y -= 12;
    }

    y -= 14;

    // === BILL TO + DATES ===
    const billToX = margin;
    const datesX = 380;
    const datesValX = PAGE_W - margin;

    drawText('BILL TO', billToX, y, { font: helveticaBold, size: 8, color: gray });
    drawText('INVOICE DATE', datesX, y, { font: helveticaBold, size: 8, color: gray });
    y -= 14;

    drawText(facility?.name || 'Unknown', billToX, y, { font: helveticaBold, size: 11 });
    drawTextRight(formatDate(invoice.invoice_date), datesValX, y, { size: 10 });
    y -= 14;

    // Use facility billing fields first, fall back to facility_contacts
    const billToName = facility?.invoice_name_to || billingContact?.name || '';
    const billToEmail = facility?.invoice_email_to || billingContact?.email || '';

    if (billToName) {
      drawText(billToName, billToX, y, { size: 9, color: gray });
    }
    drawText('DUE DATE', datesX, y, { font: helveticaBold, size: 8, color: gray });
    y -= 14;

    if (billToEmail) {
      drawText(billToEmail, billToX, y, { size: 9, color: gray });
    }
    drawTextRight(formatDate(invoice.due_date), datesValX, y, { size: 10 });
    y -= 14;

    // Facility address (wrapped, limited to left column)
    if (facility?.address) {
      y = drawWrapped(facility.address, billToX, y, 280, { size: 9, color: gray });
    }

    // CC / BCC info
    if (facility?.invoice_name_cc || facility?.invoice_email_cc) {
      y -= 4;
      drawText(`CC: ${facility.invoice_name_cc || ''} ${facility.invoice_email_cc ? '<' + facility.invoice_email_cc + '>' : ''}`.trim(), billToX, y, { size: 8, color: gray });
      y -= 12;
    }

    y -= 16;

    // === LINE ITEMS TABLE ===
    const colDesc = margin + 8;
    const colDate = 300;
    const colQty = 370;
    const colRate = 430;
    const colAmt = PAGE_W - margin;

    ensureSpace(30);

    // Header row background
    page.drawRectangle({
      x: margin, y: y - 4, width: pageWidth, height: 20,
      color: lightGray,
    });

    drawText('Description', colDesc, y, { font: helveticaBold, size: 8, color: gray });
    drawText('Date', colDate, y, { font: helveticaBold, size: 8, color: gray });
    drawTextRight('Qty', colQty + 20, y, { font: helveticaBold, size: 8, color: gray });
    drawTextRight('Rate', colRate + 30, y, { font: helveticaBold, size: 8, color: gray });
    drawTextRight('Amount', colAmt, y, { font: helveticaBold, size: 8, color: gray });
    y -= 22;

    for (const li of lineItems) {
      ensureSpace(22);

      // Separator line
      page.drawLine({ start: { x: margin, y: y + 12 }, end: { x: PAGE_W - margin, y: y + 12 }, thickness: 0.5, color: lightGray });

      // Truncate description to fit
      let desc = (li.description || '');
      const maxDescWidth = colDate - colDesc - 10;
      while (desc.length > 0 && helvetica.widthOfTextAtSize(desc.replace(/[^\x20-\x7E]/g, ''), 9) > maxDescWidth) {
        desc = desc.slice(0, -1);
      }
      if (desc.length < (li.description || '').length) desc += '...';

      drawText(desc, colDesc, y, { size: 9 });
      drawText(li.service_date ? formatDate(li.service_date) : '—', colDate, y, { size: 9, color: gray });
      drawTextRight(String(li.qty), colQty + 20, y, { size: 9 });
      drawTextRight(formatCurrency(li.unit_rate), colRate + 30, y, { size: 9 });
      drawTextRight(formatCurrency(li.line_total), colAmt, y, { font: helveticaBold, size: 9 });
      y -= 20;
    }

    if (lineItems.length === 0) {
      drawText('No line items', colDesc, y, { size: 9, color: gray });
      y -= 20;
    }

    y -= 8;

    // Separator
    page.drawLine({ start: { x: margin, y }, end: { x: PAGE_W - margin, y }, thickness: 1, color: lightGray });
    y -= 22;

    // === TOTALS ===
    ensureSpace(60);
    const totalsLabelX = 380;

    drawText('Subtotal', totalsLabelX, y, { size: 10, color: gray });
    drawTextRight(formatCurrency(invoice.total_amount), colAmt, y, { size: 10 });
    y -= 22;

    // Amount Due
    page.drawLine({ start: { x: totalsLabelX - 10, y: y + 14 }, end: { x: PAGE_W - margin, y: y + 14 }, thickness: 0.5, color: lightGray });
    drawText('Amount Due', totalsLabelX, y, { font: helveticaBold, size: 13 });
    drawTextRight(formatCurrency(invoice.balance_due), colAmt, y, { font: helveticaBold, size: 13, color: primary });
    y -= 30;

    // === NOTES ===
    if (invoice.notes) {
      ensureSpace(30);
      drawText('NOTES', margin, y, { font: helveticaBold, size: 8, color: gray });
      y -= 14;
      y = drawWrapped(invoice.notes, margin, y, pageWidth, { size: 9, color: gray });
    }

    // Page number on last page
    const pnText = pageNum > 1 ? `Page ${pageNum}` : '';
    if (pnText) {
      page.drawText(pnText, {
        x: PAGE_W / 2 - helvetica.widthOfTextAtSize(pnText, 8) / 2,
        y: 30, size: 8, font: helvetica, color: gray,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(invoice.invoice_number || 'invoice').replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
