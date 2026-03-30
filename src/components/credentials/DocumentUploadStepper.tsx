import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DOCUMENT_CATEGORY_LABELS } from '@/lib/credentialTypes';
import { cn } from '@/lib/utils';
import {
  Upload, FileText, FileImage, File, Check, ChevronRight,
  Folder, FolderPlus, Home, X
} from 'lucide-react';

type Credential = { id: string; custom_title: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: Credential[];
  allFolders: string[];
  currentFolder: string;
  onUpload: (files: File[], category: string, credentialId: string | undefined, folder: string) => Promise<void>;
}

type Step = 'upload' | 'categorize' | 'folder';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'categorize', label: 'Categorize' },
  { key: 'folder', label: 'Organize' },
];

function getFileIcon(file: File) {
  if (file.type === 'application/pdf') return FileText;
  if (file.type.startsWith('image/')) return FileImage;
  return File;
}

export function DocumentUploadStepper({ open, onOpenChange, credentials, allFolders, currentFolder, onUpload }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('custom');
  const [credentialId, setCredentialId] = useState('none');
  const [selectedFolder, setSelectedFolder] = useState(currentFolder);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFiles([]);
    setCategory('custom');
    setCredentialId('none');
    setSelectedFolder(currentFolder);
    setNewFolderName('');
    setShowNewFolder(false);
    setUploading(false);
  }, [currentFolder]);

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleFileSelect = (fileList: FileList | null) => {
    if (fileList) setFiles(prev => [...prev, ...Array.from(fileList)]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name || name.includes('/') || name.includes('\\')) return;
    const fullPath = currentFolder ? `${currentFolder}/${name}` : name;
    setSelectedFolder(fullPath);
    setShowNewFolder(false);
    setNewFolderName('');
  };

  const handleFinish = async () => {
    setUploading(true);
    try {
      await onUpload(files, category, credentialId === 'none' ? undefined : credentialId, selectedFolder);
      reset();
      onOpenChange(false);
    } catch {
      setUploading(false);
    }
  };

  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Select the files you want to upload'}
            {step === 'categorize' && 'Choose a category and optionally link to a credential'}
            {step === 'folder' && 'Choose where to save your documents'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors',
                i < stepIndex ? 'bg-primary text-primary-foreground' :
                i === stepIndex ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              )}>
                {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn(
                'text-sm font-medium',
                i === stepIndex ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }}
              />
              <div className="flex flex-col items-center gap-2">
                <div className={cn('p-3 rounded-full', isDragging ? 'bg-primary/10' : 'bg-muted')}>
                  <Upload className={cn('h-6 w-6', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <p className="font-medium text-sm">Drag & drop files here, or click to browse</p>
                <p className="text-xs text-muted-foreground">PDFs, images, and common office documents</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {files.map((file, i) => {
                  const Icon = getFileIcon(file);
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Categorize */}
        {step === 'categorize' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-2">
              <Badge variant="secondary">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
              <span className="text-sm text-muted-foreground truncate">
                {files.map(f => f.name).join(', ')}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Document Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Link to Credential (optional)</label>
                <Select value={credentialId} onValueChange={setCredentialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {credentials.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.custom_title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Folder */}
        {step === 'folder' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose a folder or create a new one.</p>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              <button
                className={cn(
                  'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors text-left',
                  selectedFolder === '' ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'hover:bg-muted'
                )}
                onClick={() => setSelectedFolder('')}
              >
                <Home className="h-4 w-4" /> Root (No folder)
              </button>
              {allFolders.map(folder => (
                <button
                  key={folder}
                  className={cn(
                    'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors text-left',
                    selectedFolder === folder ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'hover:bg-muted'
                  )}
                  onClick={() => setSelectedFolder(folder)}
                >
                  <Folder className="h-4 w-4" /> {folder}
                </button>
              ))}
            </div>

            {showNewFolder ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New folder name"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNewFolder(true)}>
                <FolderPlus className="h-4 w-4" /> Create New Folder
              </Button>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'categorize') setStep('upload');
              else if (step === 'folder') setStep('categorize');
              else handleClose(false);
            }}
          >
            {step === 'upload' ? 'Cancel' : 'Back'}
          </Button>

          {step === 'upload' && (
            <Button onClick={() => setStep('categorize')} disabled={files.length === 0}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'categorize' && (
            <Button onClick={() => setStep('folder')}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'folder' && (
            <Button onClick={handleFinish} disabled={uploading}>
              {uploading ? 'Uploading…' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
