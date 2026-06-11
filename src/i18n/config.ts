import type { Locale } from "@/shared/types/database";

export const locales: Locale[] = ["en", "ru", "pl"];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeLocale(languageCode?: string | null): Locale {
  if (!languageCode) return defaultLocale;

  const prefix = languageCode.toLowerCase().split("-")[0];
  if (prefix === "ru") return "ru";
  if (prefix === "pl") return "pl";
  return defaultLocale;
}

export function toIntlLocale(locale: Locale): string {
  switch (locale) {
    case "ru":
      return "ru-RU";
    case "pl":
      return "pl-PL";
    default:
      return "en-GB";
  }
}
