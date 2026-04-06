

# Improve Schedule: Shift Details on Month View + Personal Time Blocks

## What Changes

### 1. Show timing and rate on monthly calendar cells

Currently each shift in the month grid only shows `"8AM Greenfield"`. This will be enhanced to also display the time range and rate, making the calendar immediately informative without clicking.

**New cell layout per shift:**
```text
8a–6p Greenfield Medical
$850 · 10h
```

### 2. Personal Time Blocks (Vacation, Family Time, etc.)

A new `time_blocks` table stores user-created blocked periods that appear on the calendar alongside shifts. These are not billable shifts — they represent unavailable time.

**Block types:** Vacation, Family Time, Appointment, Training, Other (custom label)

## Database

**New table: `time_blocks`**

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| user_id | uuid | auth.uid() |
| title | text | required |
| block_type | text | 'vacation' |
| start_datetime | timestamptz | required |
| end_datetime | timestamptz | required |
| all_day | boolean | false |
| notes | text | '' |
| color | text | 'gray' |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: Users can CRUD own time blocks (`auth.uid() = user_id`).

## File Changes

| File | Change |
|------|--------|
| **Migration** | Create `time_blocks` table with RLS |
| `src/types/index.ts` | Add `TimeBlock` interface and `BLOCK_COLORS` constant |
| `src/contexts/DataContext.tsx` | Add `timeBlocks` state, fetch/CRUD helpers, realtime subscription |
| `src/pages/SchedulePage.tsx` | (1) Update `renderDayCell` to show time range + rate on shifts. (2) Render time blocks in month/week/list views. (3) Add "Block Time" button next to "Add Shift". (4) Add block time dialog state management |
| `src/components/schedule/BlockTimeDialog.tsx` | **New** — Dialog form with: title, block type dropdown (Vacation/Family/Appointment/Training/Other), date range picker, optional all-day toggle, notes, color picker |
| `src/components/schedule/WeekTimeGrid.tsx` | Render time blocks as semi-transparent striped bars alongside shifts |

## Month Cell Shift Detail

The shift chip in month view changes from:
```
8AM Greenfield
```
to:
```
8a–6p Greenfield
$850 · 10h
```

On small cells (mobile), it falls back to the compact single-line format.

## Time Block Rendering

- **Month view**: Rendered as a muted chip with an icon (e.g. palm tree for vacation) and the title, using a hatched/striped background pattern to visually distinguish from shifts
- **Week view**: Rendered as semi-transparent overlay bars spanning the blocked hours
- **List view**: Shown in a separate "Blocked Time" section or interleaved with a distinct style
- **Conflict awareness**: When adding a new shift, blocked time periods trigger a soft warning (not a hard block)

## Block Time Dialog Fields

- Title (e.g. "Spring Break", "Dr. Appointment")
- Type: Vacation | Family Time | Appointment | Training | Other
- Start date + End date (multi-day support)
- All-day toggle (if off, shows start/end time pickers)
- Notes (optional)
- Color picker (gray, purple, teal, pink — distinct from shift colors)

