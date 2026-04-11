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
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface DraftItem {
  invoiceNumber: string
  facilityName: string
  amount: string
}

interface OverdueItem {
  invoiceNumber: string
  facilityName: string
  amount: string
  daysOverdue: number
}

interface InvoiceDigestEmailProps {
  siteName: string
  siteUrl: string
  drafts: DraftItem[]
  overdue: OverdueItem[]
  actionUrl: string
}

export const InvoiceDigestEmail = ({
  siteName = 'LocumOps',
  siteUrl = '',
  drafts = [],
  overdue = [],
  actionUrl,
}: InvoiceDigestEmailProps) => {
  const hasDrafts = drafts.length > 0
  const hasOverdue = overdue.length > 0
  const draftTotal = drafts.reduce((s, d) => s + parseFloat(d.amount.replace(/,/g, '')), 0)
  const overdueTotal = overdue.reduce((s, o) => s + parseFloat(o.amount.replace(/,/g, '')), 0)

  const previewText = hasOverdue
    ? `${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}${hasDrafts ? ` + ${drafts.length} draft${drafts.length > 1 ? 's' : ''}` : ''}`
    : `${drafts.length} invoice draft${drafts.length > 1 ? 's' : ''} ready to send`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Invoice Summary</Heading>

          {hasOverdue && (
            <Section>
              <Section style={urgentBanner}>
                <Text style={bannerText}>⚠️ Overdue — ${overdueTotal.toLocaleString()}</Text>
              </Section>
              {overdue.map((inv, i) => (
                <Section key={i} style={itemRow}>
                  <Text style={itemTitle}>{inv.invoiceNumber} · {inv.facilityName}</Text>
                  <Text style={itemMeta}>${inv.amount} · {inv.daysOverdue} day{inv.daysOverdue !== 1 ? 's' : ''} overdue</Text>
                </Section>
              ))}
            </Section>
          )}

          {hasOverdue && hasDrafts && <Hr style={divider} />}

          {hasDrafts && (
            <Section>
              <Section style={infoBanner}>
                <Text style={bannerText}>📋 Ready to Send — ${draftTotal.toLocaleString()}</Text>
              </Section>
              {drafts.map((inv, i) => (
                <Section key={i} style={itemRow}>
                  <Text style={itemTitle}>{inv.invoiceNumber} · {inv.facilityName}</Text>
                  <Text style={itemMeta}>${inv.amount}</Text>
                </Section>
              ))}
            </Section>
          )}

          <Button style={hasOverdue ? buttonUrgent : button} href={actionUrl}>
            Review Invoices
          </Button>

          <Text style={footer}>
            You're receiving this because you have email reminders enabled in your {siteName} settings.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InvoiceDigestEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const urgentBanner = {
  backgroundColor: 'hsl(0, 45%, 96%)',
  borderRadius: '8px',
  padding: '8px 16px',
  marginBottom: '12px',
}
const infoBanner = {
  backgroundColor: 'hsl(181, 47%, 95%)',
  borderRadius: '8px',
  padding: '8px 16px',
  marginBottom: '12px',
}
const bannerText = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 25%)',
  margin: '0',
}
const itemRow = {
  padding: '6px 0',
}
const itemTitle = {
  fontSize: '14px',
  color: 'hsl(215, 25%, 15%)',
  margin: '0',
  fontWeight: '500' as const,
}
const itemMeta = {
  fontSize: '13px',
  color: 'hsl(215, 13%, 50%)',
  margin: '2px 0 0',
}
const divider = {
  borderColor: 'hsl(215, 13%, 90%)',
  margin: '20px 0',
}
const button = {
  backgroundColor: 'hsl(173, 58%, 39%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0.5rem',
  padding: '12px 20px',
  textDecoration: 'none',
  marginTop: '24px',
}
const buttonUrgent = {
  backgroundColor: 'hsl(0, 72%, 51%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0.5rem',
  padding: '12px 20px',
  textDecoration: 'none',
  marginTop: '24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
