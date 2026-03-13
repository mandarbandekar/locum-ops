import { SettingsNav } from '@/components/SettingsNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, Lock } from 'lucide-react';

export default function SettingsSecurityPage() {
  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Security</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        How LocumOps handles sensitive data and account security.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Credential Portal Passwords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Renewal portal URLs, usernames, and passwords stored in your credential details are encrypted at rest and hidden by default.
            </p>
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
              <Eye className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Sensitive information is stored securely and hidden by default. Use the reveal button on individual credential detail pages to view or copy these fields.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Edit credential-specific renewal URLs and passwords in the credential detail view, not here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your account is protected by email-based authentication. Future enhancements may include two-factor authentication (2FA) and session management.
            </p>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                To change your password, use the "Forgot Password" flow from the login page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
