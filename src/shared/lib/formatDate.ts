import type { Locale } from "@/shared/types/database";
import { defaultLocale, toIntlLocale } from "@/i18n/config";

export function formatKickoff(iso: string, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatMatchTime(iso: string, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMatchDateHeader(iso: string, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatMatchKickoffDate(iso: string, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function getLocalDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type MatchDayBucket = "past" | "upcoming3days" | "future";

export function getMatchDayBucket(
  iso: string,
  now = new Date(),
): MatchDayBucket {
  const kickoff = new Date(iso);
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
