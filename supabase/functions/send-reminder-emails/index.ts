import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { InvoiceReminderEmail } from '../_shared/email-templates/invoice-reminder.tsx'
import { ShiftReminderEmail } from '../_shared/email-templates/shift-reminder.tsx'
import { CredentialReminderEmail } from '../_shared/email-templates/credential-reminder.tsx'

const SITE_NAME = 'LocumOps'
const SENDER_DOMAIN = 'notify.locum-ops.com'
const FROM_DOMAIN = 'locum-ops.com'
const ROOT_DOMAIN = 'locum-ops.com'

const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ── Unsubscribe token helper ──
async function getOrCreateUnsubscribeToken(supabase: any, email: string): Promise<string> {
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', email)
    .is('used_at', null)
    .maybeSingle()

  if (existing?.token) return existing.token

  const token = crypto.randomUUID()
  await supabase.from('email_unsubscribe_tokens').insert({ email, token })
  return token
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
    // ── Resolve recipient email (shared across invoice + credential reminders) ──
    const { data: prefs } = await supabase
      .from('reminder_preferences')
      .select('reminder_email, email_enabled, phone_number, sms_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', userId)
      .maybeSingle()

    if (!prefs?.email_enabled) continue

    // Check quiet hours
    const now = new Date()
    if (prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
      const h = now.getHours()
      const m = now.getMinutes()
      const sendMin = h * 60 + m
      const [sh, sm] = prefs.quiet_hours_start.split(':').map(Number)
      const [eh, em] = prefs.quiet_hours_end.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      const inQuiet = startMin <= endMin
        ? sendMin >= startMin && sendMin < endMin
        : sendMin >= startMin || sendMin < endMin
      if (inQuiet) continue
    }

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

    // Get unsubscribe token for this recipient (reused across all reminders)
    const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, recipientEmail)

    // ── Load all category settings for this user ──
    const { data: allCatSettings } = await supabase
      .from('reminder_category_settings')
      .select('category, enabled, email_enabled, sms_enabled')
      .eq('user_id', userId)

    const getCatSetting = (category: string) =>
      allCatSettings?.find((c: any) => c.category === category)

    const siteUrl = `https://${ROOT_DOMAIN}`

    // ═══════════════════════════════════════════
    // SECTION 1: INVOICE REMINDERS
    // ═══════════════════════════════════════════
    const invoiceCat = getCatSetting('invoices')
    if (!invoiceCat || (invoiceCat.enabled && invoiceCat.email_enabled)) {
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

      if (!sentToday || sentToday.length === 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, total_amount, balance_due, due_date, facility_id, sent_at')
          .eq('user_id', userId)

        if (invoices && invoices.length > 0) {
          const facilityIds = [...new Set(invoices.map((i: any) => i.facility_id))]
          const { data: facilities } = await supabase
            .from('facilities')
            .select('id, name')
            .in('id', facilityIds)

          const getFacName = (id: string) => facilities?.find((f: any) => f.id === id)?.name || 'Unknown'

          // 1a) Draft invoices
          const drafts = invoices.filter((i: any) => i.status === 'draft')
          if (drafts.length > 0) {
            totalEnqueued += await enqueueDraftReminder(supabase, userId, recipientEmail, drafts, getFacName, siteUrl, now, unsubscribeToken)
          }

          // 1b) Overdue invoices
          const overdue = invoices.filter((i: any) => {
            if (i.status === 'paid' || i.status === 'draft') return false
            if (!i.due_date || !i.sent_at) return false
            return new Date(i.due_date) < now && i.balance_due > 0
          })

          for (const inv of overdue) {
            totalEnqueued += await enqueueOverdueReminder(supabase, userId, recipientEmail, inv, getFacName, siteUrl, now, unsubscribeToken)
            // SMS for overdue invoices (high urgency)
            await maybeSendSMS(supabase, userId, prefs, invoiceCat,
              `⚠️ Invoice ${inv.invoice_number} is overdue — $${inv.balance_due.toLocaleString()} outstanding at ${getFacName(inv.facility_id)}. Open LocumOps to follow up.`)
          }

          // 1c) Uninvoiced shifts
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

            const byFacility = new Map<string, typeof uninvoiced>()
            uninvoiced.forEach(s => {
              const arr = byFacility.get(s.facility_id) || []
              arr.push(s)
              byFacility.set(s.facility_id, arr)
            })

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
                 unsubscribe_token: unsubscribeToken,
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
      }
    }

    // ═══════════════════════════════════════════
    // SECTION 2: CREDENTIAL EXPIRATION REMINDERS
    // ═══════════════════════════════════════════
    const credCat = getCatSetting('credentials')
    if (!credCat || (credCat.enabled && credCat.email_enabled)) {
      const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

      const { data: credentials } = await supabase
        .from('credentials')
        .select('id, custom_title, expiration_date')
        .eq('user_id', userId)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', sixtyDaysOut.toISOString().split('T')[0])

      if (credentials && credentials.length > 0) {
        // Dedup window: 14 days per credential
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        for (const cred of credentials) {
          const expDate = new Date(cred.expiration_date)
          const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

          // Only remind for credentials expiring within 60 days (or already expired up to 7 days ago)
          if (daysRemaining < -7) continue

          // Check dedup
          const { data: existing } = await supabase
            .from('reminders')
            .select('id')
            .eq('user_id', userId)
            .eq('module', 'credentials')
            .eq('reminder_type', 'credential_expiration')
            .eq('channel', 'email')
            .eq('related_entity_id', cred.id)
            .gte('sent_at', fourteenDaysAgo.toISOString())
            .limit(1)

          if (existing && existing.length > 0) continue

          const formattedDate = expDate.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })

          const subject = daysRemaining <= 0
            ? `⚠️ ${cred.custom_title} has expired`
            : daysRemaining <= 14
              ? `⚠️ ${cred.custom_title} expires in ${daysRemaining} days`
              : `${cred.custom_title} expires on ${formattedDate}`

          const props = {
            siteName: SITE_NAME,
            siteUrl,
            credentialName: cred.custom_title,
            expirationDate: formattedDate,
            daysRemaining: Math.max(0, daysRemaining),
            actionUrl: `${siteUrl}/credentials`,
          }

          const html = await renderAsync(React.createElement(CredentialReminderEmail, props))
          const text = await renderAsync(React.createElement(CredentialReminderEmail, props), { plainText: true })
          const messageId = crypto.randomUUID()

          await supabase.from('reminders').insert({
            user_id: userId,
            module: 'credentials',
            reminder_type: 'credential_expiration',
            channel: 'email',
            title: subject,
            body: `${cred.custom_title} — ${daysRemaining <= 0 ? 'expired' : `${daysRemaining} days remaining`}`,
            related_entity_type: 'credential',
            related_entity_id: cred.id,
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
              label: 'credential_reminder',
              queued_at: now.toISOString(),
              unsubscribe_token: unsubscribeToken,
            },
          })

          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'credential_reminder_expiration',
            recipient_email: recipientEmail,
            status: 'pending',
          })

          totalEnqueued++

          // SMS for urgent credentials (≤14 days)
          if (daysRemaining <= 14) {
            const smsText = daysRemaining <= 0
              ? `⚠️ Your ${cred.custom_title} has expired. Renew ASAP to avoid gaps. — ${SITE_NAME}`
              : `⚠️ ${cred.custom_title} expires in ${daysRemaining} days (${formattedDate}). Start your renewal now. — ${SITE_NAME}`
            await maybeSendSMS(supabase, userId, prefs, credCat, smsText)
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, enqueued: totalEnqueued }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

