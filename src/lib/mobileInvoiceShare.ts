import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'locumops-mobile';
const STORE = 'invoice-pdfs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readCached(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeCached(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

async function fetchInvoicePdf(invoiceId: string): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-invoice-pdf?invoice_id=${encodeURIComponent(invoiceId)}`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
  });
  if (!res.ok) throw new Error('Failed to generate PDF');
  return res.blob();
}

/**
 * Share an invoice PDF using the Web Share API when available.
 * Caches the generated PDF in IndexedDB keyed by `${invoiceId}:${cacheKey}`
 * so quick re-shares are instant. Falls back to download if Web Share files
 * are not supported (most desktops, older Android browsers).
 */
export async function shareInvoicePdf(opts: {
  invoiceId: string;
  invoiceNumber: string;
  cacheKey: string;
  facilityName?: string;
}): Promise<'shared' | 'downloaded'> {
  const { invoiceId, invoiceNumber, cacheKey, facilityName } = opts;
  const key = `${invoiceId}:${cacheKey}`;
  let blob = await readCached(key);
  if (!blob) {
    blob = await fetchInvoicePdf(invoiceId);
    await writeCached(key, blob);
  }
  const filename = `${invoiceNumber || 'invoice'}.pdf`;
  const file = new File([blob], filename, { type: 'application/pdf' });

  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: `Invoice ${invoiceNumber}`,
        text: facilityName ? `Invoice ${invoiceNumber} — ${facilityName}` : `Invoice ${invoiceNumber}`,
      });
      return 'shared';
    } catch (err: any) {
      // user cancelled — treat as no-op
      if (err?.name === 'AbortError') return 'shared';
      // fall through to download
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  return 'downloaded';
}
