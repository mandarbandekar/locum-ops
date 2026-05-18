import { SettingsNav } from '@/components/SettingsNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Database, KeyRound, Server, Eye, ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function SettingsSecurityPage() {
  return (
    <div>
      <SettingsNav />
      <div className="page-header flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/settings/account"><ArrowLeft className="h-4 w-4" /> Your Account</Link>
        </Button>
      </div>
      <h1 className="page-title">Security & Encryption</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Your data is protected with bank-grade encryption — both while traveling between your device and our servers, and while sitting at rest in our database. Here's exactly what that means in plain language.
      </p>

      <div className="grid gap-6 max-w-2xl">
        {/* In transit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" /> Encryption in Transit (TLS 1.2+)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Every byte that moves between your browser, our app, and our servers is protected by <span className="text-foreground font-medium">TLS 1.2 / 1.3 with 256-bit AES cipher suites</span> — the same standard used by banks and healthcare providers.
            </p>
            <p>
              That means no one on your Wi-Fi, your internet provider, or anywhere along the route can read or tamper with your shifts, invoices, or credentials.
            </p>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              You can verify this yourself — look for the padlock icon in your browser's address bar.
            </div>
          </CardContent>
        </Card>

        {/* At rest */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> Encryption at Rest (AES-256)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              All of your data — every clinic, shift, invoice, expense, credential, document, and setting — is stored on disks that are encrypted with <span className="text-foreground font-medium">AES-256</span>, the strongest widely-used encryption standard available.
            </p>
            <p>This applies to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The database (clinics, shifts, invoices, expenses, credentials, tax data, settings)</li>
              <li>File storage (uploaded contracts, receipts, credential documents, feedback screenshots)</li>
              <li>Automatic database backups</li>
            </ul>
            <p>
              Even if someone got physical access to the underlying storage, the data would be unreadable without the encryption keys, which are managed separately.
            </p>
          </CardContent>
        </Card>

        {/* Field-level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Extra Field-Level Encryption
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              For the most sensitive information, we add a second layer of encryption <span className="text-foreground font-medium">before</span> the data is written to the database. Each value is encrypted with <span className="text-foreground font-medium">AES-256-GCM</span> using a key that is never exposed to the app or the browser.
            </p>
            <p>The fields with this extra protection today are:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-foreground font-medium">Renewal portal passwords</span> stored on your credentials (state board, DEA, etc.)</li>
            </ul>
            <p>
              These values are hidden by default in the interface — you have to tap "Reveal" to see them, and copying is one click so you never have to type them.
            </p>
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
              <Eye className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Even our own engineers cannot read your portal passwords from the raw database — only your signed-in session can decrypt them.</span>
            </div>
          </CardContent>
        </Card>

        {/* Tax documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Tax Documents (W-9)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              When you upload a W-9 from <Link to="/settings/account" className="text-primary hover:underline">Your Account</Link>, the file is stored as an <span className="text-foreground font-medium">opaque, encrypted document</span> in private storage — protected by the same AES-256 at-rest encryption as the rest of your data.
            </p>
            <p>
              We <span className="text-foreground font-medium">never read, parse, or extract</span> any information from the file — including your SSN. The contents are shown back only to you, and only through short-lived (5-minute) secure links generated for your signed-in session.
            </p>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              If you'd rather not store your W-9 at all, you can skip the upload — it's entirely optional.
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Account Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Your account is protected by email + password sign-in over HTTPS. Passwords are <span className="text-foreground font-medium">never stored in plain text</span> — only a salted, one-way hash is kept, so even we can't see your password.
            </p>
            <p>
              Sessions automatically time out after 15 minutes of inactivity, with a 2-minute warning before you're signed out.
            </p>
            <p>
              To change your password, use the "Forgot Password" link on the sign-in screen.
            </p>
          </CardContent>
        </Card>

        {/* Isolation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Your Data Is Yours Only
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Every record in the database is tagged with your user ID and protected by row-level security rules enforced by the database itself. Even if another user knew the exact location of your data, the database would refuse to return it to them.
            </p>
            <p>
              You can delete your entire account and all associated data at any time from the <Link to="/settings/account" className="text-primary hover:underline">Your Account</Link> page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
