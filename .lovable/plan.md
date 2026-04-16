
## Plan: Relabel manual mark-as-sent + add primary "Send to Clinic" CTA

### File 1: `src/components/invoice/InvoiceActionBar.tsx`

**Imports:** Add `AlertDialog` primitives from `@/components/ui/alert-dialog`. `Send` icon already imported.

**Props:** Add `onOpenCompose?: () => void` to `InvoiceActionBarProps`.

**State:** Add `const [confirmOpen, setConfirmOpen] = useState(false);`

**Update `handleProceedToSend`:**
- Change activity action: `'marked_sent'` → `'marked_sent_manually'`
- Change description: `'Invoice marked as sent'` → `'Invoice marked as sent manually (sent outside Locum Ops)'`
- Toast: `'Invoice marked as sent manually'`

**Draft button group (replace existing block):**
```tsx
{isDraft && (
  <>
    <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>...</Button>
    
    <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={sending}>
      <span className="hidden sm:inline">I already sent this</span>
      <span className="sm:hidden">Already Sent</span>
    </Button>
    
    <Button size="sm" onClick={onOpenCompose} className="shrink-0">
      <Send className="mr-1 h-3.5 w-3.5" />
      <span className="hidden sm:inline">Send to Clinic</span>
      <span className="sm:hidden">Send</span>
    </Button>
  </>
)}
```

**Append AlertDialog** at end of component (inside root div or as sibling fragment):
```tsx
<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        Use this only if you've already sent this invoice from your own email. The invoice will move to "Sent & Awaiting Payment" without sending any email from Locum Ops.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={async () => { setConfirmOpen(false); await handleProceedToSend(); }}>
        Yes, mark as sent
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### File 2: `src/pages/InvoiceDetailPage.tsx`

Pass new prop to `<InvoiceActionBar ... onOpenCompose={() => setComposeOpen(true)} />`. (`composeOpen` state and `InvoiceComposeDialog` already wired in Prompt 3.)

### Final draft action bar layout
`Total | spacer | PDF | Save | I already sent this (outline) | Send to Clinic (primary)`

No other files modified.
