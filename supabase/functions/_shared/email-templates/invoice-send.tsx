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

  const defaultBody = isFollowUp
    ? `This is a follow-up regarding an outstanding invoice for services at ${facilityName}.${
        typeof daysOverdue === 'number' && daysOverdue > 0
          ? ` The payment is now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} past due.`
          : ''
      }`
    : `Please find your invoice for relief veterinary coverage at ${facilityName}.`

  const bodyContent = customBody && customBody.trim() ? customBody : defaultBody
  const bodyLines = bodyContent.split(/\r?\n/)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{senderBusinessName}</Heading>

          {bodyLines.map((line, i) => (
            <Text key={i} style={text}>
              {line || '\u00A0'}
            </Text>
          ))}

          <Hr style={hr} />

          <Text style={summaryRow}>
            <strong>Invoice #:</strong> {invoiceNumber}
          </Text>
          <Text style={summaryRow}>
            <strong>Date:</strong> {invoiceDate}
          </Text>
          <Text style={summaryRow}>
            <strong>Amount Due:</strong>{' '}
            <span style={amountStrong}>${totalAmount}</span>
          </Text>
          <Text style={summaryRow}>
            <strong>Due Date:</strong> {dueDate}
          </Text>

          <Hr style={hr} />

          <Button style={button} href={viewInvoiceUrl}>
            View Invoice
          </Button>

          <Text style={pdfLinkText}>
            or{' '}
            <Link href={downloadPdfUrl} style={link}>
              download the PDF
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={signature}>{senderName}</Text>
          {senderBusinessName && senderBusinessName !== senderName ? (
            <Text style={signature}>{senderBusinessName}</Text>
          ) : null}
          <Text style={signature}>
            Reply to:{' '}
            <Link href={`mailto:${senderEmail}`} style={link}>
              {senderEmail}
            </Link>
          </Text>
          {senderPhone ? <Text style={signature}>{senderPhone}</Text> : null}

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
  margin: '0 0 12px',
}
const summaryRow = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 25%)',
  margin: '4px 0',
  lineHeight: '1.5',
}
const amountStrong = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
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
  margin: '12px 0 0',
}
const link = {
  color: 'hsl(173, 58%, 39%)',
  textDecoration: 'underline',
}
const hr = {
  borderColor: 'hsl(215, 13%, 90%)',
  margin: '24px 0',
}
const signature = {
  fontSize: '14px',
  color: 'hsl(215, 13%, 25%)',
  lineHeight: '1.6',
  margin: '0 0 4px',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(215, 13%, 55%)',
  margin: '24px 0 0',
}
const footerLink = {
  color: 'hsl(215, 13%, 55%)',
  textDecoration: 'underline',
}
