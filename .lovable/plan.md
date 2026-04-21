

## Goal
Remove the Spotlight tour onboarding from the Tax Intelligence (Tax Center) and Credential Management pages. Other module tours (Dashboard, Schedule, Invoices, Business Hub) remain untouched.

## Changes

### `src/pages/TaxCenterPage.tsx`
- Remove the `TAX_TOUR_STEPS` constant.
- Remove `useSpotlightTour('locumops_tour_tax')` call and the `taxTour` variable.
- Remove the `<SpotlightTour ... />` element from the JSX.
- Remove now-unused imports (`SpotlightTour`, `TourStep`, `useSpotlightTour`, and any tour-only icon imports).
- Leave `data-tour` attributes in place — harmless, and removing them is out of scope.

### `src/pages/CredentialsPage.tsx`
- Remove `CREDENTIALS_TOUR_STEPS` and `TAB_TOUR_ATTR` constants.
- Remove `useSpotlightTour('locumops_tour_credentials')` call and `credentialsTour` variable.
- Remove the `<SpotlightTour ... />` element from the JSX.
- Remove now-unused imports (`SpotlightTour`, `TourStep`, `useSpotlightTour`, tour-only icons).

## Out of scope
- Shared `useSpotlightTour` hook and `SpotlightTour` component stay (still used by Dashboard, Schedule, Invoices, Business Hub).
- The "Take a Tour" button in `Layout.tsx` stays (it triggers the dashboard tour).
- No DB cleanup needed — stored `completed_tours` keys for these two tours become inert.

## Files touched
- `src/pages/TaxCenterPage.tsx`
- `src/pages/CredentialsPage.tsx`

