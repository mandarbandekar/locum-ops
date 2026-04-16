import { useEffect, useMemo, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  facility: any;
  profile: any;
  userEmail: string;
  billingNameTo: string;
  billingEmailTo: string;
  onSent: () => void;
  mode?: 'initial' | 'followup';
}

function safeFormatDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return format(parseISO(d), "MMM d, yyyy");
  } catch {
    return "";
  }
}

function formatMoney(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return (v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceComposeDialog({
  open,
  onOpenChange,
  invoice,
  facility,
  profile,
  userEmail,
  billingNameTo,
  billingEmailTo,
  onSent,
  mode = 'initial',
}: InvoiceComposeDialogProps) {
  const isFollowup = mode === 'followup';

  const senderName = useMemo(() => {
    const company = profile?.company_name?.trim();
    if (company) return company;
    const full = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    return full || "Your relief veterinarian";
  }, [profile]);

  const dueDateFormatted = useMemo(
    () => safeFormatDate(invoice?.due_date),
    [invoice?.due_date],
  );

  const totalAmountFormatted = useMemo(
    () => formatMoney(invoice?.balance_due ?? invoice?.total_amount),
    [invoice?.balance_due, invoice?.total_amount],
  );

  const daysOverdue = useMemo(() => {
    if (!invoice?.due_date) return 0;
    try {
      const days = differenceInCalendarDays(new Date(), parseISO(invoice.due_date));
      return Math.max(0, days);
    } catch {
      return 0;
    }
  }, [invoice?.due_date]);

  const defaultSubject = useMemo(() => {
    if (isFollowup) {
      return `Follow-up: Invoice ${invoice?.invoice_number ?? ""} — payment overdue`;
    }
    return `Invoice ${invoice?.invoice_number ?? ""} from ${senderName}`;
  }, [invoice?.invoice_number, senderName, isFollowup]);

  const defaultBody = useMemo(() => {
    const greetingName = billingNameTo?.trim() || "there";
    const signOffName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || senderName;
    const company = profile?.company_name?.trim();

    if (isFollowup) {
      return `Hi ${greetingName},

I'm following up on invoice ${invoice?.invoice_number ?? ""} for relief coverage at ${facility?.name ?? ""}. The total of $${totalAmountFormatted} was due on ${dueDateFormatted || "the due date"} and is now ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue.

You can view the invoice using the link in this email. Please let me know if you have any questions or if there's anything I can help with on your end.

Thanks,
${signOffName}${company ? `\n${company}` : ""}`;
    }

    return `Hi ${greetingName},

Please find attached invoice ${invoice?.invoice_number ?? ""} for relief coverage at ${facility?.name ?? ""}. Total due: $${totalAmountFormatted}${dueDateFormatted ? `, by ${dueDateFormatted}` : ""}.

You can view and download the invoice using the link in this email.

Thanks,
${signOffName}${company ? `\n${company}` : ""}`;
  }, [
    billingNameTo,
    invoice?.invoice_number,
    facility?.name,
    totalAmountFormatted,
    dueDateFormatted,
    daysOverdue,
    profile,
    senderName,
    isFollowup,
  ]);

  const [to, setTo] = useState(billingEmailTo || "");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [ccSender, setCcSender] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(billingEmailTo || "");
      setSubject(defaultSubject);
      setBody(defaultBody);
      setCcSender(true);
      setSending(false);
    }
  }, [open, billingEmailTo, defaultSubject, defaultBody]);

  const trimmedTo = to.trim();
  const canSend = trimmedTo.length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Persist updated billing email if user edited it
      if (trimmedTo !== (billingEmailTo || "").trim()) {
        const { error: updateError } = await supabase
          .from("invoices")
          .update({ billing_email_to: trimmedTo })
          .eq("id", invoice.id);
        if (updateError) throw updateError;
      }

      const payload: Record<string, any> = {
        invoice_id: invoice.id,
        user_id: user.id,
        cc_sender: ccSender,
        mode,
      };
      if (subject.trim() !== defaultSubject.trim()) {
        payload.custom_subject = subject;
      }
      if (body.trim() !== defaultBody.trim()) {
        payload.custom_body = body;
      }

      const { data, error } = await supabase.functions.invoke("send-invoice-to-clinic", {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(isFollowup ? `Follow-up sent to ${trimmedTo}` : `Invoice sent to ${trimmedTo}`);
      onSent();
      onOpenChange(false);
    } catch (e) {
      console.error("send-invoice-to-clinic failed", e);
      toast.error(
        isFollowup
          ? "Failed to send follow-up — check the billing email and try again"
          : "Failed to send invoice — check the billing email and try again",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>
            {isFollowup
              ? `Follow Up: Invoice ${invoice?.invoice_number ?? ""}`
              : `Send Invoice ${invoice?.invoice_number ?? ""}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* To field */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              To: <span className="font-medium text-foreground">{billingNameTo || "—"}</span>
              {facility?.name ? ` at ${facility.name}` : ""}
            </p>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="billing@clinic.com"
            />
            {!trimmedTo && (
              <p className="text-xs text-warning mt-1.5">
                No billing email configured — add one in clinic settings.
              </p>
            )}
          </div>

          {/* From display (read-only) */}
          <div className="rounded-lg border border-[hsl(var(--card-border))] bg-muted/30 px-3.5 py-2.5">
            <p className="text-[13px] text-foreground">
              From: <span className="font-medium">{senderName}</span> via LocumOps
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Replies will go to {userEmail || "your email"}
            </p>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="invoice-compose-subject">Subject</Label>
            <Input
              id="invoice-compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <Label htmlFor="invoice-compose-body">Message</Label>
            <Textarea
              id="invoice-compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="font-normal"
            />
          </div>

          {/* Attachment indicator */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--card-border))] bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            Invoice {invoice?.invoice_number}.pdf will be viewable via link
          </div>

          {/* CC checkbox */}
          {userEmail && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="invoice-compose-cc"
                checked={ccSender}
                onCheckedChange={(v) => setCcSender(v === true)}
              />
              <label
                htmlFor="invoice-compose-cc"
                className="text-sm text-foreground cursor-pointer select-none"
              >
                Send me a copy at {userEmail}
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending
              ? "Sending..."
              : isFollowup
              ? "Send Follow-Up"
              : "Send Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InvoiceComposeDialog;
