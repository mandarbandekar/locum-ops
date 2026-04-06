import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CPASnapshot, PLQuarterRow, ClinicIncomeRow, Receivables, ExpenseCategoryRow, MileageSummary, ReadinessItem } from '@/hooks/useCPAPrepData';

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

interface Props {
  snapshot: CPASnapshot; quarterly: PLQuarterRow[]; clinicIncome: ClinicIncomeRow[];
  receivables: Receivables; expenseReview: ExpenseCategoryRow[]; mileage: MileageSummary;
  readiness: ReadinessItem[]; agenda: string[];
}

function buildText(p: Props): string {
  const lines: string[] = [];
  const hr = '─'.repeat(50);
  const year = new Date().getFullYear();
  lines.push(`CPA PREP PACKET — ${year}`, `Generated: ${new Date().toLocaleDateString()}`, hr);

  lines.push('\n📊 QUARTERLY TAX SNAPSHOT');
  lines.push(`  YTD Gross Income:       ${fmt(p.snapshot.ytdIncomeCents)}`);
  lines.push(`  YTD Deductible Expenses:${fmt(p.snapshot.ytdDeductibleCents)}`);
  lines.push(`  Est. Net Income:        ${fmt(p.snapshot.netIncomeCents)}`);
  lines.push(`  Outstanding Invoices:   ${p.snapshot.outstandingInvoiceCount} (${fmt(p.snapshot.outstandingInvoiceCents)})`);
  lines.push(`  Projected Annual:       ${fmt(p.snapshot.projectedAnnualCents)}`);
  lines.push(`  Entity Type:            ${p.snapshot.entityType}`);

  lines.push(`\n${hr}\n📈 QUARTERLY P&L`);
  p.quarterly.forEach(q => lines.push(`  ${q.quarter}: Income ${fmt(q.incomeCents)} | Expenses ${fmt(q.expenseCents)} | Net ${fmt(q.netCents)}`));

  lines.push(`\n${hr}\n🏥 INCOME BY CLINIC`);
  p.clinicIncome.forEach(c => lines.push(`  ${c.name}: ${c.shiftsWorked} shifts | Billed ${fmt(c.billedCents)} | Paid ${fmt(c.paidCents)} | Unpaid ${fmt(c.unpaidCents)}`));

  lines.push(`\n${hr}\n💳 ACCOUNTS RECEIVABLE`);
  lines.push(`  Draft: ${p.receivables.draft.count} (${fmt(p.receivables.draft.totalCents)})`);
  lines.push(`  Sent:  ${p.receivables.sent.count} (${fmt(p.receivables.sent.totalCents)})`);
  lines.push(`  Overdue: ${p.receivables.overdue.count} (${fmt(p.receivables.overdue.totalCents)})`);

  lines.push(`\n${hr}\n🧾 EXPENSE SUMMARY BY CATEGORY`);
  p.expenseReview.forEach(r => lines.push(`  ${r.categoryLabel}: ${r.count} items | Total ${fmt(r.totalCents)} | Deductible ${fmt(r.deductibleCents)}${r.missingReceipts > 0 ? ` | ⚠ ${r.missingReceipts} missing receipts` : ''}`));

  lines.push(`\n${hr}\n🚗 MILEAGE SUMMARY`);
  lines.push(`  Total Miles: ${Math.round(p.mileage.totalMiles).toLocaleString()}`);
  lines.push(`  Deduction:   ${fmt(p.mileage.deductionCents)}`);

  lines.push(`\n${hr}\n✅ READINESS CHECKLIST`);
  p.readiness.forEach(r => lines.push(`  ${r.status === 'ok' ? '✓' : '⚠'} ${r.label}`));

  lines.push(`\n${hr}\n💬 CPA DISCUSSION TOPICS`);
  p.agenda.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));

  lines.push(`\n${hr}\nDisclaimer: For planning purposes only. Not tax advice. Confirm all figures with your CPA.`);
  return lines.join('\n');
}

export default function ExportCPAPacket(props: Props) {
  const handleExport = () => {
    const text = buildText(props);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CPA_Prep_Packet_${new Date().getFullYear()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CPA packet downloaded');
  };

  return (
    <Button onClick={handleExport} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Export CPA Packet
    </Button>
  );
}
