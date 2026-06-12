import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { formatErrorMessage } from "../_shared/error-message.ts";
import {
  buildPickReminderMessage,
  getPickReminderButton,
  normalizeNotificationLocale,
  type PickReminderMatchInput,
} from "../_shared/notifications-i18n.ts";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

interface ReminderMatch extends PickReminderMatchInput {
  id: string;
}

interface RecipientProfile {
  id: string;
  telegram_id: number;
  locale: string | null;
  timezone: string | null;
}

interface ExistingPrediction {
  user_id: string;
  match_id: string;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  buttonText: string,
  miniAppUrl: string,
): Promise<boolean> {
  const appUrl = `${miniAppUrl.replace(/\/$/, "")}/matches`;
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [[
            {
              text: buttonText,
              web_app: { url: appUrl },
            },
          ]],
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("sendMessage failed", chatId, response.status, body);
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const miniAppUrl = Deno.env.get("MINI_APP_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !cronSecret || !botToken || !miniAppUrl || !supabaseUrl || !serviceRoleKey
  ) {
    return new Response(
      JSON.stringify({ error: "Missing required environment secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const providedSecret = req.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const windowEndIso = new Date(now + THREE_HOURS_MS).toISOString();

  try {
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select(
        "id, home_team_name, away_team_name, round_display, group_name, kickoff_at",
      )
      .eq("status", "scheduled")
      .is("pick_reminder_sent_at", null)
      .gt("kickoff_at", nowIso)
      .lte("kickoff_at", windowEndIso)
      .order("kickoff_at", { ascending: true });

    if (matchesError) {
      throw matchesError;
    }

    const reminderMatches = (matches ?? []) as ReminderMatch[];
    if (reminderMatches.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          matchesProcessed: 0,
          messagesSent: 0,
          recipients: 0,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const matchIds = reminderMatches.map((match) => match.id);

    const { data: recipients, error: recipientsError } = await supabase
      .from("profiles")
      .select("id, telegram_id, locale, timezone")
      .not("telegram_id", "is", null);

    if (recipientsError) {
      throw recipientsError;
    }

    const recipientProfiles = (recipients ?? []) as RecipientProfile[];

    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("user_id, match_id")
      .in("match_id", matchIds);

    if (predictionsError) {
      throw predictionsError;
    }

    const predictedPairs = new Set(
      ((predictions ?? []) as ExistingPrediction[]).map(
        (prediction) => `${prediction.user_id}:${prediction.match_id}`,
      ),
    );

    let messagesSent = 0;
    let deliveryFailures = 0;
    let recipientsNotified = 0;

    for (const profile of recipientProfiles) {
      const missingMatches = reminderMatches.filter(
        (match) => !predictedPairs.has(`${profile.id}:${match.id}`),
      );

      if (missingMatches.length === 0) {
        continue;
      }

      const locale = normalizeNotificationLocale(profile.locale);
      const message = buildPickReminderMessage(
        missingMatches,
        locale,
        profile.timezone,
      );
      const buttonText = getPickReminderButton(locale);

      const delivered = await sendTelegramMessage(
        botToken,
        profile.telegram_id,
        message,
        buttonText,
        miniAppUrl,
      );

      if (delivered) {
        messagesSent++;
        recipientsNotified++;
      } else {
        deliveryFailures++;
      }
    }

    const { error: markError } = await supabase
      .from("matches")
      .update({ pick_reminder_sent_at: new Date().toISOString() })
      .in("id", matchIds)
      .is("pick_reminder_sent_at", null);

    if (markError) {
      throw markError;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        matchesProcessed: reminderMatches.length,
        messagesSent,
        deliveryFailures,
        recipientsNotified,
        recipients: recipientProfiles.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        error: formatErrorMessage(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
