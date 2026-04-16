/**
 * Streak helpers — calcula dias consecutivos de estudo.
 *
 * Um dia "conta" se o usuário marcou pelo menos 1 tópico OU avaliou pelo menos
 * 1 review naquele dia. O streak é a cadeia de dias consecutivos terminando
 * em hoje (ou ontem, como grace-day — se não estudou ainda hoje mas estudou
 * ontem, o streak ainda está vivo).
 */

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Converte uma ISO UTC em YYYY-MM-DD local (respeitando o timezone do
 * usuário). Slicing direto em ISO causa off-by-one quando a hora UTC
 * cruza meia-noite local.
 */
function isoToLocalDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return dateKey(d);
}

/** Calcula o streak atual baseado em datas de atividade. */
export function getCurrentStreak(
  checkedAt: Record<string, string>,
  reviewHistoryDates: string[],
): number {
  const activeDays = new Set<string>();

  // Dates of topic checks — convert ISO UTC to local day.
  for (const iso of Object.values(checkedAt)) {
    activeDays.add(isoToLocalDayKey(iso));
  }

  // Dates of review evaluations (already YYYY-MM-DD local).
  for (const d of reviewHistoryDates) {
    activeDays.add(d);
  }

  if (activeDays.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = new Date(today);
  const todayKey = dateKey(cursor);

  // Grace day: if today has no activity, start counting from yesterday
  if (!activeDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(dateKey(cursor))) {
      return 0; // no activity today or yesterday — streak broken
    }
  }

  // Walk backwards while consecutive days have activity
  let streak = 0;
  while (activeDays.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Longest streak ever (used for future achievements / stats). */
export function getLongestStreak(
  checkedAt: Record<string, string>,
  reviewHistoryDates: string[],
): number {
  const activeDays = new Set<string>();
  for (const iso of Object.values(checkedAt)) activeDays.add(isoToLocalDayKey(iso));
  for (const d of reviewHistoryDates) activeDays.add(d);

  if (activeDays.size === 0) return 0;

  // Sort all active days ascending
  const sorted = Array.from(activeDays).sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const now = new Date(sorted[i] + 'T12:00:00');
    const diff = Math.round((now.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}
