

# Simplify Clinic Confirmations UX

## Problem

The current experience has too many layers, statuses, filters, and tabs. Relief vets need a simple monthly ritual: "For each clinic I'm working at next month, confirm my schedule with them." The current UI has:

- Overly complex overview with 4 categorized sections (auto-scheduled, needs update, manual review, recently sent)
- Status/facility filters that add cognitive load
- A drawer with 3 tabs (Monthly, Pre-shift, History) that splits attention
- Settings configuration mixed into the confirmation flow
- Too many status states visible at once (not_sent, scheduled, sent, confirmed, needs_update, failed)

## Proposed Redesign: "Confirm & Send" Checklist

Replace the current multi-section, multi-filter layout with a single **linear checklist** — one row per clinic, all on one screen.

```text
Current                              Proposed
─────────                            ────────
Overview tab with 4 sections    →    Single checklist (one row per clinic)
+ History tab                        Each row: clinic name, shift count,
+ Filters (status, facility)           status pill, expand to preview/edit/send
+ Drawer with 3 sub-tabs            "Send All" bulk action at top
                                    History collapsed into each clinic row
```

## New Layout

### Header
- Month navigator (keep as-is)
- Summary strip: "3 clinics · 2 ready to send · 1 confirmed"
- **"Send All Unsent"** button (bulk action for all not_sent clinics with contacts)

### Clinic Checklist (vertical list, no grid)
Each clinic is an **accordion row** (not a card grid):

**Collapsed state (single row):**
```text
[●] Greenfield Vet   |  5 shifts  |  Sarah J.  |  ✓ Confirmed    [Review ▾]
[●] Evergreen HC      |  3 shifts  |  Dr. Park  |  ⏳ Not Sent     [Send ▸]
[●] Mt. View Practice |  2 shifts  |  No contact |  ⚠ Add contact  [Setup ▸]
```

- Status dot: green (confirmed), blue (sent), gray (not sent), orange (needs update)
- Primary action button changes based on state: "Send", "Resend", "Review", "Add Contact"
- Single click on the action button performs the action directly (no drawer)

**Expanded state (inline, no drawer):**
When user clicks "Review" or wants to edit the message:
- Shows shift table inline (compact: date + time only)
- Shows editable message textarea (pre-populated)
- Shows subject line (editable)
- Action buttons: "Copy to Clipboard" | "Send Confirmation" | "Mark Confirmed"
- Collapse back to row when done

### Key UX Decisions
1. **No drawer** — everything happens inline in the accordion. Fewer context switches.
2. **No separate filters** — the list is short (typically 3-8 clinics). Status dots provide at-a-glance filtering.
3. **No separate History tab** — move "last sent" timestamp into each row. Full history accessible via a small "View history" link that expands a mini-timeline below the message area.
4. **No separate Pre-shift section** — pre-shift reminders are a secondary action shown as a subtle link within the expanded row, not a separate tab.
5. **"Send All" bulk action** — the most requested workflow is "send all my confirmations at once." One button does it.
6. **Contact setup inline** — if no contact, the row shows "Add contact" as the primary action, with inline name/email fields (no dialog).

## File Changes

| File | Change |
|---|---|
| `src/components/schedule/ClinicConfirmationsTab.tsx` | Full rewrite — replace grid/tabs/filters with accordion checklist + bulk send |
| `src/components/schedule/ClinicConfirmationDrawer.tsx` | Delete — no longer needed, everything is inline |

## No database, routing, or hook changes. The `useClinicConfirmations` hook already provides everything needed.

