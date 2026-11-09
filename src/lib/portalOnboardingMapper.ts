export type ClientAccessStatus = 'none' | 'invited' | 'active';

/** none: sin members; active: algún member ya inició sesión; invited: el resto. */
export function deriveAccessStatus(
  members: { user_id: string }[],
  lastSignIns: Record<string, string | null>,
): ClientAccessStatus {
  if (members.length === 0) return 'none';
  return members.some((m) => !!lastSignIns[m.user_id]) ? 'active' : 'invited';
}
