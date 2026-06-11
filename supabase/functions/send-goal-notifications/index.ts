import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  buildGoalMessage,
  getGoalNotificationButton,
  normalizeNotificationLocale,
  type NotificationLocale,
} from "../_shared/notifications-i18n.ts";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const GOAL_TYPES = ["goal", "penalty", "own_goal"] as const;

type GoalEventType = (typeof GOAL_TYPES)[number];

interface GoalEvent {
  id: string;
  match_id: string;
  type: GoalEventType;
  minute: number;
  injury_time: number | null;
  player_name: string;
  score_home: number | null;
  score_away: number | null;
  created_at: string;
}

interface MatchInfo {
  id: string;
  home_team_name: string;
  away_team_name: string;
  round_display: string;
  group_name: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface RecipientProfile {
  id: string;
  telegram_id: number;
  locale: string | null;
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
  const cutoffIso = new Date(Date.now() - FIFTEEN_MINUTES_MS).toISOString();

  try {
    const { data: events, error: eventsError } = await supabase
      .from("match_events")
      .select(
        "id, match_id, type, minute, injury_time, player_name, score_home, score_away, created_at",
      )
      .in("type", [...GOAL_TYPES])
      .is("notified_at", null)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: true });

    if (eventsError) {
      throw eventsError;
    }

    const goalEvents = (events ?? []) as GoalEvent[];
    if (goalEvents.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          eventsProcessed: 0,
          messagesSent: 0,
          recipients: 0,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const matchIds = [...new Set(goalEvents.map((event) => event.match_id))];

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select(
        "id, home_team_name, away_team_name, round_display, group_name, status, home_score, away_score",
      )
      .in("id", matchIds)
      .in("status", ["live", "finished"]);

    if (matchesError) {
      throw matchesError;
    }

    const matchMap = new Map(
      ((matches ?? []) as MatchInfo[]).map((match) => [match.id, match]),
    );

    const pendingEvents = goalEvents.filter((event) =>
      matchMap.has(event.match_id)
    );

    if (pendingEvents.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          eventsProcessed: 0,
          messagesSent: 0,
          recipients: 0,
          skippedNoLiveMatch: goalEvents.length,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from("profiles")
      .select("id, telegram_id, locale")
      .in("role", ["participant", "admin"])
      .eq("notify_goals", true)
      .not("telegram_id", "is", null);

    if (recipientsError) {
      throw recipientsError;
    }

    const recipientProfiles = (recipients ?? []) as RecipientProfile[];
    let eventsProcessed = 0;
    let messagesSent = 0;
    let deliveryFailures = 0;

    for (const event of pendingEvents) {
      const match = matchMap.get(event.match_id);
      if (!match) continue;

      const messageCache = new Map<NotificationLocale, string>();
      const buttonCache = new Map<NotificationLocale, string>();

      for (const profile of recipientProfiles) {
        const locale = normalizeNotificationLocale(profile.locale);
        let message = messageCache.get(locale);
        if (!message) {
          message = buildGoalMessage(event, match, locale);
          messageCache.set(locale, message);
        }

        let buttonText = buttonCache.get(locale);
        if (!buttonText) {
          buttonText = getGoalNotificationButton(locale);
          buttonCache.set(locale, buttonText);
        }

        const delivered = await sendTelegramMessage(
          botToken,
          profile.telegram_id,
          message,
          buttonText,
          miniAppUrl,
        );

        if (delivered) {
          messagesSent++;
        } else {
          deliveryFailures++;
        }
      }

      const { error: markError } = await supabase
        .from("match_events")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", event.id)
        .is("notified_at", null);

      if (markError) {
        console.error("notified_at update failed", event.id, markError);
        continue;
      }

      eventsProcessed++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        eventsProcessed,
        messagesSent,
        deliveryFailures,
        recipients: recipientProfiles.length,
        pendingEvents: pendingEvents.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
