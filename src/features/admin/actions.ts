"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import {
  selectTelegramRecipients,
  type CommunicationTarget,
} from "@/features/admin/lib/selectTelegramRecipients";
import type {
  AdminMatch,
  AdminPrediction,
  AdminProfile,
} from "@/features/admin/lib/types";
import { createClient } from "@/shared/lib/supabase/server";
import { fetchAllRows } from "@/shared/lib/supabase/fetchAllRows";
import { isAdmin } from "@/shared/lib/auth";
import {
  buildPickReminderMessage,
  getMiniAppUrl,
  getPickReminderButton,
  normalizeNotificationLocale,
  sendTelegramPickReminder,
} from "@/shared/lib/notifications-i18n";

const TELEGRAM_SEND_DELAY_MS = 100;

const sendCommunicationSchema = z.object({
  message: z.string().trim().min(1).max(4096),
  target: z.enum(["all", "selectedUsers", "missingNextPick"]),
  selectedUserIds: z.array(z.string().uuid()).optional(),
  confirmAll: z.boolean().optional(),
});

export interface SendCommunicationInput {
  message: string;
  target: CommunicationTarget;
  selectedUserIds?: string[];
  confirmAll?: boolean;
}

type SendCommunicationErrorCode =
  | "unauthorized"
  | "invalidInput"
  | "confirmRequired"
  | "noRecipients"
  | "noSoonMatch"
  | "sendFailed";

export interface SendCommunicationResult {
  error?: string;
  errorCode?: SendCommunicationErrorCode;
  success?: boolean;
  sent?: number;
  failed?: number;
  total?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const supabase = await createClient();
  const { data: profile } = await supabase
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

  const supabase = await createClient();
  const [{ data: profiles }, { data: predictions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, telegram_id, locale, timezone")
      .not("telegram_id", "is", null),
    supabase.from("predictions").select("user_id").eq("match_id", matchId),
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

async function loadCommunicationData(): Promise<{
  profiles: AdminProfile[];
  predictions: AdminPrediction[];
  matches: AdminMatch[];
}> {
  const supabase = await createClient();
  const [{ data: profiles }, predictions, { data: matches }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, photo_url, telegram_id, locale, timezone"),
      fetchAllRows((from, to) =>
        supabase
          .from("predictions")
          .select("user_id, match_id")
          .order("id", { ascending: true })
          .range(from, to),
      ),
      supabase
        .from("matches")
        .select(
          "id, home_team_name, away_team_name, kickoff_at, home_score, away_score, status, highlights_youtube_id, round_display, group_name",
        ),
    ]);

  return {
    profiles: (profiles ?? []) as AdminProfile[],
    predictions: predictions as AdminPrediction[],
    matches: (matches ?? []) as AdminMatch[],
  };
}

export async function sendCommunication(
  input: SendCommunicationInput,
): Promise<SendCommunicationResult> {
  if (!(await isAdmin())) {
    return { errorCode: "unauthorized", error: "Unauthorized" };
  }

  const t = await getTranslations("admin.communications");
  const parsed = sendCommunicationSchema.safeParse(input);
  if (!parsed.success) {
    return { errorCode: "invalidInput", error: t("invalidInput") };
  }

  const { message, target, selectedUserIds, confirmAll } = parsed.data;

  if (target === "all" && confirmAll !== true) {
    return { errorCode: "confirmRequired", error: t("confirmRequired") };
  }

  const botToken = await getBotToken();
  if (!botToken) {
    return { errorCode: "sendFailed", error: t("sendFailed") };
  }

  const { profiles, predictions, matches } = await loadCommunicationData();
  const { recipients, match: soonMatch } = selectTelegramRecipients({
    target,
    profiles,
    predictions,
    matches,
    selectedUserIds,
  });

  if (target === "missingNextPick" && !soonMatch) {
    return { errorCode: "noSoonMatch", error: t("noSoonMatch") };
  }

  if (recipients.length === 0) {
    return { errorCode: "noRecipients", error: t("noRecipients") };
  }

  let sent = 0;
  let failed = 0;

  for (const [index, recipient] of recipients.entries()) {
    const locale = normalizeNotificationLocale(recipient.locale);
    const buttonText = getPickReminderButton(locale);

    const delivered = await sendTelegramPickReminder(
      botToken,
      recipient.telegram_id,
      message,
      buttonText,
      getMiniAppUrl(),
    );

    if (delivered) {
      sent++;
    } else {
      failed++;
    }

    if (index < recipients.length - 1 && TELEGRAM_SEND_DELAY_MS > 0) {
      await sleep(TELEGRAM_SEND_DELAY_MS);
    }
  }

  if (sent === 0) {
    return {
      errorCode: "sendFailed",
      error: t("sendFailed"),
      sent,
      failed,
      total: recipients.length,
    };
  }

  return { success: true, sent, failed, total: recipients.length };
}
