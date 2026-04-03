import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { InvoiceReminderEmail } from '../_shared/email-templates/invoice-reminder.tsx'
import { ShiftReminderEmail } from '../_shared/email-templates/shift-reminder.tsx'

const SITE_NAME = 'LocumOps'
const SENDER_DOMAIN = 'notify.locum-ops.com'
const FROM_DOMAIN = 'locum-ops.com'
const ROOT_DOMAIN = 'locum-ops.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const apiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Check for direct payment_reminder mode (called from invoice detail page)
  let body: any = null
  try {
    body = await req.json()
  } catch {
    // No body — cron invocation
  }

  if (body?.mode === 'payment_reminder') {
    return await handlePaymentReminder(supabase, body, apiKey)
  }

  // ── Scheduled / cron mode ──
  let userIds: string[] = []

  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token)
    if (!claimsErr && claims?.claims?.sub) {
      userIds = [claims.claims.sub as string]
    }
  }

  if (userIds.length === 0) {
    const { data: prefs } = await supabase
      .from('reminder_preferences')
      .select('user_id')
      .eq('email_enabled', true)
    userIds = (prefs || []).map((p: any) => p.user_id)
  }

  if (userIds.length === 0) {
    return new Response(JSON.stringify({ processed: 0, reason: 'no_users' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let totalEnqueued = 0

  for (const userId of userIds) {
    const { data: catSetting } = await supabase
      .from('reminder_category_settings')
      .select('enabled, email_enabled')
      .eq('user_id', userId)
      .eq('category', 'invoices')
      .maybeSingle()

    if (catSetting && (!catSetting.enabled || !catSetting.email_enabled)) continue

    const { data: prefs } = await supabase
      .from('reminder_preferences')
      .select('reminder_email, email_enabled')
      .eq('user_id', userId)
      .maybeSingle()

    if (!prefs?.email_enabled) continue

    let recipientEmail = prefs.reminder_email
    if (!recipientEmail) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('invoice_email')
        .eq('user_id', userId)
        .maybeSingle()
      recipientEmail = profile?.invoice_email
    }
    if (!recipientEmail) {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      recipientEmail = user?.email
    }
    if (!recipientEmail) continue

    // Dedup: check if already sent today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: sentToday } = await supabase
      .from('reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('module', 'invoices')
      .eq('channel', 'email')
      .eq('status', 'sent')
      .gte('sent_at', todayStart.toISOString())
      .limit(1)

    if (sentToday && sentToday.length > 0) continue

    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount, balance_due, due_date, facility_id, sent_at')
      .eq('user_id', userId)

    if (!invoices || invoices.length === 0) continue

    const facilityIds = [...new Set(invoices.map((i: any) => i.facility_id))]
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .in('id', facilityIds)

    const getFacName = (id: string) => facilities?.find((f: any) => f.id === id)?.name || 'Unknown'
    const siteUrl = `https://${ROOT_DOMAIN}`
    const now = new Date()

    // 1) Draft invoices
    const drafts = invoices.filter((i: any) => i.status === 'draft')
    if (drafts.length > 0) {
      totalEnqueued += await enqueueDraftReminder(supabase, userId, recipientEmail, drafts, getFacName, siteUrl, now)
    }

    // 2) Overdue invoices
    const overdue = invoices.filter((i: any) => {
      if (i.status === 'paid' || i.status === 'draft') return false
      if (!i.due_date || !i.sent_at) return false
      return new Date(i.due_date) < now && i.balance_due > 0
    })

    for (const inv of overdue) {
      totalEnqueued += await enqueueOverdueReminder(supabase, userId, recipientEmail, inv, getFacName, siteUrl, now)
    }

    // 3) Uninvoiced shifts
    const { data: allShifts } = await supabase
      .from('shifts')
      .select('id, facility_id, start_datetime, end_datetime, rate_applied')
      .eq('user_id', userId)

    const { data: allLineItems } = await supabase
      .from('invoice_line_items')
      .select('shift_id')
      .eq('user_id', userId)

    if (allShifts && allLineItems) {
      const invoicedShiftIds = new Set(
        (allLineItems as any[]).filter(li => li.shift_id).map(li => li.shift_id)
      )
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const uninvoiced = (allShifts as any[]).filter(s => {
        const endDate = new Date(s.end_datetime)
        return endDate < cutoff && !invoicedShiftIds.has(s.id)
      })

      // Group by facility
      const byFacility = new Map<string, typeof uninvoiced>()
      uninvoiced.forEach(s => {
        const arr = byFacility.get(s.facility_id) || []
        arr.push(s)
        byFacility.set(s.facility_id, arr)
      })

      // Check dedup for uninvoiced reminders (once per facility per week)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      for (const [facilityId, facilityShifts] of byFacility) {
        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('user_id', userId)
          .eq('module', 'invoices')
          .eq('reminder_type', 'uninvoiced_shifts')
          .eq('channel', 'email')
          .eq('related_entity_id', facilityId)
          .gte('sent_at', weekAgo.toISOString())
          .limit(1)

        if (existingReminder && existingReminder.length > 0) continue

        const count = facilityShifts.length
        const total = facilityShifts.reduce((s: number, sh: any) => s + (sh.rate_applied || 0), 0)
        const name = getFacName(facilityId)

        const subject = `Ready to invoice ${count} shift${count > 1 ? 's' : ''} at ${name}?`
        const props = {
          siteName: SITE_NAME,
          siteUrl,
          reminderType: 'uninvoiced' as const,
          facilityName: name,
          shiftCount: count,
          totalAmount: total.toLocaleString(),
          actionUrl: `${siteUrl}/invoices`,
        }

        const html = await renderAsync(React.createElement(ShiftReminderEmail, props))
        const text = await renderAsync(React.createElement(ShiftReminderEmail, props), { plainText: true })
        const messageId = crypto.randomUUID()

        await supabase.from('reminders').insert({
          user_id: userId,
          module: 'invoices',
          reminder_type: 'uninvoiced_shifts',
          channel: 'email',
          title: subject,
          body: `$${total.toLocaleString()} across ${count} shifts at ${name}`,
          related_entity_type: 'facility',
          related_entity_id: facilityId,
          send_at: now.toISOString(),
          status: 'sent',
          sent_at: now.toISOString(),
        })

        await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            idempotency_key: messageId,
            message_id: messageId,
            to: recipientEmail,
            from: `${SITE_NAME} <reminders@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: 'shift_reminder',
            queued_at: now.toISOString(),
          },
        })

        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'shift_reminder_uninvoiced',
          recipient_email: recipientEmail,
          status: 'pending',
        })

        totalEnqueued++
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, enqueued: totalEnqueued }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

// ── Helper: enqueue draft invoice reminder ──
async function enqueueDraftReminder(
  supabase: any, userId: string, recipientEmail: string,
  drafts: any[], getFacName: (id: string) => string, siteUrl: string, now: Date,
): Promise<number> {
  let props: any
  let subject: string
  let entityId: string | null = null

  if (drafts.length === 1) {
    const inv = drafts[0]
    entityId = inv.id
    subject = `Send invoice ${inv.invoice_number}`
    props = {
      siteName: SITE_NAME, siteUrl, reminderType: 'draft',
      invoiceNumber: inv.invoice_number, facilityName: getFacName(inv.facility_id),
      amount: inv.total_amount.toLocaleString(), actionUrl: `${siteUrl}/invoices/${inv.id}`,
    }
  } else {
    subject = `${drafts.length} invoice drafts ready to send`
    props = {
      siteName: SITE_NAME, siteUrl, reminderType: 'draft',
      draftCount: drafts.length,
      totalAmount: drafts.reduce((s: number, i: any) => s + i.total_amount, 0).toLocaleString(),
      actionUrl: `${siteUrl}/invoices`,
    }
  }

  const html = await renderAsync(React.createElement(InvoiceReminderEmail, props))
  const text = await renderAsync(React.createElement(InvoiceReminderEmail, props), { plainText: true })
  const messageId = crypto.randomUUID()

  await supabase.from('reminders').insert({
    user_id: userId, module: 'invoices', reminder_type: 'invoice_draft_unsent',
    channel: 'email', title: subject,
    body: props.draftCount ? `$${props.totalAmount} total across ${props.draftCount} drafts` : `$${props.amount} to ${props.facilityName}`,
    related_entity_type: entityId ? 'invoice' : null, related_entity_id: entityId,
    send_at: now.toISOString(), status: 'sent', sent_at: now.toISOString(),
  })

  await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      run_id: crypto.randomUUID(), message_id: messageId, to: recipientEmail,
      from: `${SITE_NAME} <reminders@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
      subject, html, text, purpose: 'transactional', label: 'invoice_reminder',
      queued_at: now.toISOString(),
    },
  })

  await supabase.from('email_send_log').insert({
    message_id: messageId, template_name: 'invoice_reminder_draft',
    recipient_email: recipientEmail, status: 'pending',
  })

  return 1
}

// ── Helper: enqueue overdue invoice reminder ──
async function enqueueOverdueReminder(
  supabase: any, userId: string, recipientEmail: string,
  inv: any, getFacName: (id: string) => string, siteUrl: string, now: Date,
): Promise<number> {
  const subject = `Invoice ${inv.invoice_number} is overdue`
  const props = {
    siteName: SITE_NAME, siteUrl, reminderType: 'overdue' as const,
    invoiceNumber: inv.invoice_number, facilityName: getFacName(inv.facility_id),
    amount: inv.balance_due.toLocaleString(), actionUrl: `${siteUrl}/invoices/${inv.id}`,
  }

  const html = await renderAsync(React.createElement(InvoiceReminderEmail, props))
  const text = await renderAsync(React.createElement(InvoiceReminderEmail, props), { plainText: true })
  const messageId = crypto.randomUUID()

  await supabase.from('reminders').insert({
    user_id: userId, module: 'invoices', reminder_type: 'invoice_overdue',
    channel: 'email', title: subject,
    body: `$${inv.balance_due.toLocaleString()} outstanding · ${getFacName(inv.facility_id)}`,
    related_entity_type: 'invoice', related_entity_id: inv.id,
    send_at: now.toISOString(), status: 'sent', sent_at: now.toISOString(),
  })

  await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      run_id: crypto.randomUUID(), message_id: messageId, to: recipientEmail,
      from: `${SITE_NAME} <reminders@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
      subject, html, text, purpose: 'transactional', label: 'invoice_reminder',
      queued_at: now.toISOString(),
    },
  })

  await supabase.from('email_send_log').insert({
    message_id: messageId, template_name: 'invoice_reminder_overdue',
    recipient_email: recipientEmail, status: 'pending',
  })

  return 1
}

// ── Payment reminder mode (called from invoice detail) ──
async function handlePaymentReminder(supabase: any, body: any, apiKey: string) {
  const { invoice_id, user_id } = body

  if (!invoice_id || !user_id) {
    return new Response(JSON.stringify({ error: 'Missing invoice_id or user_id' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, facility_id, total_amount, balance_due, due_date, billing_email_to')
    .eq('id', invoice_id)
    .eq('user_id', user_id)
    .single()

  if (!invoice) {
    return new Response(JSON.stringify({ error: 'Invoice not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: facility } = await supabase
    .from('facilities')
    .select('name, invoice_email_to')
    .eq('id', invoice.facility_id)
    .single()

  const recipientEmail = invoice.billing_email_to || facility?.invoice_email_to
  if (!recipientEmail) {
    return new Response(JSON.stringify({ error: 'No billing email configured' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, company_name')
    .eq('user_id', user_id)
    .maybeSingle()

  const senderName = userProfile
    ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.company_name || 'Your relief vet'
    : 'Your relief vet'

  const siteUrl = `https://${ROOT_DOMAIN}`
  const now = new Date()

  const subject = `Payment reminder: Invoice ${invoice.invoice_number}`
  const props = {
    siteName: SITE_NAME, siteUrl, reminderType: 'overdue' as const,
    invoiceNumber: invoice.invoice_number,
    facilityName: facility?.name || 'your clinic',
    amount: invoice.balance_due.toLocaleString(),
    actionUrl: invoice.share_token ? `${siteUrl}/invoice/${invoice.share_token}` : `${siteUrl}/invoices/${invoice.id}`,
  }

  const html = await renderAsync(React.createElement(InvoiceReminderEmail, props))
  const text = await renderAsync(React.createElement(InvoiceReminderEmail, props), { plainText: true })
  const messageId = crypto.randomUUID()

  await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      run_id: crypto.randomUUID(), message_id: messageId, to: recipientEmail,
      from: `${senderName} via ${SITE_NAME} <reminders@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN, subject, html, text,
      purpose: 'transactional', label: 'payment_reminder',
      queued_at: now.toISOString(),
    },
  })

  await supabase.from('email_send_log').insert({
    message_id: messageId, template_name: 'payment_reminder',
    recipient_email: recipientEmail, status: 'pending',
  })

  await supabase.from('reminders').insert({
    user_id, module: 'invoices', reminder_type: 'payment_reminder_to_clinic',
    channel: 'email', title: subject,
    body: `Sent to ${recipientEmail} for $${invoice.balance_due.toLocaleString()}`,
    related_entity_type: 'invoice', related_entity_id: invoice_id,
    send_at: now.toISOString(), status: 'sent', sent_at: now.toISOString(),
  })

  // Log to email_logs for audit
  await supabase.from('email_logs').insert({
    user_id, facility_id: invoice.facility_id, type: 'reminder',
    subject, body: `Payment reminder for ${invoice.invoice_number}`,
    recipients: recipientEmail,
  })

  return new Response(
    JSON.stringify({ success: true, sent_to: recipientEmail }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
