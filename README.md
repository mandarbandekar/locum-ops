# LocumOps

A management platform for solo independent clinicians — manage facility relationships, shift scheduling, invoicing, professional credentials, and estimated tax tracking.

## Tech Stack

- **Frontend:** React + TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase)
- **Auth:** Email/password with auto-confirm

## Onboarding

New users are automatically redirected to `/onboarding` after sign-up. The wizard has 3 steps:

1. **Tell us who you are** — Profession, work style, timezone, currency
2. **How do you run your ops today?** — Current tools, facility count, invoice volume
3. **Set up your defaults** — Invoice due dates, prefix, email tone, terms fields

An optional tax tracker setup card is available on step 3.

After completing (or skipping) onboarding, users see a **Starting Path** screen with quick actions:
- Import from spreadsheet (placeholder)
- Add first facility
- Add first shift
- Go to Dashboard

### Profile Settings

All onboarding fields can be edited later at `/settings/profile`.

### Profile Defaults

- **Invoice prefix** — Used when generating invoice numbers (e.g., `INV-2026-001`)
- **Invoice due days** — Default due date for new invoices
- **Email tone** — Adjusts greeting/closing of email templates (Friendly / Neutral / Direct)
- **Terms fields** — Toggle which terms snapshot fields are enabled

## Features

- **Facilities CRM** — Manage clinics with contacts, terms, and notes
- **Schedule** — Calendar + list view with color-coded shifts and conflict detection
- **Outreach & Confirmations** — Email template management
- **Invoices** — Auto-generated from completed shifts with line items
- **Credentials** — Track licenses, certifications, documents with expiration alerts
- **Taxes** — Estimated tax tracker with quarterly status and CSV export
- **Reports** — Revenue analytics and charts

## Development

```sh
npm install
npm run dev
```

## Testing

```sh
npm test
```
