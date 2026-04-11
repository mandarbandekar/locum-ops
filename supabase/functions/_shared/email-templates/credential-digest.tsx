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

interface CredentialItem {
  credentialName: string
  expirationDate: string
  daysRemaining: number
}

interface CredentialDigestEmailProps {
  siteName: string
  siteUrl: string
  urgent: CredentialItem[]
  upcoming: CredentialItem[]
  actionUrl: string
}

export const CredentialDigestEmail = ({
  siteName = 'LocumOps',
  siteUrl = '',
  urgent = [],
  upcoming = [],
  actionUrl,
}: CredentialDigestEmailProps) => {
  const hasUrgent = urgent.length > 0
  const hasUpcoming = upcoming.length > 0
  const total = urgent.length + upcoming.length

  const previewText = hasUrgent
    ? `${urgent.length} credential${urgent.length > 1 ? 's' : ''} need${urgent.length === 1 ? 's' : ''} urgent attention`
    : `${upcoming.length} credential renewal${upcoming.length > 1 ? 's' : ''} coming up`

  const formatDays = (d: number) =>
    d <= 0 ? 'Expired' : d === 1 ? '1 day left' : `${d} days left`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Credentials Summary</Heading>
          <Text style={subtitle}>{total} credential{total > 1 ? 's' : ''} need your attention</Text>

          {hasUrgent && (
            <Section>
              <Section style={urgentBanner}>
                <Text style={bannerText}>⚠️ Action Required</Text>
              </Section>
              {urgent.map((cred, i) => (
                <Section key={i} style={itemRow}>
                  <Text style={itemTitle}>{cred.credentialName}</Text>
                  <Text style={itemMeta}>
                    {cred.daysRemaining <= 0 ? `Expired on ${cred.expirationDate}` : `Expires ${cred.expirationDate}`} · {formatDays(cred.daysRemaining)}
                  </Text>
                </Section>
              ))}
            </Section>
          )}

          {hasUrgent && hasUpcoming && <Hr style={divider} />}

          {hasUpcoming && (
            <Section>
              <Section style={infoBanner}>
                <Text style={bannerText}>📋 Upcoming Renewals</Text>
              </Section>
              {upcoming.map((cred, i) => (
                <Section key={i} style={itemRow}>
                  <Text style={itemTitle}>{cred.credentialName}</Text>
                  <Text style={itemMeta}>Expires {cred.expirationDate} · {formatDays(cred.daysRemaining)}</Text>
                </Section>
              ))}
            </Section>
          )}

          <Button style={hasUrgent ? buttonUrgent : button} href={actionUrl}>
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

export default CredentialDigestEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 8px',
}
const subtitle = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 50%)',
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
  backgroundColor: 'hsl(181, 47%, 33%)',
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
