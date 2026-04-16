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

interface ShiftReminderEmailProps {
  siteName: string
  siteUrl: string
  reminderType: 'uninvoiced'
  facilityName: string
  shiftCount?: number
  totalAmount?: string
  actionUrl: string
}

export const ShiftReminderEmail = ({
  siteName = 'LocumOps',
  facilityName,
  shiftCount,
  totalAmount,
  actionUrl,
}: ShiftReminderEmailProps) => {
  const previewText = `You worked ${shiftCount} shift${(shiftCount || 0) > 1 ? 's' : ''} at ${facilityName} — ready to invoice?`
  const heading = `Ready to invoice ${facilityName}?`
  const bodyText = `You worked ${shiftCount} shift${(shiftCount || 0) > 1 ? 's' : ''} at ${facilityName} totaling $${totalAmount}. Create an invoice to get paid faster.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{bodyText}</Text>
          <Button style={button} href={actionUrl}>
            Create Invoice
          </Button>
          <Text style={footer}>
            You're receiving this because you have email reminders enabled in your {siteName} settings.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ShiftReminderEmail

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
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
