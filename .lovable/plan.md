## Goal

Surface three new per-user activation signals on the Founder Dashboard:
- **Invoices downloaded** — distinct invoices a user has downloaded as PDF at least once.
- **Credentials added** — total rows in `credentials` per user.
- **Expenses added** — total rows in `expenses` per user.

## Changes

### 1. Database (migration)

- New table `public.invoice_pdf_downloads` to track distinct downloads:
  - `id uuid pk`, `user_id uuid not null`, `invoice_id uuid not null`, `first_downloaded_at timestamptz default now()`, `download_count int default 1`, `last_downloaded_at timestamptz default now()`
  - Unique index on `(user_id, invoice_id)` so we can upsert and count distinct invoices.
  - RLS: users can `select` their own rows; inserts/updates only via service role (edge function).

- Update `public.get_founder_overview()` RPC to also return:
  - `downloaded_invoice_count int` — distinct invoices downloaded (count from new table).
  - `credential_count int` — count from `credentials`.
  - `expense_count int` — count from `expenses`.

### 2. Edge function `generate-invoice-pdf`

- After successful PDF generation, upsert into `invoice_pdf_downloads`:
  - For owner downloads (`invoice_id` query param + JWT): use the JWT user as `user_id`.
  - For public/clinic downloads (via `share_token`): attribute to the invoice's owning `user_id` (looked up from the `invoices` row), since the founder metric is "this user has had at least one download of this invoice".
  - Use `INSERT ... ON CONFLICT (user_id, invoice_id) DO UPDATE SET download_count = download_count + 1, last_downloaded_at = now()`.
- Tracking happens server-side only; failures must not block the PDF response.

### 3. Founder Dashboard UI (`src/pages/FounderDashboardPage.tsx`)

- Extend `FounderRow` with `downloaded_invoice_count`, `credential_count`, `expense_count`.
- Add three new sortable columns in the Beta testers table: **Downloads**, **Credentials**, **Expenses** (right-aligned, tabular-nums, matching existing pattern).
- No changes to the four hero metric cards (keep current totals/active/activated/invoicing).

## Out of scope

- No new dashboard cards or charts.
- No tracking of public-link views (only completed PDF downloads).
- No backfill of historical downloads — counter starts from deploy.
