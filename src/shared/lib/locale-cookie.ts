import { cookies } from "next/headers";
import type { Locale } from "@/shared/types/database";
import { LOCALE_COOKIE } from "@/i18n/config";

export async function setLocaleCookie(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
