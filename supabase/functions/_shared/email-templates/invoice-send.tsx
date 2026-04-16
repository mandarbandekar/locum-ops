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
  facilityName: string
  invoiceNumber: string
  totalAmount: string
  dueDate?: string
  invoiceDate?: string
  shiftDates?: string
  viewInvoiceUrl: string
  downloadPdfUrl: string
  customBody?: string
  senderEmail: string
  senderPhone?: string
}

export const InvoiceSendEmail = ({
  senderName,
  senderBusinessName,
  facilityName,
  invoiceNumber,
  totalAmount,
  dueDate,
  invoiceDate,
  shiftDates,
  viewInvoiceUrl,
  downloadPdfUrl,
  customBody,
  senderEmail,
  senderPhone,
}: InvoiceSendEmailProps) => {
  const previewText = `Invoice ${invoiceNumber} from ${senderBusinessName} — $${totalAmount}`

  const customLines = customBody ? customBody.split(/\r?\n/) : []

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Invoice {invoiceNumber}</Heading>

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
            <Text style={text}>
              Hi {facilityName} team,
              <br />
              <br />
              Please find invoice <strong>{invoiceNumber}</strong> attached below for
              services provided. You can review the details and download a PDF copy
              using the links below.
            </Text>
          )}

          <Section style={summaryCard}>
            <Text style={summaryRow}>
              <span style={summaryLabel}>Invoice #:</span>{' '}
              <strong>{invoiceNumber}</strong>
            </Text>
            <Text style={summaryRow}>
              <span style={summaryLabel}>Amount due:</span>{' '}
              <strong>${totalAmount}</strong>
            </Text>
            {invoiceDate && (
              <Text style={summaryRow}>
                <span style={summaryLabel}>Invoice date:</span> {invoiceDate}
              </Text>
            )}
            {dueDate && (
              <Text style={summaryRow}>
                <span style={summaryLabel}>Due date:</span> <strong>{dueDate}</strong>
              </Text>
            )}
            {shiftDates && (
              <Text style={summaryRow}>
                <span style={summaryLabel}>Service period:</span> {shiftDates}
              </Text>
            )}
          </Section>

          <Section style={{ textAlign: 'center', margin: '28px 0 12px' }}>
            <Button style={button} href={viewInvoiceUrl}>
              View Invoice
            </Button>
          </Section>

          <Text style={pdfLinkText}>
            Or <Link href={downloadPdfUrl} style={link}>download a PDF copy</Link>.
          </Text>

          <Hr style={hr} />

          <Text style={signature}>
            Thank you,
            <br />
            <strong>{senderName}</strong>
            {senderBusinessName && senderBusinessName !== senderName ? (
              <>
                <br />
                {senderBusinessName}
              </>
            ) : null}
            <br />
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

          <Text style={replyNote}>
            Reply directly to this email to reach {senderName} at {senderEmail}.
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
const summaryLabel = {
  color: 'hsl(215, 13%, 50%)',
  display: 'inline-block',
  minWidth: '110px',
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
const replyNote = {
  fontSize: '12px',
  color: 'hsl(215, 13%, 55%)',
  fontStyle: 'italic' as const,
  margin: '20px 0 0',
}
