import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Monitor, Wifi, KeyRound, DoorOpen, Edit2, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ClinicNotesCardProps {
  facility: any;
  onUpdate: (f: any) => void;
}

const SECTIONS = [
  { key: 'tech_computer_info', label: 'Computer / Login', icon: Monitor, placeholder: 'Computer login, desktop credentials...' },
  { key: 'tech_wifi_info', label: 'WiFi', icon: Wifi, placeholder: 'Network name, password...' },
  { key: 'tech_pims_info', label: 'PIMS Credentials', icon: KeyRound, placeholder: 'PIMS system, username, password...' },
  { key: 'clinic_access_info', label: 'Clinic Access', icon: DoorOpen, placeholder: 'Door codes, parking, key pickup, building hours...' },
] as const;

type FieldKey = typeof SECTIONS[number]['key'];

export function ClinicNotesCard({ facility, onUpdate }: ClinicNotesCardProps) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Record<FieldKey, string>>({
    tech_computer_info: facility.tech_computer_info || '',
    tech_wifi_info: facility.tech_wifi_info || '',
    tech_pims_info: facility.tech_pims_info || '',
    clinic_access_info: facility.clinic_access_info || '',
  });

  const hasAnyContent = SECTIONS.some(s => facility[s.key]);

  const handleSave = () => {
    onUpdate({ ...facility, ...fields });
    setEditing(false);
    toast.success('Clinic notes saved');
  };

  const handleCancel = () => {
    setFields({
      tech_computer_info: facility.tech_computer_info || '',
      tech_wifi_info: facility.tech_wifi_info || '',
      tech_pims_info: facility.tech_pims_info || '',
      clinic_access_info: facility.clinic_access_info || '',
    });
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Clinic Notes</CardTitle>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-3 w-3" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            {SECTIONS.map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </Label>
                <Textarea
                  value={fields[key]}
                  onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={2}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        ) : hasAnyContent ? (
          <div className="space-y-3">
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const value = facility[key];
              if (!value) return null;
              return (
                <div key={key} className="flex gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add tech access, WiFi, PIMS, or clinic access info</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
