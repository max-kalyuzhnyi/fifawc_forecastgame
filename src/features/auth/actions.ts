"use server";

import { createHmac } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parse, validate } from "@tma.js/init-data-node";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";

const DEFAULT_DEV_TELEGRAM_ID = 169900085;

function getEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

// Deterministic password from telegram id + server pepper (never exposed to client)
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
};

async function ensureTelegramUserAndSignIn(
  tgUser: TelegramUserLike,
): Promise<{ error?: string }> {
  const pepper = getEnv("TELEGRAM_AUTH_PEPPER");
  if (!pepper) {
    return { error: "Missing TELEGRAM_AUTH_PEPPER in server config" };
  }

  const email = telegramEmail(tgUser.id);
  const password = derivePassword(tgUser.id, pepper);
  const displayName = buildDisplayName(tgUser);
  const photoUrl = tgUser.photo_url ?? null;

  const admin = createAdminClient();
  const metadata = {
    telegram_id: tgUser.id,
    display_name: displayName,
    photo_url: photoUrl,
  };

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("telegram_id", tgUser.id)
    .maybeSingle();

  if (profile) {
    const { error: updateError } = await admin.auth.admin.updateUserById(
      profile.id,
      { password, user_metadata: metadata },
    );
    if (updateError) return { error: updateError.message };

    await admin
      .from("profiles")
      .update({ display_name: displayName, photo_url: photoUrl })
      .eq("id", profile.id);
  } else {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (createError) return { error: createError.message };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { error: signInError.message };

  revalidatePath("/", "layout");
  redirect("/matches");
}

export async function signInWithTelegram(
  initDataRaw: string,
): Promise<{ error?: string }> {
  if (!initDataRaw) {
    return { error: "Missing Telegram init data" };
  }

  const botToken = getEnv("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return { error: "Missing TELEGRAM_BOT_TOKEN in server config" };
  }

  try {
    validate(initDataRaw, botToken, { expiresIn: 3600 });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid Telegram data" };
  }

  const initData = parse(initDataRaw);
  const tgUser = initData.user;
  if (!tgUser) {
    return { error: "Telegram user not found in init data" };
  }

  return ensureTelegramUserAndSignIn(tgUser);
}

export async function signInWithDevBypass(): Promise<{ error?: string }> {
  if (process.env.NODE_ENV !== "development") {
    return { error: "outside_telegram" };
  }

  const telegramId = Number(
    process.env.DEV_TELEGRAM_ID ?? DEFAULT_DEV_TELEGRAM_ID,
  );
  if (!Number.isFinite(telegramId)) {
    return { error: "Invalid DEV_TELEGRAM_ID" };
  }

  return ensureTelegramUserAndSignIn({
    id: telegramId,
    first_name: "Dev",
    username: "dev_user",
  });
}
