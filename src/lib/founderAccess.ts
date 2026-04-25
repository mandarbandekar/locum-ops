// Hardcoded founder/admin email allowlist for the Founder Dashboard.
// Server-side enforcement also exists in the get_founder_overview() RPC.
export const FOUNDER_ADMINS: string[] = [
  'mandar@locum-ops.com',
];

export function isFounderAdmin(email?: string | null): boolean {
  if (!email) return false;
  return FOUNDER_ADMINS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
