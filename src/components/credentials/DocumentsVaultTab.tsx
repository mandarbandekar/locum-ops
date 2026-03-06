import { useState, useMemo, useCallback, useRef } from 'react';
import { useCredentials, CredentialDocument } from '@/hooks/useCredentials';
import { DOCUMENT_CATEGORY_LABELS, CREDENTIAL_TYPE_LABELS } from '@/lib/credentialTypes';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Upload, Search, FileText, FileImage, File, Download, Trash2,
  Eye, Replace, Clock, FolderOpen, LayoutGrid, List, X, Plus
} from 'lucide-react';
import { format } from 'date-fns';

type ViewMode = 'grid' | 'list';

const FILE_ICONS: Record<string, React.ElementType> = {
  'application/pdf': FileText,
  'image/jpeg': FileImage,
  'image/png': FileImage,
  'image/webp': FileImage,
};

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  return FILE_ICONS[fileType] || File;
}

function isImageType(fileType: string | null) {
  return fileType?.startsWith('image/') ?? false;
}

export default function DocumentsVaultTab() {
  const { documents, credentials, isDocumentsLoading, uploadDocument } = useCredentials();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCredential, setFilterCredential] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CredentialDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState('custom');
  const [uploadCredentialId, setUploadCredentialId] = useState('');

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (search && !d.file_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && d.document_category !== filterCategory) return false;
      if (filterCredential !== 'all' && d.credential_id !== filterCredential) return false;
      return true;
    });
  }, [documents, search, filterCategory, filterCredential]);

  // Group by category for grid
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, CredentialDocument[]> = {};
    filtered.forEach(d => {
      const cat = d.document_category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    });
    return groups;
  }, [filtered]);

  // Version history: docs with same credential_id & file_name pattern
  const getVersions = useCallback((doc: CredentialDocument) => {
    if (!doc.credential_id) return [doc];
    return documents
      .filter(d => d.credential_id === doc.credential_id)
      .sort((a, b) => b.version_number - a.version_number);
  }, [documents]);

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file, uploadCredentialId || undefined, uploadCategory);
      }
      toast({ title: 'Upload complete', description: `${files.length} file(s) uploaded.` });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [uploadCategory, uploadCredentialId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePreview = async (doc: CredentialDocument) => {
    setPreviewDoc(doc);
    try {
      const { data } = await supabase.storage
        .from('credential-documents')
        .createSignedUrl(doc.file_url, 3600);
      setPreviewUrl(data?.signedUrl || null);
    } catch {
      setPreviewUrl(null);
    }
  };

  const handleDownload = async (doc: CredentialDocument) => {
    try {
      const { data } = await supabase.storage
        .from('credential-documents')
        .createSignedUrl(doc.file_url, 3600);
      if (data?.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = doc.file_name;
        a.click();
      }
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (doc: CredentialDocument) => {
    try {
      await supabase.storage.from('credential-documents').remove([doc.file_url]);
      await supabase.from('credential_documents').delete().eq('id', doc.id);
      toast({ title: 'Document deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleReplace = async (file: File, doc: CredentialDocument) => {
    setUploading(true);
    try {
      // Upload new version
      const newVersion = doc.version_number + 1;
      const filePath = `${doc.user_id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('credential-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const insertData: Database['public']['Tables']['credential_documents']['Insert'] = {
        user_id: doc.user_id,
        credential_id: doc.credential_id,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
        document_category: doc.document_category as Database['public']['Enums']['document_category'],
        version_number: newVersion,
      };

      const { error } = await supabase.from('credential_documents').insert([insertData]);
      if (error) throw error;

      toast({ title: 'File replaced', description: `Version ${newVersion} uploaded.` });
      setReplacingDocId(null);
    } catch (e: any) {
      toast({ title: 'Replace failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const linkedCredentialName = (credentialId: string | null) => {
    if (!credentialId) return null;
    const cred = credentials.find(c => c.id === credentialId);
    return cred?.custom_title || null;
  };

  if (isDocumentsLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading documents…</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={cn('p-3 rounded-full', isDragging ? 'bg-primary/10' : 'bg-muted')}>
            <Upload className={cn('h-6 w-6', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="font-medium">{uploading ? 'Uploading…' : 'Drag & drop files here, or click to browse'}</p>
            <p className="text-sm text-muted-foreground mt-1">PDFs, images, and common office documents supported</p>
          </div>
          <div className="flex gap-3 mt-2">
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={uploadCredentialId} onValueChange={setUploadCredentialId}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Link to credential" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {credentials.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.custom_title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCredential} onValueChange={setFilterCredential}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Credentials" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Credentials</SelectItem>
            {credentials.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.custom_title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Documents" count={documents.length} icon={FolderOpen} />
        <StatCard label="Categories Used" count={Object.keys(groupedByCategory).length} icon={FileText} />
        <StatCard label="Linked to Credentials" count={documents.filter(d => d.credential_id).length} icon={File} />
        <StatCard label="Uploaded This Month" count={documents.filter(d => {
          const uploaded = new Date(d.uploaded_at);
          const now = new Date();
          return uploaded.getMonth() === now.getMonth() && uploaded.getFullYear() === now.getFullYear();
        }).length} icon={Upload} />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="p-4 rounded-full bg-muted inline-block mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Documents</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {documents.length === 0 ? 'Upload your first document using the drag & drop zone above.' : 'No documents match your filters.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid View - grouped by category */}
      {filtered.length > 0 && viewMode === 'grid' && (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([cat, docs]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {DOCUMENT_CATEGORY_LABELS[cat] || cat}
                <Badge variant="secondary" className="text-xs">{docs.length}</Badge>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    credentialName={linkedCredentialName(doc.credential_id)}
                    onPreview={() => handlePreview(doc)}
                    onDownload={() => handleDownload(doc)}
                    onDelete={() => handleDelete(doc)}
                    onReplace={() => setReplacingDocId(doc.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {filtered.length > 0 && viewMode === 'list' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Linked Credential</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => {
                const Icon = getFileIcon(doc.file_type);
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">{doc.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {DOCUMENT_CATEGORY_LABELS[doc.document_category] || doc.document_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {linkedCredentialName(doc.credential_id) || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">v{doc.version_number}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(doc)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplacingDocId(doc.id)}>
                          <Replace className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={open => { if (!open) { setPreviewDoc(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc && (() => { const Icon = getFileIcon(previewDoc.file_type); return <Icon className="h-5 w-5" />; })()}
              {previewDoc?.file_name}
            </DialogTitle>
            <DialogDescription>
              {previewDoc && (
                <span className="flex flex-wrap gap-3 text-xs mt-1">
                  <span>Category: {DOCUMENT_CATEGORY_LABELS[previewDoc.document_category]}</span>
                  <span>Version: {previewDoc.version_number}</span>
                  <span>Uploaded: {format(new Date(previewDoc.uploaded_at), 'MMM d, yyyy h:mm a')}</span>
                  {previewDoc.updated_at !== previewDoc.uploaded_at && (
                    <span>Updated: {format(new Date(previewDoc.updated_at), 'MMM d, yyyy')}</span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {previewDoc && linkedCredentialName(previewDoc.credential_id) && (
            <Badge variant="outline" className="w-fit">
              Linked to: {linkedCredentialName(previewDoc.credential_id)}
            </Badge>
          )}

          {/* Preview content */}
          <div className="flex-1 min-h-0">
            {previewUrl ? (
              isImageType(previewDoc?.file_type ?? null) ? (
                <img src={previewUrl} alt={previewDoc?.file_name} className="max-w-full max-h-[50vh] mx-auto rounded-lg object-contain" />
              ) : previewDoc?.file_type === 'application/pdf' ? (
                <iframe src={previewUrl} className="w-full h-[50vh] rounded-lg border" title="PDF Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <File className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Preview not available for this file type.</p>
                  <Button className="mt-4" onClick={() => previewDoc && handleDownload(previewDoc)}>
                    <Download className="mr-2 h-4 w-4" /> Download File
                  </Button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">Loading preview…</div>
            )}
          </div>

          {/* Version History */}
          {previewDoc && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Version History
              </h4>
              <ScrollArea className="max-h-[120px]">
                <div className="space-y-1.5">
                  {getVersions(previewDoc).map(ver => (
                    <div key={ver.id} className={cn(
                      'flex items-center justify-between p-2 rounded text-sm',
                      ver.id === previewDoc.id ? 'bg-primary/10' : 'hover:bg-muted'
                    )}>
                      <div className="flex items-center gap-2">
                        <Badge variant={ver.id === previewDoc.id ? 'default' : 'secondary'} className="text-xs">
                          v{ver.version_number}
                        </Badge>
                        <span className="truncate max-w-[200px]">{ver.file_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ver.uploaded_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => previewDoc && setReplacingDocId(previewDoc.id)}>
              <Replace className="mr-2 h-4 w-4" /> Replace
            </Button>
            <Button onClick={() => previewDoc && handleDownload(previewDoc)}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Replace file input (hidden) */}
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          const doc = documents.find(d => d.id === replacingDocId);
          if (file && doc) handleReplace(file, doc);
          e.target.value = '';
        }}
      />
      {replacingDocId && (() => {
        // Trigger file input when replacingDocId is set
        setTimeout(() => replaceInputRef.current?.click(), 0);
        return null;
      })()}
    </div>
  );
}

/* ---- Sub-components ---- */

function StatCard({ label, count, icon: Icon }: { label: string; count: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentCard({ doc, credentialName, onPreview, onDownload, onDelete, onReplace }: {
  doc: CredentialDocument;
  credentialName: string | null;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onReplace: () => void;
}) {
  const Icon = getFileIcon(doc.file_type);
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={onPreview}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className={cn(
            'p-2.5 rounded-lg',
            isImageType(doc.file_type) ? 'bg-accent' : 'bg-muted'
          )}>
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReplace}>
              <Replace className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-1 min-w-0">
          <p className="font-medium text-sm truncate">{doc.file_name}</p>
          {credentialName && (
            <p className="text-xs text-muted-foreground truncate">→ {credentialName}</p>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</span>
          <Badge variant="secondary" className="text-[10px] h-5">v{doc.version_number}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
