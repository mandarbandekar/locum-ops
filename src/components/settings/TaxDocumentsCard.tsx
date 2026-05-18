import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Eye, Download, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useTaxDocuments } from '@/hooks/useTaxDocuments';
import { viewTaxDocFile, downloadTaxDocFile } from '@/lib/taxDocumentStorage';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function TaxDocumentsCard() {
  const { isDemo } = useAuth();
  const { current, loading, upload, remove } = useTaxDocuments('w9');
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handlePicked = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ title: 'File too large', description: 'Please choose a file under 10 MB.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await upload(file, true);
      toast({ title: 'W-9 uploaded', description: 'Your W-9 is securely stored and encrypted.' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleView = async () => {
    if (!current) return;
    const ok = await viewTaxDocFile(current.file_path);
    if (!ok) toast({ title: 'Could not open file', variant: 'destructive' });
  };

  const handleDownload = async () => {
    if (!current) return;
    const ok = await downloadTaxDocFile(current.file_path, current.original_filename);
    if (!ok) toast({ title: 'Could not download file', variant: 'destructive' });
  };

  const handleDelete = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await remove(current);
      toast({ title: 'W-9 deleted', description: 'The file has been permanently removed.' });
      setConfirmDelete(false);
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Tax Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Securely store your W-9 so it's ready to send when a clinic needs it. Files are encrypted at rest and only you can access them via short-lived secure links.
        </p>

        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <span>We never read, parse, or display the contents of your W-9 — including your SSN. The file is stored as-is and shown back only to you.</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={e => handlePicked(e.target.files?.[0])}
        />

        {isDemo ? (
          <p className="text-xs text-muted-foreground">Tax document uploads are disabled in demo mode.</p>
        ) : loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : current ? (
          <div className="rounded-md border bg-background p-3 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{current.original_filename}</p>
                <p className="text-xs text-muted-foreground">
                  W-9 • {formatSize(current.file_size)} • Uploaded {formatDate(current.uploaded_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleView}>
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => inputRef.current?.click()}>
                <RefreshCw className="h-3.5 w-3.5" /> Replace
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handlePicked(e.dataTransfer.files?.[0]); }}
          >
            <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
            <p className="text-sm text-muted-foreground">{busy ? 'Uploading…' : 'Click to upload your W-9 or drag & drop'}</p>
            <p className="text-[11px] text-muted-foreground mt-1">PDF, JPG, or PNG · Max 10 MB</p>
          </div>
        )}

        <AlertDialog open={confirmDelete} onOpenChange={(o) => !busy && setConfirmDelete(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your W-9?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the file from secure storage. You can upload a new one any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                disabled={busy}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
