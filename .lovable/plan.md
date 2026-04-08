

# Guided Facility Creation Flow — UX Improvements

## Current Issues

1. **No visual step map** — users see "Step 3 of 7" text but can't see what's ahead or what's done
2. **No context on WHY** — steps ask for data without explaining how it's used in the app
3. **Bare header** — dialog title is static "Add Practice Facility" with no per-step icon or guidance
4. **No welcome/intro** — jumps straight into the search field with no orientation
5. **Skip logic is unclear** — "Skip & add later" link is easy to miss; mandatory vs optional steps aren't visually distinct

## Proposed Changes (single file: `AddFacilityDialog.tsx`)

### A. Add a Welcome Step (Step 0)
Insert a brief intro step before the current flow:
- Friendly headline: "Let's set up your practice"
- 3-4 bullet points explaining what the wizard collects and why (clinic info, billing contacts, invoicing preferences)
- Note that only clinic name and billing contacts are required — everything else can be added later
- Single "Get Started" CTA

### B. Visual Step Indicator
Replace the plain "Step X of Y" text with a horizontal stepper showing icons for each phase:
- Each step gets its existing icon (Building2, DollarSign, Monitor, DoorOpen, UserCheck, CalendarClock, FileText)
- Completed steps show a green checkmark
- Current step is highlighted with primary color
- Future steps are muted
- Mandatory steps (General, Scheduling Contact, Invoice Settings) get a subtle dot indicator

### C. Contextual "Why This Matters" Hints
Add a short, friendly explanation card at the top of each step:

| Step | Hint |
|---|---|
| General | "This is how the clinic appears across your schedule, invoices, and reports." |
| Shift Rates | "Setting rates now means your invoices calculate automatically — no manual math." |
| Tech Access | "Store login info here so you're never scrambling on your first morning at a clinic." |
| Clinic Access | "Door codes and parking details in one place — handy before each shift." |
| Scheduling Contact | "This person receives shift confirmation emails so clinics know when you're coming." |
| Invoicing Preferences | "Controls how often draft invoices are created from your completed shifts." |
| Invoice Settings | "The billing contact who receives your invoices. Required for auto-sending." |

### D. Required vs Optional Badge
- Steps 0 (General), 4 (Scheduling Contact), and 6 (Invoice Settings) show a small "Required" badge next to the step label
- Optional steps show "Optional — skip anytime" more prominently, with the skip button styled as a secondary button rather than a text link

### E. Completion Summary Before Submit
On the final step, after the invoice settings fields, add a compact summary card showing what was filled vs skipped:
- Clinic name + address
- Rates: X configured / skipped
- Tech access: filled / skipped
- Scheduling contact: name + email
- Billing cadence + auto-generate status
- Billing contact: name + email

This gives users confidence before clicking "Add Facility".

## Technical Approach

- All changes in `src/components/AddFacilityDialog.tsx`
- Add a `STEP_META` array with icon, hint text, and required flag for each step
- Insert step index 0 as the welcome screen, shifting existing steps by +1 (total becomes 8)
- Stepper rendered as a flex row of small icon circles with connecting lines
- Summary card is a simple grid at the bottom of the last step
- No new components, no database changes, no new dependencies

