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
  Section,
} from 'npm:@react-email/components@0.0.22'

interface CredentialReminderEmailProps {
  siteName: string
  siteUrl: string
  credentialName: string
  expirationDate: string
  daysRemaining: number
  actionUrl: string
}

export const CredentialReminderEmail = ({
  siteName = 'LocumOps',
  siteUrl = '',
  credentialName,
  expirationDate,
  daysRemaining,
  actionUrl,
}: CredentialReminderEmailProps) => {
  const isUrgent = daysRemaining <= 14
  const previewText = daysRemaining <= 0
    ? `${credentialName} has expired`
    : `${credentialName} expires in ${daysRemaining} days`

  const heading = daysRemaining <= 0
    ? `${credentialName} has expired`
    : isUrgent
      ? `${credentialName} expires in ${daysRemaining} days`
      : `${credentialName} renewal coming up`

  const bodyText = daysRemaining <= 0
    ? `Your ${credentialName} expired on ${expirationDate}. Renew it as soon as possible to avoid gaps in your credentialing.`
    : isUrgent
      ? `Your ${credentialName} expires on ${expirationDate} — that's only ${daysRemaining} days away. Start your renewal now to avoid any lapse.`
      : `Your ${credentialName} expires on ${expirationDate} (${daysRemaining} days from now). Now is a good time to begin the renewal process.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={isUrgent ? urgentBanner : infoBanner}>
            <Text style={bannerText}>
              {isUrgent ? '⚠️ Action Required' : '📋 Upcoming Renewal'}
            </Text>
          </Section>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{bodyText}</Text>
          <Section style={detailBox}>
            <Text style={detailLabel}>Credential</Text>
            <Text style={detailValue}>{credentialName}</Text>
            <Text style={detailLabel}>Expiration Date</Text>
            <Text style={detailValue}>{expirationDate}</Text>
            <Text style={detailLabel}>Days Remaining</Text>
            <Text style={detailValue}>{daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days`}</Text>
          </Section>
          <Button style={isUrgent ? buttonUrgent : button} href={actionUrl}>
            View Credentials
          </Button>
          <Text style={footer}>
            You're receiving this because you have credential reminders enabled in your {siteName} settings.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default CredentialReminderEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const urgentBanner = {
  backgroundColor: 'hsl(0, 45%, 96%)',
  borderRadius: '8px',
  padding: '8px 16px',
  marginBottom: '16px',
}
const infoBanner = {
  backgroundColor: 'hsl(181, 47%, 95%)',
  borderRadius: '8px',
  padding: '8px 16px',
  marginBottom: '16px',
}
const bannerText = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 25%)',
  margin: '0',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 50%)',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const detailBox = {
  backgroundColor: 'hsl(150, 14%, 95%)',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
}
const detailLabel = {
  fontSize: '11px',
  fontWeight: '600' as const,
  color: 'hsl(199, 11%, 45%)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 2px',
}
const detailValue = {
  fontSize: '14px',
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 12px',
}
const button = {
  backgroundColor: 'hsl(181, 47%, 33%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0.5rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const buttonUrgent = {
  backgroundColor: 'hsl(0, 72%, 51%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0.5rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
