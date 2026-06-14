"use server";

import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import { isAdmin } from "@/shared/lib/auth";
import {
  buildPickReminderMessage,
  getMiniAppUrl,
  getPickReminderButton,
  normalizeNotificationLocale,
  sendTelegramPickReminder,
} from "@/shared/lib/notifications-i18n";

type PingErrorCode =
  | "userNotFound"
  | "noTelegram"
  | "alreadyPredicted"
  | "sendFailed"
  | "noPending"
  | "matchNotFound"
  | "unauthorized";

export interface PingResult {
  error?: string;
  errorCode?: PingErrorCode;
  success?: boolean;
  sent?: number;
  failed?: number;
}

async function getBotToken(): Promise<string | null> {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

async function loadMatch(matchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(
      "id, home_team_name, away_team_name, round_display, group_name, kickoff_at, status",
    )
    .eq("id", matchId)
    .maybeSingle();

  return data;
}

async function hasPrediction(userId: string, matchId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();

  return !!data;
}

async function sendReminderToProfile(
  profile: {
    telegram_id: number;
    locale: string | null;
    timezone: string | null;
  },
  match: {
    home_team_name: string;
    away_team_name: string;
    round_display: string;
    group_name: string | null;
    kickoff_at: string;
  },
  botToken: string,
): Promise<boolean> {
  const locale = normalizeNotificationLocale(profile.locale);
  const message = buildPickReminderMessage([match], locale, profile.timezone);
  const buttonText = getPickReminderButton(locale);

  return sendTelegramPickReminder(
    botToken,
    profile.telegram_id,
    message,
    buttonText,
    getMiniAppUrl(),
  );
}

export async function pingUser(
  userId: string,
  matchId: string,
): Promise<PingResult> {
  if (!(await isAdmin())) {
    return { errorCode: "unauthorized", error: "Unauthorized" };
  }

  const t = await getTranslations("admin.ping");
  const botToken = await getBotToken();
  if (!botToken) {
    return { errorCode: "sendFailed", error: t("sendFailed") };
  }

  const match = await loadMatch(matchId);
  if (!match) {
    return { errorCode: "matchNotFound", error: t("sendFailed") };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, telegram_id, locale, timezone")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return { errorCode: "userNotFound", error: t("userNotFound") };
  }

  if (!profile.telegram_id) {
    return { errorCode: "noTelegram", error: t("noTelegram") };
  }

  const telegramId = profile.telegram_id;

  if (await hasPrediction(userId, matchId)) {
    return { errorCode: "alreadyPredicted", error: t("alreadyPredicted") };
  }

  const delivered = await sendReminderToProfile(
    {
      telegram_id: telegramId,
      locale: profile.locale,
      timezone: profile.timezone,
    },
    match,
    botToken,
  );
  if (!delivered) {
    return { errorCode: "sendFailed", error: t("sendFailed") };
  }

  return { success: true, sent: 1, failed: 0 };
}

export async function pingAllPending(matchId: string): Promise<PingResult> {
  if (!(await isAdmin())) {
    return { errorCode: "unauthorized", error: "Unauthorized" };
  }

  const t = await getTranslations("admin.ping");
  const botToken = await getBotToken();
  if (!botToken) {
    return { errorCode: "sendFailed", error: t("sendFailed") };
  }

  const match = await loadMatch(matchId);
  if (!match) {
    return { errorCode: "matchNotFound", error: t("sendFailed") };
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: predictions }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, telegram_id, locale, timezone")
      .not("telegram_id", "is", null),
    admin.from("predictions").select("user_id").eq("match_id", matchId),
  ]);

  const pickedUserIds = new Set((predictions ?? []).map((p) => p.user_id));
  const pending = (profiles ?? []).filter(
    (profile) => !pickedUserIds.has(profile.id),
  );

  if (pending.length === 0) {
    return { errorCode: "noPending", error: t("noPending") };
  }

  let sent = 0;
  let failed = 0;

  for (const profile of pending) {
    if (!profile.telegram_id) continue;

    const delivered = await sendReminderToProfile(
      {
        telegram_id: profile.telegram_id,
        locale: profile.locale,
        timezone: profile.timezone,
      },
      match,
      botToken,
    );
    if (delivered) {
      sent++;
    } else {
      failed++;
    }
  }

  if (sent === 0) {
    return { errorCode: "sendFailed", error: t("sendFailed"), sent, failed };
  }

  return { success: true, sent, failed };
}
