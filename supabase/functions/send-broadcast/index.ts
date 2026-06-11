import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PHOTO_URL =
  "https://qgawmjczgfbhwsdpsqly.supabase.co/storage/v1/object/public/avatars/broadcast/wc-update.png";
const BUTTON_TEXT = "⚡️ Make your picks";
const CAPTION = `🏆 WC starts in 1 hour!

Meanwhile, we've added a bunch of updates to the app:

⚽️ Live match updates — score, goals, cards, stats and other events
📊 Leaderboard tweaks — now you can see matchday leaderboard + your trend
🔔 TG notifications — reminders for missing picks
🥅 Optional goal notifications — turned off by default, can be enabled in settings

Make your picks before kick-off and good luck!`;

interface Recipient {
  display_name: string;
  telegram_id: number;
}

function buildReplyMarkup(miniAppUrl: string) {
  const appUrl = `${miniAppUrl.replace(/\/$/, "")}/matches`;
  return {
    inline_keyboard: [[{ text: BUTTON_TEXT, web_app: { url: appUrl } }]],
  };
}

function buildSearchPatterns(needle: string): string[] {
  const patterns = new Set([`%${needle}%`, `%@${needle}%`]);

  if (!needle.includes(" ") && needle.length > 3) {
    for (const splitAt of [3, 4]) {
      if (splitAt < needle.length) {
        const first = needle.slice(0, splitAt);
        const rest = needle.slice(splitAt);
        patterns.add(`%${first}%${rest}%`);
        patterns.add(`%${first} ${rest}%`);
      }
    }
  }

  return [...patterns];
}

async function sendTelegramPhoto(
  botToken: string,
  chatId: number,
  caption: string,
  miniAppUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: PHOTO_URL,
        caption,
        reply_markup: buildReplyMarkup(miniAppUrl),
      }),
    },
  );

  if (!response.ok) {
    return { ok: false, error: `${response.status}: ${await response.text()}` };
  }

  return { ok: true };
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

  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = req.method === "POST"
    ? await req.json().catch(() => ({}))
    : {};
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let recipients: Recipient[] = [];

  if (typeof body.telegramId === "number") {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, telegram_id")
      .eq("telegram_id", body.telegramId)
      .not("telegram_id", "is", null);

    if (error) throw error;
    recipients = (data ?? []) as Recipient[];
  } else if (typeof body.to === "string" && body.to.length > 0) {
    const needle = body.to.replace(/^@/, "");
    const orFilter = buildSearchPatterns(needle)
      .map((pattern) => `display_name.ilike.${pattern}`)
      .join(",");

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, telegram_id")
      .not("telegram_id", "is", null)
      .or(orFilter);

    if (error) throw error;
    recipients = (data ?? []) as Recipient[];
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, telegram_id")
      .not("telegram_id", "is", null)
      .order("display_name");

    if (error) throw error;
    recipients = (data ?? []) as Recipient[];

    if (body.confirm !== true) {
      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          recipients: recipients.length,
          names: recipients.map((recipient) => recipient.display_name),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (recipients.length === 0) {
    return new Response(JSON.stringify({ error: "No recipients found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;
  const failures: Array<{
    display_name: string;
    telegram_id: number;
    error: string;
  }> = [];

  for (const recipient of recipients) {
    const result = await sendTelegramPhoto(
      botToken,
      recipient.telegram_id,
      CAPTION,
      miniAppUrl,
    );

    if (result.ok) {
      sent++;
    } else {
      failed++;
      failures.push({
        display_name: recipient.display_name,
        telegram_id: recipient.telegram_id,
        error: result.error ?? "unknown",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, total: recipients.length, failures }),
    { headers: { "Content-Type": "application/json" } },
  );
});
