"use server";

import { createHmac } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { parse, validate } from "@tma.js/init-data-node";
import { normalizeLocale } from "@/i18n/config";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import { setLocaleCookie } from "@/shared/lib/locale-cookie";
import type { Locale } from "@/shared/types/database";

const DEFAULT_DEV_TELEGRAM_ID = 169900085;

function getEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

function derivePassword(telegramId: number, pepper: string): string {
  return createHmac("sha256", pepper)
    .update(String(telegramId))
    .digest("hex");
}

function telegramEmail(telegramId: number): string {
  return `tg_${telegramId}@telegram.local`;
}

function buildDisplayName(user: {
  first_name: string;
  last_name?: string;
  username?: string;
  id: number;
}): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (user.username) return `@${user.username}`;
  return `User ${user.id}`;
}

type TelegramUserLike = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

async function ensureTelegramUserAndSignIn(
  tgUser: TelegramUserLike,
  timezone?: string,
): Promise<{ error?: string }> {
  const t = await getTranslations("common.errors");

  const pepper = getEnv("TELEGRAM_AUTH_PEPPER");
  if (!pepper) {
    return { error: t("missingAuthPepper") };
  }

  const email = telegramEmail(tgUser.id);
  const password = derivePassword(tgUser.id, pepper);
  const displayName = buildDisplayName(tgUser);
  const photoUrl = tgUser.photo_url ?? null;
  const detectedLocale = normalizeLocale(tgUser.language_code);

  const admin = createAdminClient();
  const metadata = {
    telegram_id: tgUser.id,
    display_name: displayName,
    photo_url: photoUrl,
  };

  const { data: profile } = await admin
    .from("profiles")
    .select("id, display_name_custom, avatar_custom, locale, locale_custom")
    .eq("telegram_id", tgUser.id)
    .maybeSingle();

  let resolvedLocale: Locale = detectedLocale;

  if (profile) {
    resolvedLocale = profile.locale_custom ? profile.locale : detectedLocale;

    const { error: updateError } = await admin.auth.admin.updateUserById(
      profile.id,
      {
        password,
        user_metadata: {
          telegram_id: tgUser.id,
          ...(profile.display_name_custom ? {} : { display_name: displayName }),
          ...(profile.avatar_custom ? {} : { photo_url: photoUrl }),
        },
      },
    );
    if (updateError) return { error: updateError.message };

    const profileUpdate: {
      display_name?: string;
      photo_url?: string | null;
      timezone?: string;
      locale?: Locale;
    } = {};

    if (!profile.display_name_custom) {
      profileUpdate.display_name = displayName;
    }
    if (!profile.avatar_custom) {
      profileUpdate.photo_url = photoUrl;
    }
    if (timezone) {
      profileUpdate.timezone = timezone;
    }
    if (!profile.locale_custom) {
      profileUpdate.locale = detectedLocale;
      resolvedLocale = detectedLocale;
    }

    if (Object.keys(profileUpdate).length > 0) {
      await admin.from("profiles").update(profileUpdate).eq("id", profile.id);
    }
  } else {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (createError) return { error: createError.message };

    const profileUpdate: {
      timezone?: string;
      locale?: Locale;
    } = { locale: detectedLocale };

    if (timezone) {
      profileUpdate.timezone = timezone;
    }

    await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("telegram_id", tgUser.id);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { error: signInError.message };

  await setLocaleCookie(resolvedLocale);

  revalidatePath("/", "layout");
  redirect("/matches");
}

export async function signInWithTelegram(
  initDataRaw: string,
  timezone?: string,
): Promise<{ error?: string }> {
  const t = await getTranslations("common.errors");

  if (!initDataRaw) {
    return { error: t("missingTelegramInitData") };
  }

  const botToken = getEnv("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return { error: t("missingBotToken") };
  }

  try {
    validate(initDataRaw, botToken, { expiresIn: 3600 });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : t("invalidTelegramData"),
    };
  }

  const initData = parse(initDataRaw);
  const tgUser = initData.user;
  if (!tgUser) {
    return { error: t("telegramUserNotFound") };
  }

  return ensureTelegramUserAndSignIn(tgUser, timezone);
}

export async function signInWithDevBypass(
  timezone?: string,
): Promise<{ error?: string }> {
  const t = await getTranslations("common.errors");

  if (process.env.NODE_ENV !== "development") {
    return { error: t("outsideTelegram") };
  }

  const telegramId = Number(
    process.env.DEV_TELEGRAM_ID ?? DEFAULT_DEV_TELEGRAM_ID,
  );
  if (!Number.isFinite(telegramId)) {
    return { error: t("invalidDevTelegramId") };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, photo_url")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  const nameParts = profile?.display_name?.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts?.[0] ?? "Dev";
  const lastName =
    nameParts && nameParts.length > 1
      ? nameParts.slice(1).join(" ")
      : undefined;

  return ensureTelegramUserAndSignIn(
    {
      id: telegramId,
      first_name: firstName,
      last_name: lastName,
      photo_url: profile?.photo_url ?? undefined,
    },
    timezone,
  );
}
