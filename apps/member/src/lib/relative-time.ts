// "today", "tomorrow", "in 3 days" — whole days when it is a day or more
// away, hours or minutes when it is closer. Used on the server for the
// first paint and on the client to keep it fresh.
export function formatRelative(target: Date | number, now: Date | number = Date.now()): string {
  const diffMs = new Date(target).getTime() - new Date(now).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;

  // Calendar days, not 24-hour blocks, so "tomorrow" means tomorrow.
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
