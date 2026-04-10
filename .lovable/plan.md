

# Fix Spotlight Tour: Persist Completion Server-Side

## Problem
Tour completion flags are stored in `localStorage`, which is:
- Lost when browser data is cleared
- Not shared across devices
- Reset in incognito/private browsing

This causes tours to re-trigger on every fresh login instead of just once per account.

## Solution
Store tour completion flags in the `user_profiles` table and fall back to localStorage only for demo mode.

## Changes

### 1. Database Migration
Add a `completed_tours` column (text array) to `user_profiles`:
```sql
ALTER TABLE public.user_profiles 
ADD COLUMN completed_tours text[] DEFAULT '{}';
```

### 2. Modified: `src/hooks/useSpotlightTour.ts`
- Accept the user's profile context (or auth state) to determine if we should use DB vs localStorage
- On mount, check if `storageKey` exists in `profile.completed_tours` array
- `closeTour()` calls `updateProfile({ completed_tours: [...existing, storageKey] })` to persist server-side
- Keep localStorage as fallback for demo mode only
- Auto-start logic checks the DB-backed completion state

### 3. Modified: `src/pages/DashboardPage.tsx`
- Remove the separate auto-start `useEffect` (lines 143-148) — the hook itself handles auto-start
- The pending-tour sessionStorage + event listener for manual "Take a Tour" stays unchanged

### 4. Modified: Module pages (TaxCenterPage, CredentialsPage, SchedulePage)
- No code changes needed — they already use `useSpotlightTour('key')` which will now check DB internally

## How it works after the fix
1. New user signs up → `completed_tours` is `[]` → tours auto-trigger once per module
2. User completes a tour → `completed_tours` updated to `['locumops_tour_completed']` in DB
3. User logs back in on any device → tours don't re-trigger
4. User clicks "Take a Tour" button → tour opens manually regardless of completion state
5. Demo mode → falls back to localStorage (no DB writes)

## Technical Details
- Single column addition, no new tables
- Uses existing `updateProfile()` from `UserProfileContext`
- The hook will import `useUserProfile` and `useAuth` to access profile data
- Array-based storage allows tracking each module tour independently

