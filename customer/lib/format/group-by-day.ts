// A statement groups rows under the day they happened: "Today", "Yesterday", then a short date.
// Consecutive grouping only — rows arrive newest-first from the API, so one pass is enough.
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export function groupByDay<T extends { createdAt: string }>(rows: T[], now: Date = new Date()): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const row of rows) {
    const label = dayLabel(row.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(row);
    else groups.push({ label, items: [row] });
  }
  return groups;
}
