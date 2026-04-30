# Fix: Invisible "Verify Email" button in signup emails

## Diagnosis

The button **is** in the email — but its background is rendering as transparent/white in many email clients, which makes the white button text invisible against the white email body.

**Root cause:** The button styles in our auth email templates use **CSS `hsl()` color notation**:

```ts
// supabase/functions/_shared/email-templates/signup.tsx (line 75-82)
const button = {
  backgroundColor: 'hsl(173, 58%, 39%)',   // teal
  color: '#ffffff',                         // white text
  ...
}
```

Most major email clients — **Gmail (web + iOS + Android), Outlook (desktop & web), Yahoo, Apple Mail (older)** — strip or ignore inline styles using `hsl()`, `hsla()`, `var()`, and other modern CSS color formats. They only reliably support **hex** (`#0d9488`), named colors, and `rgb()`.

Result: the `backgroundColor` is dropped → button background falls back to transparent/white → the white button text becomes invisible. The `<a>` link is still there (which is why users say "it's there but invisible") — clicking the empty space still works.

The same bug exists in **all six auth email templates**:
- `signup.tsx`
- `magic-link.tsx`
- `recovery.tsx`
- `invite.tsx`
- `email-change.tsx`
- (`reauthentication.tsx` uses an OTP code, no button — not affected)

The heading color `hsl(215, 25%, 15%)` and body text `hsl(215, 13%, 50%)` have the same issue but degrade more gracefully (fall back to default black/dark text on white background, so they remain readable).

## Fix

Replace every `hsl(...)` color string in the auth email templates with the equivalent hex value:

| HSL (current) | Hex (replacement) | Used for |
|---|---|---|
| `hsl(173, 58%, 39%)` | `#2a9d8f` | Button background (primary teal) |
| `hsl(215, 25%, 15%)` | `#1d2733` | Heading text |
| `hsl(215, 13%, 50%)` | `#6b7280` | Body text |

Files to update (5 templates with buttons + optional cleanup of headings/body in all 6):
1. `supabase/functions/_shared/email-templates/signup.tsx`
2. `supabase/functions/_shared/email-templates/magic-link.tsx`
3. `supabase/functions/_shared/email-templates/recovery.tsx`
4. `supabase/functions/_shared/email-templates/invite.tsx`
5. `supabase/functions/_shared/email-templates/email-change.tsx`
6. `supabase/functions/_shared/email-templates/reauthentication.tsx` (heading/text only — no button)

As a small belt-and-suspenders improvement, also set the button text color explicitly on the `<Button>` element and add `display: 'inline-block'` + `textAlign: 'center'` to the button style — this ensures Outlook renders the colored block even if it ignores some style declarations.

## Deploy

After editing the templates, redeploy the auth email hook so the new templates take effect:

- Deploy `auth-email-hook` edge function (templates are bundled at deploy time; file edits alone do nothing until redeploy).

## Verification

After deploy, send a test signup from a fresh email and confirm the teal "Verify Email" button is visible in:
- Gmail web
- Gmail mobile
- Apple Mail

If you want, I can also send the same fix preventatively to the non-auth transactional templates (`invoice-send`, `invoice-reminder`, `credential-reminder`, `shift-reminder`, etc.) — let me know and I'll include those in the implementation.
