import type { MatchStatus } from "@/entities/match/model/types";
import type { Locale } from "@/shared/types/database";
import { defaultLocale, toIntlLocale } from "@/i18n/config";

// Node's ICU and the browser's ICU can disagree on whether a comma is inserted
// in some date formats (e.g. "Sun, 14 Jun" vs "Sun 14 Jun"), which triggers
// React hydration mismatches. Dropping the comma from literal separators makes
// the output deterministic across runtimes while preserving other separators
// (e.g. the ":" in time formats).
function formatDeterministic(
  iso: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string {
  const parts = new Intl.DateTimeFormat(toIntlLocale(locale), options).formatToParts(
    new Date(iso),
  );
  return parts
    .map((part) => (part.type === "literal" ? part.value.replace(/,/g, "") : part.value))
    .join("")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

export function formatKickoff(iso: string, locale: Locale = defaultLocale): string {
  return formatDeterministic(iso, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatMatchTime(iso: string, locale: Locale = defaultLocale): string {
  return formatDeterministic(iso, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMatchDateHeader(iso: string, locale: Locale = defaultLocale): string {
  return formatDeterministic(iso, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMatchKickoffDate(iso: string, locale: Locale = defaultLocale): string {
  return formatDeterministic(iso, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function getLocalDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getRelativeDayOffset(iso: string, now = new Date()): number {
  const day = getLocalDayStart(new Date(iso)).getTime();
  const today = getLocalDayStart(now).getTime();
  return Math.round((day - today) / 86_400_000);
}

export type MatchDayBucket = "past" | "upcoming3days" | "future";

export function getMatchDayBucket(
  match: { kickoff_at: string; status: MatchStatus },
  now = new Date(),
): MatchDayBucket {
  if (match.status === "finished") return "past";

  const kickoff = new Date(match.kickoff_at);
  const today = getLocalDayStart(now);
  const upcomingEnd = new Date(today);
  upcomingEnd.setDate(upcomingEnd.getDate() + 3);
  const matchDay = getLocalDayStart(kickoff);

  if (matchDay < today) return "past";
  if (matchDay < upcomingEnd) return "upcoming3days";
  return "future";
}

export function getDateGroupKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
