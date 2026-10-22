/** Numéro saisi en France (06…, 6…, +33…) → format international sans « + » attendu par Supabase. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let n = digits;
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (n.startsWith('0')) n = `33${n.slice(1)}`;
  else if (n.length === 9) n = `33${n}`;
  return /^\d{10,15}$/.test(n) ? n : null;
}
