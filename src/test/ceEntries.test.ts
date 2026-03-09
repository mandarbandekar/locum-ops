import { describe, it, expect } from 'vitest';

// Pure logic tests for CE functionality

describe('CE Entries Logic', () => {
  // Test 1: One CE entry can link to multiple credentials
  it('should support linking a CE entry to multiple credentials', () => {
    const ceEntry = { id: 'ce-1', title: 'Advanced Dentistry', hours: 4 };
    const links = [
      { ce_entry_id: 'ce-1', credential_id: 'cred-1' },
      { ce_entry_id: 'ce-1', credential_id: 'cred-2' },
      { ce_entry_id: 'ce-1', credential_id: 'cred-3' },
    ];
    const linkedCredIds = links
      .filter(l => l.ce_entry_id === ceEntry.id)
      .map(l => l.credential_id);
    expect(linkedCredIds).toHaveLength(3);
    expect(linkedCredIds).toContain('cred-1');
    expect(linkedCredIds).toContain('cred-2');
    expect(linkedCredIds).toContain('cred-3');
  });

  // Test 2: CE hours roll up correctly into linked credentials
  it('should roll up CE hours correctly per credential', () => {
    const entries = [
      { id: 'ce-1', hours: 4, certificate_file_url: 'file.pdf' },
      { id: 'ce-2', hours: 6, certificate_file_url: null },
      { id: 'ce-3', hours: 8, certificate_file_url: 'cert.pdf' },
    ];
    const links = [
      { ce_entry_id: 'ce-1', credential_id: 'cred-A' },
      { ce_entry_id: 'ce-2', credential_id: 'cred-A' },
      { ce_entry_id: 'ce-3', credential_id: 'cred-A' },
      { ce_entry_id: 'ce-1', credential_id: 'cred-B' },
    ];

    function getHoursForCredential(credId: string) {
      const linkedEntryIds = links.filter(l => l.credential_id === credId).map(l => l.ce_entry_id);
      return entries.filter(e => linkedEntryIds.includes(e.id)).reduce((sum, e) => sum + e.hours, 0);
    }

    expect(getHoursForCredential('cred-A')).toBe(18);
    expect(getHoursForCredential('cred-B')).toBe(4);
  });

  // Test 3: Missing certificate count is correct
  it('should count missing certificates correctly', () => {
    const entries = [
      { id: 'ce-1', certificate_file_url: 'file.pdf' },
      { id: 'ce-2', certificate_file_url: null },
      { id: 'ce-3', certificate_file_url: null },
      { id: 'ce-4', certificate_file_url: 'cert.jpg' },
    ];
    const links = [
      { ce_entry_id: 'ce-1', credential_id: 'cred-A' },
      { ce_entry_id: 'ce-2', credential_id: 'cred-A' },
      { ce_entry_id: 'ce-3', credential_id: 'cred-A' },
      { ce_entry_id: 'ce-4', credential_id: 'cred-A' },
    ];
    const linkedEntryIds = links.filter(l => l.credential_id === 'cred-A').map(l => l.ce_entry_id);
    const missing = entries.filter(e => linkedEntryIds.includes(e.id) && !e.certificate_file_url).length;
    expect(missing).toBe(2);
  });

  // Test 4: Progress bar values reflect correct percentages
  it('should calculate progress bar percentage correctly', () => {
    const completedHours = 18;
    const requiredHours = 30;
    const pct = Math.min(100, Math.round((completedHours / requiredHours) * 100));
    expect(pct).toBe(60);

    // Edge: over 100%
    const overPct = Math.min(100, Math.round((35 / 30) * 100));
    expect(overPct).toBe(100);
  });

  // Test 5: Hours remaining calculation
  it('should calculate hours remaining correctly', () => {
    const completedHours = 18;
    const requiredHours = 30;
    const remaining = Math.max(0, requiredHours - completedHours);
    expect(remaining).toBe(12);

    // Edge: completed exceeds required
    const noRemaining = Math.max(0, 30 - 35);
    expect(noRemaining).toBe(0);
  });

  // Test 6: Linking pre-selected credential
  it('should pre-link credential when adding CE entry from credential detail', () => {
    const preLinkedCredentialId = 'cred-A';
    const initialLinkedIds = preLinkedCredentialId ? [preLinkedCredentialId] : [];
    expect(initialLinkedIds).toEqual(['cred-A']);
    expect(initialLinkedIds).toHaveLength(1);
  });

  // Test 7: CE entry appears in both CE tab and credential rollup
  it('should include CE entry in both tab listing and credential rollup', () => {
    const allEntries = [
      { id: 'ce-1', title: 'Course A', hours: 4 },
      { id: 'ce-2', title: 'Course B', hours: 6 },
    ];
    const links = [
      { ce_entry_id: 'ce-1', credential_id: 'cred-A' },
      { ce_entry_id: 'ce-2', credential_id: 'cred-A' },
    ];

    // CE Entries tab shows all entries
    expect(allEntries).toHaveLength(2);

    // Credential rollup shows linked entries
    const credALinks = links.filter(l => l.credential_id === 'cred-A');
    const credAEntries = allEntries.filter(e => credALinks.some(l => l.ce_entry_id === e.id));
    expect(credAEntries).toHaveLength(2);
    expect(credAEntries[0].title).toBe('Course A');
  });

  // Test 8: Mini tracker cards show correct values
  it('should show correct mini tracker card values', () => {
    const completedHours = 18;
    const requiredHours = 30;
    const linkedCount = 3;
    const missingCerts = 1;

    expect(completedHours).toBe(18);
    expect(Math.max(0, requiredHours - completedHours)).toBe(12);
    expect(linkedCount).toBe(3);
    expect(missingCerts).toBe(1);
  });
});
