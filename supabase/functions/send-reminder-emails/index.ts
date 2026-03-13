import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { InvoiceReminderEmail } from '../_shared/email-templates/invoice-reminder.tsx'

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

  // Determine which user to process. If called with auth, process that user.
  // If called by cron (no auth), process all users with email enabled.
  let userIds: string[] = []

  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    // Try to get user from anon key + JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token)
    if (!claimsErr && claims?.claims?.sub) {
      userIds = [claims.claims.sub as string]
    }
  }

  // If no specific user (cron invocation), get all users with email reminders enabled
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
    // Check user has invoice email reminders enabled
    const { data: catSetting } = await supabase
      .from('reminder_category_settings')
      .select('enabled, email_enabled')
      .eq('user_id', userId)
      .eq('category', 'invoices')
      .maybeSingle()

    if (catSetting && (!catSetting.enabled || !catSetting.email_enabled)) continue

    // Get reminder email address
    const { data: prefs } = await supabase
      .from('reminder_preferences')
      .select('reminder_email, email_enabled')
      .eq('user_id', userId)
      .maybeSingle()

    if (!prefs?.email_enabled) continue

    // Fall back to auth email if no reminder_email set
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
      // Last resort: get from auth.users via service role
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      recipientEmail = user?.email
    }
    if (!recipientEmail) continue

    // Check if we already sent a reminder today for this user (dedup)
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

    // Get invoices for this user
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount, balance_due, due_date, facility_id, sent_at')
      .eq('user_id', userId)

    if (!invoices || invoices.length === 0) continue

    // Get facilities for names
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
      let props: any
      let subject: string
      let entityId: string | null = null

      if (drafts.length === 1) {
        const inv = drafts[0]
        entityId = inv.id
        subject = `Send invoice ${inv.invoice_number}`
        props = {
          siteName: SITE_NAME,
          siteUrl,
          reminderType: 'draft',
          invoiceNumber: inv.invoice_number,
          facilityName: getFacName(inv.facility_id),
          amount: inv.total_amount.toLocaleString(),
          actionUrl: `${siteUrl}/invoices/${inv.id}`,
        }
      } else {
        subject = `${drafts.length} invoice drafts ready to send`
        props = {
          siteName: SITE_NAME,
          siteUrl,
          reminderType: 'draft',
          draftCount: drafts.length,
          totalAmount: drafts.reduce((s: number, i: any) => s + i.total_amount, 0).toLocaleString(),
          actionUrl: `${siteUrl}/invoices`,
        }
      }

      const html = await renderAsync(React.createElement(InvoiceReminderEmail, props))
      const text = await renderAsync(React.createElement(InvoiceReminderEmail, props), { plainText: true })
      const messageId = crypto.randomUUID()

      // Insert reminder record
      await supabase.from('reminders').insert({
        user_id: userId,
        module: 'invoices',
        reminder_type: 'invoice_draft_unsent',
        channel: 'email',
        title: subject,
        body: props.draftCount
          ? `$${props.totalAmount} total across ${props.draftCount} drafts`
          : `$${props.amount} to ${props.facilityName}`,
        related_entity_type: entityId ? 'invoice' : null,
        related_entity_id: entityId,
        send_at: now.toISOString(),
        status: 'sent',
        sent_at: now.toISOString(),
      })

      // Enqueue email
      await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          run_id: crypto.randomUUID(),
          message_id: messageId,
          to: recipientEmail,
          from: `${SITE_NAME} <reminders@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: 'transactional',
          label: 'invoice_reminder',
          queued_at: now.toISOString(),
        },
      })

      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'invoice_reminder_draft',
        recipient_email: recipientEmail,
        status: 'pending',
      })

      totalEnqueued++
    }

    // 2) Overdue invoices
    const overdue = invoices.filter((i: any) => {
      if (i.status === 'paid' || i.status === 'draft') return false
      if (!i.due_date || !i.sent_at) return false
      return new Date(i.due_date) < now && i.balance_due > 0
    })

    for (const inv of overdue) {
      const subject = `Invoice ${inv.invoice_number} is overdue`
      const props = {
        siteName: SITE_NAME,
        siteUrl,
        reminderType: 'overdue' as const,
        invoiceNumber: inv.invoice_number,
        facilityName: getFacName(inv.facility_id),
        amount: inv.balance_due.toLocaleString(),
        actionUrl: `${siteUrl}/invoices/${inv.id}`,
      }

      const html = await renderAsync(React.createElement(InvoiceReminderEmail, props))
      const text = await renderAsync(React.createElement(InvoiceReminderEmail, props), { plainText: true })
      const messageId = crypto.randomUUID()

      await supabase.from('reminders').insert({
        user_id: userId,
        module: 'invoices',
        reminder_type: 'invoice_overdue',
        channel: 'email',
        title: subject,
        body: `$${inv.balance_due.toLocaleString()} outstanding · ${getFacName(inv.facility_id)}`,
        related_entity_type: 'invoice',
        related_entity_id: inv.id,
        send_at: now.toISOString(),
        status: 'sent',
        sent_at: now.toISOString(),
      })

      await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          run_id: crypto.randomUUID(),
          message_id: messageId,
          to: recipientEmail,
          from: `${SITE_NAME} <reminders@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: 'transactional',
          label: 'invoice_reminder',
          queued_at: now.toISOString(),
        },
      })

      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'invoice_reminder_overdue',
        recipient_email: recipientEmail,
        status: 'pending',
      })

      totalEnqueued++
    }
  }

  return new Response(
    JSON.stringify({ success: true, enqueued: totalEnqueued }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
