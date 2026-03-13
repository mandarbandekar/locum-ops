/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InvoiceReminderEmailProps {
  siteName: string
  siteUrl: string
  reminderType: 'draft' | 'overdue'
  invoiceNumber?: string
  facilityName?: string
  amount?: string
  draftCount?: number
  totalAmount?: string
  actionUrl: string
}

export const InvoiceReminderEmail = ({
  siteName = 'LocumOps',
  siteUrl = '',
  reminderType,
  invoiceNumber,
  facilityName,
  amount,
  draftCount,
  totalAmount,
  actionUrl,
}: InvoiceReminderEmailProps) => {
  const isDraft = reminderType === 'draft'

  const previewText = isDraft
    ? draftCount && draftCount > 1
      ? `You have ${draftCount} invoice drafts ready to send`
      : `Invoice ${invoiceNumber} is ready to send`
    : `Invoice ${invoiceNumber} is overdue`

  const heading = isDraft
    ? draftCount && draftCount > 1
      ? `${draftCount} invoices ready to send`
      : 'Invoice draft ready to send'
    : 'Invoice overdue'

  const bodyText = isDraft
    ? draftCount && draftCount > 1
      ? `You have ${draftCount} invoice drafts totaling $${totalAmount} that are ready to review and send.`
      : `Invoice ${invoiceNumber} for $${amount} to ${facilityName} is ready to review and send.`
    : `Invoice ${invoiceNumber} for $${amount} to ${facilityName} is past due. The outstanding balance is $${amount}.`

  const buttonLabel = isDraft
    ? draftCount && draftCount > 1
      ? 'Review Invoices'
      : 'Review Invoice'
    : 'View Invoice'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{bodyText}</Text>
          <Button style={isDraft ? button : buttonOverdue} href={actionUrl}>
            {buttonLabel}
          </Button>
          <Text style={footer}>
            You're receiving this because you have email reminders enabled in your {siteName} settings.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InvoiceReminderEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 50%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: 'hsl(173, 58%, 39%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0.5rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const buttonOverdue = {
  backgroundColor: 'hsl(0, 72%, 51%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0.5rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