// ── SMS helper ──
async function maybeSendSMS(
  supabase: any,
  userId: string,
  prefs: any,
  catSetting: any,
  message: string,
) {
  // Check global + category SMS enabled
  if (!prefs?.sms_enabled || !prefs?.phone_number) return
  if (catSetting && !catSetting.sms_enabled) return

  const twilioApiKey = Deno.env.get('TWILIO_API_KEY')
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')

  if (!twilioApiKey || !lovableApiKey || !twilioFrom) return

  try {
    await fetch(`${TWILIO_GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': twilioApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: prefs.phone_number,
        From: twilioFrom,
        Body: message,
      }),
    })
  } catch (e) {
    console.error('SMS send failed:', e)
  }
}

// ── Helper: enqueue draft invoice reminder ──
async function enqueueDraftReminder(
  supabase: any, userId: string, recipientEmail: string,
  drafts: any[], getFacName: (id: string) => string, siteUrl: string, now: Date, unsubscribeToken: string,
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
      idempotency_key: messageId, message_id: messageId, to: recipientEmail,
      from: `${SITE_NAME} <reminders@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
      subject, html, text, purpose: 'transactional', label: 'invoice_reminder',
      queued_at: now.toISOString(), unsubscribe_token: unsubscribeToken,
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
  inv: any, getFacName: (id: string) => string, siteUrl: string, now: Date, unsubscribeToken: string,
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
      idempotency_key: messageId, message_id: messageId, to: recipientEmail,
      from: `${SITE_NAME} <reminders@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
      subject, html, text, purpose: 'transactional', label: 'invoice_reminder',
      queued_at: now.toISOString(), unsubscribe_token: unsubscribeToken,
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
      idempotency_key: messageId, message_id: messageId, to: recipientEmail,
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
