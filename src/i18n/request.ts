import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getCurrentUserId } from "@/shared/lib/auth";
import { createClient } from "@/shared/lib/supabase/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

async function resolveLocale(): Promise<string> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const userId = await getCurrentUserId();
  if (userId) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("locale")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.locale && isLocale(profile.locale)) {
      return profile.locale;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
