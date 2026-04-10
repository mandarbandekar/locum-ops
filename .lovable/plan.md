

# Security Audit Report — LocumOps

## Critical Findings

---

### 1. PUBLIC CONFIRMATION PAGE — IDOR / DATA LEAK VIA ANON CLIENT
**Risk: HIGH**

`PublicConfirmationPage.tsx` (line 33) queries `confirmation_records`, `facilities`, `user_profiles`, and `shifts` using the **anon Supabase client** with only a `share_token` as access control. Since all these tables have RLS policies scoped to `auth.uid() = user_id`, the anon client (unauthenticated) should get zero rows back.

However, the `select('*')` on `confirmation_records` uses the anon key. If any RLS policy is misconfigured (or a future permissive policy is added), this leaks **full user profile data** (first/last name), **facility names**, and **shift schedules** to anyone with or without a valid token.

**Exploit:** Visit `/confirmations/public/<any-uuid>` — even without a valid token, the client-side code attempts DB queries against user-owned tables using the anon key. The only protection is RLS.

**Fix:** Move this to a **server-side edge function** (like the invoice public endpoint already does) that uses the service role key with explicit field selection, not `select('*')`.

---

### 2. REALTIME CHANNEL EAVESDROPPING — CROSS-USER DATA ACCESS
**Risk: HIGH**

The security scan confirmed: **no RLS policies on `realtime.messages`**. Any authenticated user can subscribe to any Realtime channel topic. With 14 published tables (facilities, invoices, shifts, contracts, etc.), User A can subscribe to changes on User B's data.

**Exploit:**
```javascript
supabase.channel('realtime:public:invoices')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, console.log)
  .subscribe()
// Receives ALL users' invoice changes
```

**Fix:** Add RLS policies on `realtime.messages` that scope channel access by `auth.uid()`, or use private channels with user-specific topics.

---

### 3. STORAGE UPDATE POLICIES MISSING `WITH CHECK` — PATH TRAVERSAL
**Risk: HIGH**

Both `credential-documents` and `expense-receipts` storage buckets have UPDATE policies with a `USING` condition but **no `WITH CHECK`**. An authenticated user can update a file object and change its path to another user's folder.

**Exploit:**
```javascript
// Move my file into another user's folder
await supabase.storage.from('credential-documents')
  .update('victim-user-id/license.pdf', myFile, { upsert: true })
```

**Fix:** Add `WITH CHECK` conditions identical to the `USING` conditions on both storage policies.

---

### 4. CREDENTIAL PORTAL — DECRYPT-ANY-USER'S-PASSWORD
**Risk: HIGH**

The `credential-portal-crypto` edge function encrypts/decrypts any text passed to it. It authenticates the caller but does **not verify ownership** of the credential. Any authenticated user who knows (or guesses) another user's encrypted password blob can call:

```javascript
await supabase.functions.invoke('credential-portal-crypto', {
  body: { action: 'decrypt', text: '<stolen-encrypted-blob>' }
})
```

The encrypted blobs are stored in `credential_renewal_portals` which has proper RLS, but if any data is ever leaked (logs, API response, realtime channel — see finding #2), the decryption endpoint becomes an oracle.

**Fix:** Have the edge function look up the encrypted value from the DB itself (scoped to the requesting user), rather than accepting arbitrary ciphertext.

---

### 5. SHARE TOKENS — WEAK ENTROPY & NO RATE LIMITING
**Risk: MEDIUM**

Invoice and confirmation share tokens use `crypto.randomUUID()` (v4 UUID — 122 bits of entropy). While not trivially brute-forceable, the public-invoice endpoint has **no rate limiting**. An attacker can enumerate tokens.

**Exploit:** Script thousands of requests to `/functions/v1/public-invoice?token=<guess>` with no throttling.

**Fix:** Use `crypto.getRandomValues()` with 256-bit tokens (hex-encoded), and add rate limiting on the public endpoints.

---

### 6. LEAKED PASSWORD PROTECTION DISABLED
**Risk: MEDIUM**

The linter confirmed HIBP password checking is disabled. Users can sign up with known-compromised passwords.

**Fix:** Enable via `configure_auth` with `password_hibp_enabled: true`.

---

### 7. WAITLIST TABLE — PERMISSIVE INSERT RLS (`WITH CHECK (true)`)
**Risk: LOW-MEDIUM**

The `waitlist_leads` table has a `WITH CHECK (true)` INSERT policy. While intentionally public, there's no rate limiting, allowing spam/DoS of the waitlist table.

**Fix:** Add a rate-limiting edge function in front, or add a CAPTCHA check.

---

### 8. `delete-account` FUNCTION — NO INPUT VALIDATION
**Risk: LOW**

The `reason` and `feedback` fields from the request body are stored directly in `account_deletion_logs` with no length limits or sanitization. An attacker could insert megabytes of text.

**Exploit:**
```javascript
await supabase.functions.invoke('delete-account', {
  body: { reason: 'x'.repeat(10_000_000), feedback: 'y'.repeat(10_000_000) }
})
```

**Fix:** Validate and truncate `reason` (max 500 chars) and `feedback` (max 2000 chars) in the edge function.

---

### 9. CORS WILDCARD ON ALL EDGE FUNCTIONS
**Risk: LOW-MEDIUM**

Every edge function uses `Access-Control-Allow-Origin: *`. This means any website can make authenticated requests to the API if the user's browser has a valid session token.

**Fix:** Restrict to your app's domains: `locum-ops.lovable.app` and the preview URL.

---

### 10. INVOICE PDF — CONTENT-DISPOSITION INJECTION
**Risk: LOW**

In `generate-invoice-pdf` (line 353), the `Content-Disposition` header uses the invoice number with only non-printable char stripping. An invoice number like `INV"; filename=malware.exe` could manipulate the download filename.

**Fix:** Sanitize to alphanumeric + dashes only, or use a fixed filename pattern.

---

## Implementation Plan

### Phase 1 — Critical (immediate)

1. **Add `WITH CHECK` to storage UPDATE policies** for `credential-documents` and `expense-receipts` — database migration
2. **Add RLS on realtime channels** — database migration to add policies on `realtime.messages` scoping by user
3. **Refactor `PublicConfirmationPage`** to use a server-side edge function instead of client-side anon queries
4. **Add ownership check to `credential-portal-crypto`** — verify the calling user owns the credential before decrypting

### Phase 2 — Important

5. **Enable HIBP password protection** via `configure_auth`
6. **Add input validation** to `delete-account` edge function (truncate reason/feedback)
7. **Restrict CORS origins** on all edge functions to app domains
8. **Add rate limiting** on public-invoice and public-confirmation endpoints

### Phase 3 — Hardening

9. **Strengthen share tokens** to 256-bit random values
10. **Sanitize Content-Disposition** in PDF generation
11. **Add rate limiting** to waitlist INSERT

### Files to modify:
- Database migration for storage policies and realtime RLS
- `supabase/functions/credential-portal-crypto/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/public-invoice/index.ts`
- `supabase/functions/generate-invoice-pdf/index.ts`
- New edge function: `public-confirmation/index.ts`
- `src/pages/PublicConfirmationPage.tsx`
- All edge function CORS headers
- Auth configuration for HIBP

