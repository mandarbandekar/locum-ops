import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { InvoiceSendEmail } from '../_shared/email-templates/invoice-send.tsx'

const SITE_NAME = 'LocumOps'
const SENDER_DOMAIN = 'notify.locum-ops.com'
const FROM_DOMAIN = 'locum-ops.com'
const ROOT_DOMAIN = 'locum-ops.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function fmtMoney(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  return (v || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtDate(d: string | null | undefined): string | undefined {
  if (!d) return undefined
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return undefined
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceKey)

  // ── Parse + validate body ──
  let body: {
    invoice_id?: string
    user_id?: string
    custom_subject?: string
    custom_body?: string
    cc_sender?: boolean
    mode?: 'initial' | 'followup'
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { invoice_id, user_id, custom_subject, custom_body, cc_sender, mode } = body
  const isFollowup = mode === 'followup'

  if (!invoice_id || !user_id) {
    return new Response(
      JSON.stringify({ error: 'invoice_id and user_id are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── 1. Fetch invoice ──
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(
        'id, invoice_number, facility_id, total_amount, balance_due, due_date, invoice_date, billing_email_to, share_token, share_token_created_at, share_token_revoked_at, notes, status'
      )
      .eq('id', invoice_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (invoiceError) {
      console.error('Invoice fetch error', invoiceError)
      return new Response(JSON.stringify({ error: 'Failed to fetch invoice' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Fetch facility ──
    const { data: facility } = await supabase
      .from('facilities')
      .select('name, invoice_email_to, address')
      .eq('id', invoice.facility_id)
      .maybeSingle()

    if (!facility) {
      return new Response(JSON.stringify({ error: 'Facility not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Determine recipient email ──
    const recipientEmail =
      (invoice.billing_email_to && invoice.billing_email_to.trim()) ||
      (facility.invoice_email_to && facility.invoice_email_to.trim()) ||
      ''

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'No billing email configured for this facility' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Fetch user profile ──
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, company_name, invoice_email, invoice_phone')
      .eq('user_id', user_id)
      .maybeSingle()

    // ── 5. Fetch auth email ──
    const { data: authData } = await supabase.auth.admin.getUserById(user_id)
    const userAuthEmail = authData?.user?.email || profile?.invoice_email || ''

    // ── 6. Build sender display ──
    const fullName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
      'Your relief veterinarian'
    const senderBusinessName = (profile?.company_name && profile.company_name.trim()) || fullName
    const senderDisplayName = senderBusinessName

    // ── 7. Ensure active share token ──
    let shareToken = invoice.share_token
    const tokenIsActive = shareToken && !invoice.share_token_revoked_at
    if (!tokenIsActive) {
      shareToken = crypto.randomUUID()
      const { error: tokenErr } = await supabase
        .from('invoices')
        .update({
          share_token: shareToken,
          share_token_created_at: new Date().toISOString(),
          share_token_revoked_at: null,
        })
        .eq('id', invoice.id)
        .eq('user_id', user_id)

      if (tokenErr) {
        console.error('Failed to set share token', tokenErr)
        return new Response(JSON.stringify({ error: 'Failed to generate share link' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── 8/9. Build URLs ──
    const viewInvoiceUrl = `https://${ROOT_DOMAIN}/invoice/public/${shareToken}`
    const downloadPdfUrl = `${supabaseUrl}/functions/v1/generate-invoice-pdf?token=${shareToken}`

    // ── 10. Render template ──
    const templateProps = {
      senderName: fullName,
      senderBusinessName,
      facilityName: facility.name,
      invoiceNumber: invoice.invoice_number,
      totalAmount: fmtMoney(invoice.balance_due ?? invoice.total_amount),
      dueDate: fmtDate(invoice.due_date),
      invoiceDate: fmtDate(invoice.invoice_date),
      viewInvoiceUrl,
      downloadPdfUrl,
      customBody: custom_body,
      senderEmail: userAuthEmail,
      senderPhone: profile?.invoice_phone || undefined,
    }

    const html = await renderAsync(React.createElement(InvoiceSendEmail, templateProps))
    const text = await renderAsync(
      React.createElement(InvoiceSendEmail, templateProps),
      { plainText: true }
    )

    const subject =
      (custom_subject && custom_subject.trim()) ||
      `Invoice ${invoice.invoice_number} from ${senderBusinessName}`

    // ── 11. Build From header ──
    const fromAddress = `${senderDisplayName} via ${SITE_NAME} <invoices@${FROM_DOMAIN}>`

    // ── 12. Enqueue primary email ──
    const messageId = crypto.randomUUID()

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'invoice_send',
      recipient_email: recipientEmail,
      status: 'pending',
    })

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipientEmail,
        from: fromAddress,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: 'invoice_send',
        reply_to: userAuthEmail || undefined,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue invoice email', enqueueError)
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'invoice_send',
        recipient_email: recipientEmail,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Optional CC to sender ──
    if (cc_sender && userAuthEmail) {
      const copyId = crypto.randomUUID()
      await supabase.from('email_send_log').insert({
        message_id: copyId,
        template_name: 'invoice_send_copy',
        recipient_email: userAuthEmail,
        status: 'pending',
      })
      await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: copyId,
          to: userAuthEmail,
          from: fromAddress,
          sender_domain: SENDER_DOMAIN,
          subject: `[Copy] ${subject}`,
          html,
          text,
          purpose: 'transactional',
          label: 'invoice_send_copy',
          queued_at: new Date().toISOString(),
        },
      })
    }

    // ── 13. Update invoice status / sent_at ──
    const updatedStatus = invoice.status === 'draft' ? 'sent' : invoice.status
    const updatePayload: Record<string, any> = {
      sent_at: new Date().toISOString(),
    }
    if (invoice.status === 'draft') {
      updatePayload.status = 'sent'
    }
    await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoice.id)
      .eq('user_id', user_id)

    // ── 14. Activity logs ──
    await supabase.from('invoice_activity').insert({
      invoice_id: invoice.id,
      user_id,
      action: isFollowup ? 'followup_sent' : 'invoice_sent',
      description: isFollowup
        ? `Follow-up sent to ${recipientEmail}`
        : `Invoice sent to ${recipientEmail}`,
    })

    await supabase.from('email_logs').insert({
      user_id,
      facility_id: invoice.facility_id,
      type: isFollowup ? 'invoice_followup' : 'invoice',
      subject,
      body: text,
      recipients: recipientEmail,
    })

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: recipientEmail,
        invoice_status: updatedStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-invoice-to-clinic error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
