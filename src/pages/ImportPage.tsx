import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, Info } from 'lucide-react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Import Data</h1>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import from Spreadsheet
            </CardTitle>
            <CardDescription>Upload a CSV file with your facility data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="max-w-xs mx-auto"
                />
              </div>
              {file && <p className="text-sm text-primary font-medium">{file.name} selected</p>}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" /> Coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                Full CSV parsing and automatic facility/shift import is coming in a future update. For now, you can add facilities and shifts manually through the app.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Expected CSV format:</p>
              <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                name,address,timezone,status,notes<br />
                "Greenfield Medical Center","123 Oak St, Portland, OR","America/Los_Angeles","active","Great team"
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
