import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCredentialPortal } from '@/hooks/useCredentialPortal';
import { ExternalLink, Eye, EyeOff, Copy, Save, Globe, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  credentialId: string;
}

export function RenewalPortalSection({ credentialId }: Props) {
  const { portal, isLoading, decryptedPassword, upsertPortal } = useCredentialPortal(credentialId);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (portal) {
      setUrl(portal.renewal_website_url || '');
      setUsername(portal.renewal_username || '');
      setPassword(decryptedPassword || '');
      setNotes(portal.renewal_portal_notes || '');
    }
  }, [portal, decryptedPassword]);

  const hasData = portal && (portal.renewal_website_url || portal.renewal_username || portal.renewal_password_encrypted);

  const handleSave = async () => {
    await upsertPortal.mutateAsync({
      renewal_website_url: url || null,
      renewal_username: username || null,
      renewal_password_encrypted: password || null,
      renewal_portal_notes: notes || null,
    });
    setEditing(false);
    setShowPassword(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (isLoading) return null;

  // Collapsed read-only view
  if (!editing && !hasData) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Renewal Portal</h3>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Add Portal Info
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Store your renewal website login for quick access.</p>
      </div>
    );
  }

  if (!editing && hasData) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Renewal Portal</h3>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>

        {portal?.renewal_website_url && (
          <div className="flex items-center gap-2">
            <a
              href={portal.renewal_website_url.startsWith('http') ? portal.renewal_website_url : `https://${portal.renewal_website_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              Open renewal website
            </a>
          </div>
        )}

        {portal?.renewal_username && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Username: <span className="text-foreground">{portal.renewal_username}</span></span>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => copyToClipboard(portal.renewal_username!, 'Username')}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </div>
        )}

        {portal?.renewal_password_encrypted && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Password: <span className="text-foreground font-mono">{showPassword ? decryptedPassword : '••••••••'}</span>
            </span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showPassword ? 'Hide' : 'Reveal'}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => copyToClipboard(decryptedPassword || '', 'Password')}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </div>
        )}

        {portal?.renewal_portal_notes && (
          <p className="text-xs text-muted-foreground">{portal.renewal_portal_notes}</p>
        )}

        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Access restricted to your account only.
        </p>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Renewal Portal</h3>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Website URL</Label>
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://renewal.example.com" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Username / Email</Label>
        <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="your@email.com" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Password</Label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Stored securely and encrypted.
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Use personal email login" rows={2} />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setShowPassword(false); }}>Cancel</Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={upsertPortal.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" /> {upsertPortal.isPending ? 'Saving…' : 'Save Portal'}
        </Button>
      </div>
    </div>
  );
}
