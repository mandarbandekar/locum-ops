/**
 * Deterministic, conservative shift-type inference based on rate-name keywords.
 * Returns `undefined` when no confident match is found — we never guess silently.
 *
 * Used by the Rate Card "Suggest types" affordance and the backfill Edge
 * Function as a last-resort fallback when no exact rate match exists.
 */
const KEYWORDS: ReadonlyArray<{ slug: string; patterns: RegExp[] }> = [
  { slug: 'er',        patterns: [/\b(er|emergency)\b/i] },
  { slug: 'surgery',   patterns: [/\b(surgery|surg|surgical)\b/i] },
  { slug: 'dental',    patterns: [/\b(dental|dentistry)\b/i] },
  { slug: 'wellness',  patterns: [/\b(wellness|vaccine|vaccination|vax)\b/i] },
  { slug: 'oncall',    patterns: [/\b(on[\s-]?call|after[\s-]?hours)\b/i] },
  { slug: 'telemed',   patterns: [/\b(telemed|telehealth|telemedicine|virtual)\b/i] },
  { slug: 'specialty', patterns: [/\b(specialty|specialist|referral)\b/i] },
  { slug: 'shelter',   patterns: [/\b(shelter|nonprofit|non[\s-]?profit|rescue)\b/i] },
  { slug: 'gp',        patterns: [/\b(gp|general\s*practice|general)\b/i] },
];

export function inferShiftTypeFromName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  for (const { slug, patterns } of KEYWORDS) {
    if (patterns.some(p => p.test(name))) return slug;
  }
  return undefined;
}
