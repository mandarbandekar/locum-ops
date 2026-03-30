import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCredentials, CredentialDocument } from '@/hooks/useCredentials';
import { DOCUMENT_CATEGORY_LABELS, CREDENTIAL_TYPE_LABELS } from '@/lib/credentialTypes';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, downloadStoredFile } from '@/lib/storageUtils';
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
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  Upload, Search, FileText, FileImage, File, Download, Trash2,
  Eye, Replace, Clock, FolderOpen, LayoutGrid, List, X, Plus,
  Folder, FolderPlus, ChevronRight, Home, ArrowLeft, MoveRight, Edit2, Check, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { DocumentUploadStepper } from './DocumentUploadStepper';

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
  const queryClient = useQueryClient();
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
  const [uploadCredentialId, setUploadCredentialId] = useState('none');
  const [showUploadStepper, setShowUploadStepper] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Document rename state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [docRenameValue, setDocRenameValue] = useState('');

  // Recategorize state
  const [recategorizingDoc, setRecategorizingDoc] = useState<CredentialDocument | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newLinkedCredential, setNewLinkedCredential] = useState('none');

  // Folder state
  const [currentFolder, setCurrentFolder] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingDoc, setMovingDoc] = useState<CredentialDocument | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [manualFolders, setManualFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (replacingDocId) {
      replaceInputRef.current?.click();
    }
  }, [replacingDocId]);

  // Get all unique folders from documents
  const allFolders = useMemo(() => {
    const folders = new Set<string>();
    documents.forEach(d => {
      const folder = (d as any).folder || '';
      if (folder) folders.add(folder);
    });
    manualFolders.forEach(f => folders.add(f));
    return Array.from(folders).sort();
  }, [documents, manualFolders]);

  // Get subfolders and docs for current path
  const { subfolders, currentDocs } = useMemo(() => {
    const prefix = currentFolder ? currentFolder + '/' : '';

    // Collect immediate subfolders
    const subs = new Set<string>();
    documents.forEach(d => {
      const folder = (d as any).folder || '';
      if (currentFolder === '' && folder && !folder.includes('/')) {
        subs.add(folder);
      } else if (currentFolder && folder.startsWith(prefix)) {
        const rest = folder.slice(prefix.length);
        if (rest && !rest.includes('/')) {
          subs.add(folder);
        }
      }
    });

    // Also include folders that appear as prefixes
    allFolders.forEach(f => {
      if (currentFolder === '') {
        const top = f.split('/')[0];
        if (top) subs.add(top);
      } else if (f.startsWith(prefix)) {
        const rest = f.slice(prefix.length);
        const next = rest.split('/')[0];
        if (next) subs.add(currentFolder + '/' + next);
      }
    });

    // Docs in current folder
    const docs = documents.filter(d => {
      const folder = (d as any).folder || '';
      return folder === currentFolder;
    });

    return { subfolders: Array.from(subs).sort(), currentDocs: docs };
  }, [documents, currentFolder, allFolders]);

  const filtered = useMemo(() => {
    return currentDocs.filter(d => {
      if (deletingIds.has(d.id)) return false;
      if (search && !d.file_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && d.document_category !== filterCategory) return false;
      if (filterCredential !== 'all' && d.credential_id !== filterCredential) return false;
      return true;
    });
  }, [currentDocs, search, filterCategory, filterCredential, deletingIds]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, CredentialDocument[]> = {};
    filtered.forEach(d => {
      const cat = d.document_category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    });
    return groups;
  }, [filtered]);

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
        const doc = await uploadDocument(file, uploadCredentialId === 'none' ? undefined : uploadCredentialId, uploadCategory);
        // Move to current folder if we're inside one
        if (currentFolder && doc) {
          await (supabase as any)
            .from('credential_documents')
            .update({ folder: currentFolder })
            .eq('id', (doc as any).id);
        }
      }
      toast({ title: 'Upload complete', description: `${files.length} file(s) uploaded${currentFolder ? ` to ${currentFolder}` : ''}.` });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleStepperUpload = async (files: File[], category: string, credentialId: string | undefined, folder: string) => {
    for (const file of files) {
      const doc = await uploadDocument(file, credentialId, category);
      if (folder && doc) {
        await (supabase as any)
          .from('credential_documents')
          .update({ folder })
          .eq('id', (doc as any).id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['credential_documents'] });
    toast({ title: 'Upload complete', description: `${files.length} file(s) uploaded${folder ? ` to ${folder}` : ''}.` });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [uploadCategory, uploadCredentialId, currentFolder]);

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
      const url = await getSignedUrl('credential-documents', doc.file_url);
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
    }
  };

  const handleDownload = async (doc: CredentialDocument) => {
    try {
      const ok = await downloadStoredFile('credential-documents', doc.file_url, doc.file_name);
      if (!ok) {
        toast({ title: 'Download failed', description: 'Could not generate download link', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (doc: CredentialDocument) => {
    // Optimistic: immediately hide the doc
    setDeletingIds(prev => new Set(prev).add(doc.id));
    try {
      await supabase.storage.from('credential-documents').remove([doc.file_url]);
      await supabase.from('credential_documents').delete().eq('id', doc.id);
      queryClient.invalidateQueries({ queryKey: ['credential_documents'] });
      toast({ title: 'Document deleted' });
    } catch (e: any) {
      // Revert on failure
      setDeletingIds(prev => { const next = new Set(prev); next.delete(doc.id); return next; });
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };
  const handleRecategorize = async () => {
    if (!recategorizingDoc) return;
    try {
      const updates: Record<string, any> = { document_category: newCategory };
      updates.credential_id = newLinkedCredential === 'none' ? null : newLinkedCredential;
      await supabase.from('credential_documents').update(updates).eq('id', recategorizingDoc.id);
      queryClient.invalidateQueries({ queryKey: ['credential_documents'] });
      toast({ title: 'Document updated', description: 'Category and linked credential saved.' });
      setRecategorizingDoc(null);
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const openRecategorize = (doc: CredentialDocument) => {
    setRecategorizingDoc(doc);
    setNewCategory(doc.document_category);
    setNewLinkedCredential(doc.credential_id || 'none');
  };

  const handleRenameDoc = async (doc: CredentialDocument, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await supabase.from('credential_documents').update({ file_name: trimmed }).eq('id', doc.id);
      queryClient.invalidateQueries({ queryKey: ['credential_documents'] });
      toast({ title: 'Document renamed' });
    } catch (e: any) {
      toast({ title: 'Rename failed', description: e.message, variant: 'destructive' });
    }
    setRenamingDocId(null);
    setDocRenameValue('');
  };

  const handleReplace = async (file: File, doc: CredentialDocument) => {
    setUploading(true);
    try {
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
        folder: (doc as any).folder || '',
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

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (name.includes('/') || name.includes('\\')) {
      toast({ title: 'Invalid folder name', description: 'Folder names cannot contain slashes.', variant: 'destructive' });
      return;
    }
    const fullPath = currentFolder ? `${currentFolder}/${name}` : name;
    setManualFolders(prev => new Set(prev).add(fullPath));
    setCurrentFolder(fullPath);
    setShowCreateFolder(false);
    setNewFolderName('');
    toast({ title: 'Folder created', description: `"${name}" is ready. Upload files here.` });
  };

  const handleMoveToFolder = async (doc: CredentialDocument, targetFolder: string) => {
    try {
      await (supabase as any)
        .from('credential_documents')
        .update({ folder: targetFolder })
        .eq('id', doc.id);
      toast({ title: 'Document moved', description: `Moved to ${targetFolder || 'Root'}` });
      setMovingDoc(null);
    } catch (e: any) {
      toast({ title: 'Move failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.includes('/') || newName.includes('\\')) {
      toast({ title: 'Invalid name', variant: 'destructive' });
      return;
    }
    const parentPath = oldName.includes('/') ? oldName.substring(0, oldName.lastIndexOf('/')) : '';
    const newFullPath = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();

    try {
      // Update all documents in this folder and subfolders
      const docsToUpdate = documents.filter(d => {
        const f = (d as any).folder || '';
        return f === oldName || f.startsWith(oldName + '/');
      });

      for (const doc of docsToUpdate) {
        const docFolder = (doc as any).folder || '';
        const updatedFolder = docFolder === oldName
          ? newFullPath
          : newFullPath + docFolder.slice(oldName.length);
        await (supabase as any)
          .from('credential_documents')
          .update({ folder: updatedFolder })
          .eq('id', doc.id);
      }

      if (currentFolder === oldName) {
        setCurrentFolder(newFullPath);
      }
      toast({ title: 'Folder renamed' });
      setRenamingFolder(null);
      setRenameValue('');
    } catch (e: any) {
      toast({ title: 'Rename failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    const docsInFolder = documents.filter(d => {
      const f = (d as any).folder || '';
      return f === folderPath || f.startsWith(folderPath + '/');
    });
    if (docsInFolder.length > 0) {
      // Move docs to parent
      const parentPath = folderPath.includes('/') ? folderPath.substring(0, folderPath.lastIndexOf('/')) : '';
      for (const doc of docsInFolder) {
        await (supabase as any)
          .from('credential_documents')
          .update({ folder: parentPath })
          .eq('id', doc.id);
      }
      toast({ title: 'Folder removed', description: `${docsInFolder.length} file(s) moved to ${parentPath || 'root'}.` });
    } else {
      toast({ title: 'Folder removed' });
    }
    if (currentFolder === folderPath) {
      const parentPath = folderPath.includes('/') ? folderPath.substring(0, folderPath.lastIndexOf('/')) : '';
      setCurrentFolder(parentPath);
    }
  };

  const getFolderDisplayName = (folderPath: string) => {
    if (!folderPath) return 'All Documents';
    return folderPath.includes('/') ? folderPath.split('/').pop()! : folderPath;
  };

  const getFolderDocCount = (folderPath: string) => {
    return documents.filter(d => {
      const f = (d as any).folder || '';
      return f === folderPath || f.startsWith(folderPath + '/');
    }).length;
  };

  const breadcrumbs = useMemo(() => {
    if (!currentFolder) return [];
    const parts = currentFolder.split('/');
    return parts.map((part, i) => ({
      label: part,
      path: parts.slice(0, i + 1).join('/'),
    }));
  }, [currentFolder]);

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
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 text-sm">
        <Button
          variant={currentFolder ? 'ghost' : 'secondary'}
          size="sm"
          className="h-7 gap-1.5 px-2"
          onClick={() => setCurrentFolder('')}
        >
          <Home className="h-3.5 w-3.5" />
          All Documents
        </Button>
        {breadcrumbs.map((bc, i) => (
          <div key={bc.path} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Button
              variant={i === breadcrumbs.length - 1 ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setCurrentFolder(bc.path)}
            >
              <Folder className="h-3.5 w-3.5 mr-1" />
              {bc.label}
            </Button>
          </div>
        ))}
      </div>

      {/* Upload Zone — simplified to trigger stepper */}
      <div
        onDrop={e => { e.preventDefault(); setIsDragging(false); setShowUploadStepper(true); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
        onClick={() => setShowUploadStepper(true)}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={cn('p-3 rounded-full', isDragging ? 'bg-primary/10' : 'bg-muted')}>
            <Upload className={cn('h-6 w-6', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="font-medium text-sm">Click to upload documents</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload → Categorize → Choose folder
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar: Filters + New Folder */}
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

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreateFolder(true)}>
          <FolderPlus className="h-4 w-4" /> New Folder
        </Button>

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
        <StatCard label="Folders" count={allFolders.length} icon={Folder} />
        <StatCard label="Linked to Credentials" count={documents.filter(d => d.credential_id).length} icon={File} />
        <StatCard label="Uploaded This Month" count={documents.filter(d => {
          const uploaded = new Date(d.uploaded_at);
          const now = new Date();
          return uploaded.getMonth() === now.getMonth() && uploaded.getFullYear() === now.getFullYear();
        }).length} icon={Upload} />
      </div>

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Folder className="h-4 w-4" /> Folders
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {subfolders.map(folder => {
              const displayName = getFolderDisplayName(folder);
              const docCount = getFolderDocCount(folder);
              const isRenaming = renamingFolder === folder;

              return (
                <Card
                  key={folder}
                  className="group hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => !isRenaming && setCurrentFolder(folder)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Folder className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setRenamingFolder(folder); setRenameValue(displayName); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteFolder(folder)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {isRenaming ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameFolder(folder, renameValue);
                            if (e.key === 'Escape') setRenamingFolder(null);
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRenameFolder(folder, renameValue)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{docCount} file{docCount !== 1 ? 's' : ''}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && subfolders.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="p-4 rounded-full bg-muted inline-block mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {currentFolder ? 'Empty Folder' : 'No Documents'}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {currentFolder
                ? 'This folder is empty. Upload files or create subfolders.'
                : documents.length === 0
                  ? 'Upload your first document using the drag & drop zone above.'
                  : 'No documents match your filters.'}
            </p>
            {currentFolder && (
              <Button variant="outline" className="mt-4" onClick={() => {
                const parent = currentFolder.includes('/')
                  ? currentFolder.substring(0, currentFolder.lastIndexOf('/'))
                  : '';
                setCurrentFolder(parent);
              }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid View */}
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
                  renamingDocId === doc.id ? (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={docRenameValue}
                          onChange={e => setDocRenameValue(e.target.value)}
                          autoFocus
                          className="h-8 text-sm"
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameDoc(doc, docRenameValue);
                            if (e.key === 'Escape') { setRenamingDocId(null); setDocRenameValue(''); }
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRenameDoc(doc, docRenameValue)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setRenamingDocId(null); setDocRenameValue(''); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      credentialName={linkedCredentialName(doc.credential_id)}
                      onPreview={() => handlePreview(doc)}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => handleDelete(doc)}
                      onReplace={() => setReplacingDocId(doc.id)}
                      onMove={() => setMovingDoc(doc)}
                      onRename={() => { setRenamingDocId(doc.id); setDocRenameValue(doc.file_name); }}
                      onRecategorize={() => openRecategorize(doc)}
                    />
                  )
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
                <TableHead>Folder</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => {
                const Icon = getFileIcon(doc.file_type);
                const folder = (doc as any).folder || '';
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      {renamingDocId === doc.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={docRenameValue}
                            onChange={e => setDocRenameValue(e.target.value)}
                            autoFocus
                            className="h-7 text-sm max-w-[200px]"
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameDoc(doc, docRenameValue);
                              if (e.key === 'Escape') { setRenamingDocId(null); setDocRenameValue(''); }
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRenameDoc(doc, docRenameValue)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">{doc.file_name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {DOCUMENT_CATEGORY_LABELS[doc.document_category] || doc.document_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {linkedCredentialName(doc.credential_id) || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {folder ? (
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => setCurrentFolder(folder)}>
                          <Folder className="h-3 w-3" /> {getFolderDisplayName(folder)}
                        </button>
                      ) : '—'}
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenamingDocId(doc.id); setDocRenameValue(doc.file_name); }} title="Rename">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMovingDoc(doc)} title="Move to folder">
                          <MoveRight className="h-3.5 w-3.5" />
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
                  {(previewDoc as any).folder && (
                    <span>Folder: {(previewDoc as any).folder}</span>
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
            <Button variant="outline" onClick={() => previewDoc && setMovingDoc(previewDoc)}>
              <MoveRight className="mr-2 h-4 w-4" /> Move
            </Button>
            <Button variant="outline" onClick={() => previewDoc && setReplacingDocId(previewDoc.id)}>
              <Replace className="mr-2 h-4 w-4" /> Replace
            </Button>
            <Button onClick={() => previewDoc && handleDownload(previewDoc)}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" /> Create Folder
            </DialogTitle>
            <DialogDescription>
              {currentFolder
                ? `Create a subfolder inside "${getFolderDisplayName(currentFolder)}"`
                : 'Create a new folder to organize your documents'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                <FolderPlus className="mr-2 h-4 w-4" /> Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <Dialog open={!!movingDoc} onOpenChange={open => { if (!open) setMovingDoc(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveRight className="h-5 w-5" /> Move Document
            </DialogTitle>
            <DialogDescription>
              Move "{movingDoc?.file_name}" to a folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <button
              className={cn(
                'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors text-left',
                (movingDoc && ((movingDoc as any).folder || '') === '') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
              onClick={() => movingDoc && handleMoveToFolder(movingDoc, '')}
            >
              <Home className="h-4 w-4" /> Root (No folder)
            </button>
            {allFolders.map(folder => (
              <button
                key={folder}
                className={cn(
                  'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors text-left',
                  (movingDoc && (movingDoc as any).folder === folder) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
                onClick={() => movingDoc && handleMoveToFolder(movingDoc, folder)}
              >
                <Folder className="h-4 w-4" /> {folder}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Stepper Dialog */}
      <DocumentUploadStepper
        open={showUploadStepper}
        onOpenChange={setShowUploadStepper}
        credentials={credentials}
        allFolders={allFolders}
        currentFolder={currentFolder}
        onUpload={handleStepperUpload}
      />

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

function DocumentCard({ doc, credentialName, onPreview, onDownload, onDelete, onReplace, onMove, onRename }: {
  doc: CredentialDocument;
  credentialName: string | null;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onReplace: () => void;
  onMove: () => void;
  onRename: () => void;
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRename} title="Rename">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMove} title="Move to folder">
              <MoveRight className="h-3.5 w-3.5" />
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
