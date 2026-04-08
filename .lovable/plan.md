

# Auto-Populate Address from Clinic Name Search

## Problem

When adding a facility, users must type the clinic name and address separately. The Google Places Edge Function currently uses `types: 'address'`, so it only matches street addresses — not business names. Users want to type "Valley Animal Hospital" and have the address fill in automatically.

## Plan

### 1. Update Edge Function (`supabase/functions/places-autocomplete/index.ts`)

- Accept an optional `searchType` parameter (`'address' | 'establishment'`, default `'address'`)
- When `searchType === 'establishment'`, use `types: 'establishment'` instead of `types: 'address'`
- Add a new endpoint mode: when a `place_id` is passed (instead of `input`), call the Google Place Details API and return structured name + formatted address
- Return shape for details: `{ name, formatted_address }`

### 2. Update `GooglePlacesAutocomplete` Component

- Add an optional `searchType` prop (default `'address'`)
- Pass `searchType` to the Edge Function
- Add an optional `onPlaceSelect` callback that returns `{ name, description, place_id }` so parent components can react to the full selection (not just the text)

### 3. Revamp AddFacilityDialog Step 0

- Replace the separate Name + Address fields with a single "Search for your clinic" autocomplete field using `searchType='establishment'`
- When a user selects a result, auto-populate both the `name` field (from the business name) and the `address` field (from Place Details formatted address)
- Show the populated name and address as editable fields below the search, so users can correct them
- Keep a manual fallback: if the clinic isn't found, show a "Can't find it? Enter manually" link that reveals the current name + address fields

### 4. Update ManualFacilityForm (Onboarding)

- Same pattern: add a clinic name search field at the top that auto-fills name + address
- Keep manual entry as fallback

## Files

| File | Change |
|---|---|
| `supabase/functions/places-autocomplete/index.ts` | Add `searchType` param + Place Details lookup |
| `src/components/GooglePlacesAutocomplete.tsx` | Add `searchType` prop, `onPlaceSelect` callback |
| `src/components/AddFacilityDialog.tsx` | Clinic name search with auto-fill on step 0 |
| `src/components/onboarding/ManualFacilityForm.tsx` | Same clinic search pattern |

No database changes needed.

