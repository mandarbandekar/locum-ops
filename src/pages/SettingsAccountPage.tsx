import { SettingsNav } from '@/components/SettingsNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function SettingsAccountPage() {
  const { user, isDemo, signOut } = useAuth();

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Account</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your login and account preferences.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Login</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Email</span>
              <p className="text-sm font-medium">{isDemo ? 'demo@locumops.com' : user?.email || '—'}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              To change your login email, contact support.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Session</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Data & Export</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Account data export and deletion options will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
