import type { EmailTone } from '@/contexts/UserProfileContext';

const TONE_INTROS: Record<EmailTone, { greeting: string; closing: string }> = {
  friendly: {
    greeting: 'Hi {{contact_name}}! 😊',
    closing: 'Warmly,\nYour Locum Clinician',
  },
  neutral: {
    greeting: 'Hi {{contact_name}},',
    closing: 'Best regards,\nYour Locum Clinician',
  },
  direct: {
    greeting: '{{contact_name}},',
    closing: 'Regards,\nYour Locum Clinician',
  },
};

export function getOutreachTemplate(tone: EmailTone = 'neutral') {
  const t = TONE_INTROS[tone];
  return `${t.greeting}

I hope this message finds you well! I'm reaching out to let you know about my availability for locum shifts in {{month}} {{year}}.

I'd love to continue supporting {{facility_name}} and am happy to discuss scheduling that works best for your team.

Please let me know if you have any upcoming needs — I'm flexible with both weekday and weekend shifts.

${t.closing}`;
}

export function getConfirmationTemplate(tone: EmailTone = 'neutral') {
  const t = TONE_INTROS[tone];
  return `${t.greeting}

I'm writing to confirm my upcoming shifts at {{facility_name}} for {{month}} {{year}}:

{{shift_list}}

Please let me know if any changes are needed. Looking forward to working with your team!

${t.closing}`;
}

export function getInvoiceTemplate(tone: EmailTone = 'neutral') {
  const t = TONE_INTROS[tone];
  return `${t.greeting}

Please find the attached invoice {{invoice_number}} for locum services provided at {{facility_name}} from {{period_start}} to {{period_end}}.

Invoice Total: \${{total_amount}}
Due Date: {{due_date}}

Payment can be made via check or bank transfer. Please don't hesitate to reach out with any questions.

Thank you for your continued partnership!

${t.closing}`;
}

// Legacy exports for backward compat
export const outreachTemplate = getOutreachTemplate('neutral');
export const confirmationTemplate = getConfirmationTemplate('neutral');
export const invoiceTemplate = getInvoiceTemplate('neutral');
