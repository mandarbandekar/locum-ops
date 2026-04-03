import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
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

/**
 * Shift-end pre-reminder: runs every minute via pg_cron.
 * Finds shifts ending within the next 60-65 minutes and sends
 * email (and SMS when Twilio is configured) reminders.
 */
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
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000) // 65 min window
  const siteUrl = `https://${ROOT_DOMAIN}`

  // Find shifts ending soon
  const { data: shifts, error: shiftErr } = await supabase
    .from('shifts')
    .select('id, user_id, facility_id, end_datetime, rate_applied')
    .gt('end_datetime', now.toISOString())
    .lte('end_datetime', windowEnd.toISOString())

  if (shiftErr || !shifts || shifts.length === 0) {
    return new Response(JSON.stringify({ processed: 0, reason: shifts ? 'no_shifts' : shiftErr?.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let totalSent = 0

  for (const shift of shifts) {
    const userId = shift.user_id

    // Check dedup: already sent for this shift?
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('reminder_type', 'shift_ending_soon')
      .eq('related_entity_id', shift.id)
      .eq('status', 'sent')
      .limit(1)

    if (existing && existing.length > 0) continue

    // Check user preferences
    const { data: catSetting } = await supabase
      .from('reminder_category_settings')
      .select('enabled, email_enabled, sms_enabled')
      .eq('user_id', userId)
      .eq('category', 'shifts')
      .maybeSingle()

    if (catSetting && !catSetting.enabled) continue

    const emailEnabled = !catSetting || catSetting.email_enabled
    const smsEnabled = catSetting?.sms_enabled || false

    // Get user email
    const { data: prefs } = await supabase
      .from('reminder_preferences')
      .select('reminder_email, email_enabled, phone_number, sms_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', userId)
      .maybeSingle()

    // Check quiet hours
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

    // Get facility name
    const { data: facility } = await supabase
      .from('facilities')
      .select('name')
      .eq('id', shift.facility_id)
      .single()

    const facilityName = facility?.name || 'your clinic'
    const endTime = new Date(shift.end_datetime)
    const endTimeStr = endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    // Email
    if (emailEnabled && prefs?.email_enabled !== false) {
      let recipientEmail = prefs?.reminder_email
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

      if (recipientEmail) {
        const subject = `Your shift at ${facilityName} ends at ${endTimeStr}`
        const props = {
          siteName: SITE_NAME,
          siteUrl,
          reminderType: 'shift_ending' as const,
          facilityName,
          shiftEndTime: endTimeStr,
          actionUrl: `${siteUrl}/schedule`,
        }

        const html = await renderAsync(React.createElement(ShiftReminderEmail, props))
        const text = await renderAsync(React.createElement(ShiftReminderEmail, props), { plainText: true })
        const messageId = crypto.randomUUID()

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
            label: 'shift_reminder',
            queued_at: now.toISOString(),
          },
        })

        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'shift_reminder_ending',
          recipient_email: recipientEmail,
          status: 'pending',
        })
      }
    }

    // SMS (Twilio) — only if configured
    if (smsEnabled && prefs?.sms_enabled && prefs?.phone_number) {
      const twilioApiKey = Deno.env.get('TWILIO_API_KEY')
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

      if (twilioApiKey && lovableApiKey) {
        try {
          const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'
          const smsBody = `Your shift at ${facilityName} ends at ${endTimeStr}. Your invoice will be auto-generated. — ${SITE_NAME}`

          const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER') || ''
          if (twilioFrom) {
            await fetch(`${GATEWAY_URL}/Messages.json`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'X-Connection-Api-Key': twilioApiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: prefs.phone_number,
                From: twilioFrom,
                Body: smsBody,
              }),
            })
          }
        } catch (e) {
          console.error('SMS send failed:', e)
        }
      }
    }

    // Record the reminder
    await supabase.from('reminders').insert({
      user_id: userId,
      module: 'shifts',
      reminder_type: 'shift_ending_soon',
      channel: 'email',
      title: `Shift at ${facilityName} ends at ${endTimeStr}`,
      body: 'Your invoice will be auto-generated',
      related_entity_type: 'shift',
      related_entity_id: shift.id,
      send_at: now.toISOString(),
      status: 'sent',
      sent_at: now.toISOString(),
    })

    totalSent++
  }

  return new Response(
    JSON.stringify({ success: true, sent: totalSent }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
