/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InvoiceSendEmailProps {
  senderName: string
  senderBusinessName: string
  senderEmail: string
  senderPhone?: string
  facilityName: string
  invoiceNumber: string
  totalAmount: string
  dueDate: string
  invoiceDate: string
  viewInvoiceUrl: string
  downloadPdfUrl: string
  customBody?: string
  isFollowUp?: boolean
  daysOverdue?: number
}

export const InvoiceSendEmail = ({
  senderName,
  senderBusinessName,
  senderEmail,
  senderPhone,
  facilityName,
  invoiceNumber,
  totalAmount,
  dueDate,
  invoiceDate,
  viewInvoiceUrl,
  downloadPdfUrl,
  customBody,
  isFollowUp,
  daysOverdue,
}: InvoiceSendEmailProps) => {
  const previewText = `Invoice ${invoiceNumber} — $${totalAmount} due ${dueDate}`
  const customLines = customBody ? customBody.split(/\r?\n/) : []

  const defaultBody = isFollowUp
    ? `This is a follow-up regarding an outstanding invoice for services at ${facilityName}.${
        typeof daysOverdue === 'number' && daysOverdue > 0
          ? ` The payment is now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} past due.`
          : ''
      }`
    : `Please find your invoice for relief veterinary coverage at ${facilityName}.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{senderBusinessName}</Heading>

          {customBody ? (
            <Text style={text}>
              {customLines.map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < customLines.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </Text>
          ) : (
            <Text style={text}>{defaultBody}</Text>
          )}

          <Section style={summaryCard}>
            <Text style={summaryRow}>
              <span style={summaryLabel}>Invoice #:</span>{' '}
              <strong>{invoiceNumber}</strong>
            </Text>
            <Text style={summaryRow}>
              <span style={summaryLabel}>Date:</span> {invoiceDate}
            </Text>
            <Text style={summaryAmountRow}>
              <span style={summaryLabel}>Amount Due:</span>{' '}
              <strong style={amountStrong}>${totalAmount}</strong>
            </Text>
            <Text style={summaryRow}>
              <span style={summaryLabel}>Due Date:</span> <strong>{dueDate}</strong>
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '28px 0 12px' }}>
            <Button style={button} href={viewInvoiceUrl}>
              View Invoice
            </Button>
          </Section>

          <Text style={pdfLinkText}>
            <Link href={downloadPdfUrl} style={link}>
              Download PDF
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={signature}>
            {senderName}
            {senderBusinessName && senderBusinessName !== senderName ? (
              <>
                <br />
                {senderBusinessName}
              </>
            ) : null}
            <br />
            Reply to:{' '}
            <Link href={`mailto:${senderEmail}`} style={link}>
              {senderEmail}
            </Link>
            {senderPhone ? (
              <>
                <br />
                {senderPhone}
              </>
            ) : null}
          </Text>

          <Text style={footer}>
            Sent via LocumOps ·{' '}
            <Link href="https://locum-ops.com" style={footerLink}>
              locum-ops.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InvoiceSendEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', Arial, sans-serif",
}
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 30%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const summaryCard = {
  backgroundColor: 'hsl(210, 20%, 97%)',
  border: '1px solid hsl(215, 13%, 88%)',
  borderRadius: '0.5rem',
  padding: '16px 20px',
  margin: '20px 0',
}
const summaryRow = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 25%)',
  margin: '4px 0',
  lineHeight: '1.5',
}
const summaryAmountRow = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 25%)',
  margin: '8px 0',
  lineHeight: '1.5',
}
const summaryLabel = {
  color: 'hsl(215, 13%, 50%)',
  display: 'inline-block',
  minWidth: '110px',
}
const amountStrong = {
  fontSize: '18px',
  color: 'hsl(215, 25%, 15%)',
}
const button = {
  backgroundColor: 'hsl(173, 58%, 39%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '0.5rem',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const pdfLinkText = {
  fontSize: '13px',
  color: 'hsl(215, 13%, 50%)',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const link = {
  color: 'hsl(173, 58%, 39%)',
  textDecoration: 'underline',
}
const hr = {
  borderColor: 'hsl(215, 13%, 90%)',
  margin: '28px 0 20px',
}
const signature = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 25%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(215, 13%, 55%)',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}
const footerLink = {
  color: 'hsl(215, 13%, 55%)',
  textDecoration: 'underline',
}
