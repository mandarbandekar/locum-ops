## Changes

### 1. Compliance Overview (`src/components/compliance/ComplianceOverview.tsx`)
Strip the page down to just attention items and the setup checklist:

- Remove the 5 summary tiles at the top (Active Credentials, Renewals Due Soon, Missing Documents, CE Incomplete, Ready to Renew).
- Remove the right sidebar entirely: **Readiness Overview** card and **Suggestions** card.
- Remove the **Upcoming Renewals** card from Overview (it stays available under the Renewals tab).
- Keep: empty state, Setup Checklist (when applicable), and the **Attention Needed** card.
- Drop the now-unused 2-column grid; render Attention Needed full width.
- Clean up unused imports (`Progress`, `useComplianceData`'s `upcomingRenewals`/`enrichedCredentials`/`summary`, readiness helpers, `CredentialExpirationChip`, `Link2`, `Activity`, `ArrowRight`, `ChevronRight`, `CREDENTIAL_TYPE_LABELS`, etc.).

### 2. CE associations under a credential (`src/components/credentials/AddCredentialDialog.tsx`)
Replace the "Recent CE Entries" list (currently capped to 4 most recent) with **all linked CE entries grouped by delivery format**:

- Use `ceStats.linkedEntries` (already returned from `getCredentialCEStats`).
- Group by `entry.delivery_format` (fallback bucket "Other" for empty values).
- Render each group as a small section: format name + count + total hours, followed by the entry rows (same row style as today: title, hours, cert status icon).
- Sort groups alphabetically; sort entries within a group by `completion_date` desc.
- Section header copy: "CE Entries by Format" instead of "Recent CE Entries".

No DB, hook, or routing changes. Renewals tab already shows Upcoming Renewals, so no work needed there.

## Out of scope
- Readiness engine logic itself (`src/lib/complianceReadiness.ts`) stays — it still drives the credential-level score shown elsewhere.
- No changes to the tab list on `CredentialsPage`.
