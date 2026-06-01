import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type jsPDF from 'jspdf';

interface Props {
  /** Used in toast + accessible label */
  label: string;
  /** Build the PDF on demand (lazy — heavy lib only triggered on click). */
  buildPdf: () => jsPDF;
  /** Build the CSV string. */
  buildCsv: () => string;
  /** Filename stem (no extension). */
  filename: string;
  disabled?: boolean;
}

export default function SectionExportMenu({ label, buildPdf, buildCsv, filename, disabled }: Props) {
  const onPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      buildPdf().save(`${filename}.pdf`);
      toast.success(`${label} PDF downloaded`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };
  const onCsv = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${label} CSV downloaded`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate CSV');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5 h-8">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onClick={onPdf}>
          <FileText className="h-4 w-4 mr-2" /> Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCsv}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Download CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
