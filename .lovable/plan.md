

## Theme Proposals for LocumOps

### Current State
The app uses a **teal/mint + coral** palette with Inter body text and Manrope headings. Light mode is off-white (#F9FBF9) with warm gray surfaces; dark mode is neutral charcoal. The identity is clean but generic — it doesn't strongly connect to veterinary medicine or convey the "disciplined independent business" positioning.

---

### Three Theme Directions

#### Option A: "Fieldstone" — Warm Earth Professional
**Mood**: Grounded, trustworthy, premium practice management
- **Primary**: Deep forest green `#2D6A4F` → earthy, less "tech startup" than current teal
- **Accent**: Warm terracotta `#C4704E` — approachable action color
- **Backgrounds**: Warm linen `#FAF8F5` (light), deep walnut `#1C1917` (dark)
- **Surfaces**: Oat `#F0ECE3` (light), dark clay `#292524` (dark)
- **Fonts**: Keep Inter body, swap Manrope → **DM Sans** (rounder, friendlier weight)
- **Feel**: Like a well-organized leather portfolio — serious but warm

#### Option B: "Clinic Blue" — Clinical Confidence
**Mood**: Medical-adjacent, reliable, institutional trust
- **Primary**: Confident navy-teal `#1B6B93` — nods to medical/clinical environments
- **Accent**: Warm amber `#D4913D` — optimistic, encouraging
- **Backgrounds**: Cool white `#F7F9FB` (light), deep slate `#131B23` (dark)
- **Surfaces**: Blue-gray wash `#EDF1F5` (light), charcoal blue `#1E2730` (dark)
- **Fonts**: Keep Inter body, headings → **Plus Jakarta Sans** (authoritative, modern)
- **Feel**: Like a trusted medical system — competent and calming

#### Option C: "Sage & Gold" — Encouraging Discipline ★ RECOMMENDED
**Mood**: Encouraging yet business-minded, warm professionalism, growth
- **Primary**: Sage green `#4A7C6F` — approachable, veterinary-natural, calmer than current teal
- **Accent**: Burnished gold `#C49A3C` — signals achievement, financial discipline, encouragement
- **Backgrounds**: Soft sage-white `#FAFBF9` (light), deep evergreen-black `#161B19` (dark)
- **Surfaces**: Sage mist `#EFF3F0` (light), forest dark `#1E2622` (dark)
- **Sidebar light**: Soft sage tint `#F2F6F3` with deep sage text
- **Sidebar dark**: Deep forest `#1A2120` with muted sage icons
- **Fonts**: Keep Inter body, headings → **DM Sans 700** (friendly authority)
- **Status pills**: Same system, gold replaces coral for "action needed" states
- **Feel**: Like a mentor who's organized your paperwork — encouraging, not cold

---

### Why "Sage & Gold" (Option C)

1. **Veterinary alignment**: Sage green connects to nature/animal care without being childish — it feels like a practice, not a pet store
2. **Encouragement through gold**: Gold/amber accents psychologically signal achievement and reward — perfect for "you collected $15,400 this month" moments
3. **Business discipline**: The muted sage (vs. bright teal) feels more measured and professional — this is a back-office tool, not a consumer app
4. **Minimal disruption**: The green family stays close to current teal, so the structural CSS changes are a palette swap — no layout or component rework needed
5. **Dark mode excellence**: Sage-black dark mode feels richer and more distinctive than the current neutral charcoal

### What Changes (Technical)

- **`src/index.css`**: Replace all HSL custom property values (both `:root` and `.dark`) with the new Sage & Gold palette — ~100 variable updates
- **`tailwind.config.ts`**: Update the hardcoded `teal` and `coral` color ramps to match new sage/gold values
- **Font import**: Swap Manrope → DM Sans in the Google Fonts import and `tailwind.config.ts` font-family
- **Logo text color**: Update sidebar logo HSL references to match new sage tones
- **No component changes needed** — everything references CSS variables

