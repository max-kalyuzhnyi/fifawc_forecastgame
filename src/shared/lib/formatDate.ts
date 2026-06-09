export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatMatchTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// Deterministic formatting — avoids hydration mismatch between Node and browser Intl
export function formatMatchDateHeader(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatMatchKickoffDate(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function getLocalDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type MatchDayBucket = "yesterday" | "today" | "upcoming";

export function getMatchDayBucket(
  iso: string,
  now = new Date(),
): MatchDayBucket {
  const kickoff = new Date(iso);
  const today = getLocalDayStart(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const matchDay = getLocalDayStart(kickoff);

  if (matchDay.getTime() === today.getTime()) return "today";
  if (matchDay.getTime() === yesterday.getTime()) return "yesterday";
  if (matchDay > today) return "upcoming";
  return "yesterday";
}

export function getDateGroupKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
