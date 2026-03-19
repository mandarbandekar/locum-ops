/**
 * Maps database/API errors to user-friendly messages.
 * Raw error details are kept out of the UI to avoid leaking internal schema info.
 */
export function friendlyDbError(e: { code?: string; message?: string } | unknown): string {
  if (!e || typeof e !== 'object') return 'An unexpected error occurred. Please try again.';
  const err = e as { code?: string; message?: string };
  if (err.code === '23505') return 'This record already exists.';
  if (err.code === '23503') return 'A related record was not found.';
  if (err.code === '23502') return 'A required field is missing.';
  if (err.code === '23514') return 'A value is out of the allowed range.';
  if (err.code === '42501') return 'You do not have permission for this action.';
  if (err.code === 'PGRST116') return 'Record not found.';
  return 'An unexpected error occurred. Please try again.';
}
