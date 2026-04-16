
## Plan: InvoiceComposeDialog component

Create `src/components/invoice/InvoiceComposeDialog.tsx` — a modal for composing/sending invoice emails via the new `send-invoice-to-clinic` edge function.

### Component structure

**Imports:** Dialog primitives, Input, Textarea, Button, Checkbox, Label from `@/components/ui/*`; `Loader2`, `Paperclip` from `lucide-react`; `toast` from `sonner`; `supabase` from `@/integrations/supabase/client`; `format` from `date-fns`.

**State:**
- `to` (string) — editable recipient
- `subject` (string) — editable
- `body` (string) — editable
- `ccSender` (boolean, default true)
- `sending` (boolean)

**Derived values (useMemo):**
- `senderName` = `company_name || "{first_name} {last_name}"`
- `defaultSubject` = `Invoice {invoice_number} from {senderName}`
- `dueDateFormatted` = `format(parseISO(due_date), 'MMM d, yyyy')`
- `defaultBody` = template literal with greeting, invoice details, sign-off

**Reset on open:** `useEffect` watching `open` — when opens, reset `to/subject/body/ccSender` to defaults computed from current props (so reopening picks up changes).

### Layout

```
DialogContent (max-w-[680px])
  DialogHeader: "Send Invoice {invoice_number}"
  
  [muted text] "To: {billingNameTo} at {facility.name}"
  Input (to) — if empty, amber warning below
  
  [readonly card/box]
    "From: {senderName} via LocumOps"
    [muted] "Replies will go to {userEmail}"
  
  Label "Subject"
  Input (subject)
  
  Label "Message"  
  Textarea (body, rows=10)
  
  [chip] 📎 Invoice {invoice_number}.pdf will be viewable via link
  
  Checkbox "Send me a copy at {userEmail}" (ccSender)
  
  DialogFooter
    Button variant=outline "Cancel"
    Button "Send Invoice" (loading + disabled when !to.trim())
```

### Send handler

```ts
const handleSend = async () => {
  if (!to.trim()) return;
  setSending(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const payload: any = {
      invoice_id: invoice.id,
      user_id: user.id,
      cc_sender: ccSender,
    };
    if (subject.trim() !== defaultSubject) payload.custom_subject = subject;
    if (body.trim() !== defaultBody.trim()) payload.custom_body = body;
    
    const { data, error } = await supabase.functions.invoke('send-invoice-to-clinic', { body: payload });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    toast.success(`Invoice sent to ${to}`);
    onSent();
    onOpenChange(false);
  } catch (e) {
    toast.error('Failed to send invoice — check the billing email and try again');
  } finally {
    setSending(false);
  }
};
```

Note: `to` field is informational/editable for display, but the edge function reads recipient from `invoice.billing_email_to` / `facility.invoice_email_to`. If the user edits `to`, we should persist that override before sending — update `invoice.billing_email_to` via `supabase.from('invoices').update({ billing_email_to: to }).eq('id', invoice.id)` when `to !== billingEmailTo`. This ensures the edge function picks up the new address.

### Files
- **New:** `src/components/invoice/InvoiceComposeDialog.tsx`

No other files modified — this is a standalone component the parent will wire up later.
