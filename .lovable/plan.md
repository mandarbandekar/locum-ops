

## Problem
Email "Review Invoice" buttons 404 because:
1. **Wrong domain**: Links use `https://locum-ops.com` (marketing site), but the app lives at `https://app.locum-ops.com`. So `locum-ops.com/invoices` → 404.
2. **Wrong public invoice path**: Payment reminder builds `${siteUrl}/invoice/${share_token}`, but the actual route is `/invoice/public/:token`.

## Fix — `supabase/functions/send-reminder-emails/index.ts`

1. Change `ROOT_DOMAIN` usage so `siteUrl` points to the app, not the marketing site:
   - Replace both `const siteUrl = \`https://${ROOT_DOMAIN}\`` (lines 152 and 621) with `const siteUrl = 'https://app.locum-ops.com'` (or introduce an `APP_DOMAIN = 'app.locum-ops.com'` constant near the top alongside the existing domain constants).

2. Fix the public invoice link path (line 630):
   - From: `` `${siteUrl}/invoice/${invoice.share_token}` ``
   - To: `` `${siteUrl}/invoice/public/${invoice.share_token}` ``

That makes:
- **Invoice Digest** → `https://app.locum-ops.com/invoices` (dashboard, correct for multiple)
- **Uninvoiced shifts reminder** → `https://app.locum-ops.com/invoices`
- **Credential Digest** → `https://app.locum-ops.com/credentials`
- **Single payment reminder** → public share link if available, else `/invoices/:id` (authenticated detail page) — both now resolve correctly.

## Deploy
Edge Function `send-reminder-emails` will be redeployed automatically after the edit.

## Files modified
- `supabase/functions/send-reminder-emails/index.ts` — 3 small URL changes.

