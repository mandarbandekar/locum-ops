import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const METHODS = ['ACH', 'Check', 'Personal Check', 'Cash', 'Card', 'Zelle', 'Venmo', 'Other'];
const ACCOUNTS = ['Business Checking', 'Business Savings', 'Personal Checking', 'Personal Savings', 'Other'];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  balanceDue: number;
  onRecord: (payment: { payment_date: string; amount: number; method: string; account: string; memo: string }) => void;
}

export function RecordPaymentDialog({ open, onOpenChange, balanceDue, onRecord }: Props) {
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState<string>(String(balanceDue ?? ''));
  const [method, setMethod] = useState('ACH');
  const [account, setAccount] = useState('Business Checking');
  const [memo, setMemo] = useState('');

  const amountNum = parseFloat(amount) || 0;
  const isFullPayment = amountNum >= balanceDue;

  const handleSubmit = () => {
    if (amountNum <= 0) return;
    onRecord({ payment_date: paymentDate, amount: amountNum, method, account, memo: memo.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <Label>Amount ($)</Label>
            <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} min={0.01} step={0.01} />
            <p className="text-xs text-muted-foreground mt-1">
              {isFullPayment ? 'Invoice will be fully paid' : 'Partial payment will be recorded'}
            </p>
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Account</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Memo <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="Payment notes..." rows={2} />
          </div>
          <Button onClick={handleSubmit} className="w-full">Record Payment</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
