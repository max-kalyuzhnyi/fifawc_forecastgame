import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFiles(): void {
  const explicitEnvFile = process.env.BROADCAST_ENV_FILE;
  if (explicitEnvFile && existsSync(explicitEnvFile)) {
    config({ path: explicitEnvFile, override: false });
    return;
  }

  // Do not override vars already injected (e.g. `vercel env run`).
  config({ path: ".env.local", override: false });
  config({ override: false });
}

loadEnvFiles();

const PRODUCTION_SUPABASE_HOST = "qgawmjczgfbhwsdpsqly.supabase.co";
const DEFAULT_MINI_APP_URL = "https://fifawcforecastgame.vercel.app";
const IMAGE_PATH = join(import.meta.dirname, "assets/wc-update-broadcast.png");
const BUTTON_TEXT = "⚡️ Make your picks";

const CAPTION = `🏆 WC starts in 1 hour!

Meanwhile, we've added a bunch of updates to the app:

⚽️ Live match updates — score, goals, cards, stats and other events
📊 Leaderboard tweaks — now you can see matchday leaderboard + your trend
🔔 TG notifications — reminders for missing picks
🥅 Optional goal notifications — turned off by default, can be enabled in settings

Make your picks before kick-off and good luck!`;

interface Recipient {
  id: string;
  display_name: string;
  telegram_id: number;
}

interface CliArgs {
  to?: string;
  telegramId?: number;
  all: boolean;
  confirm: boolean;
  delayMs: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { all: false, confirm: false, delayMs: 100 };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--to" && argv[i + 1]) {
      args.to = argv[++i];
    } else if (arg === "--telegram-id" && argv[i + 1]) {
      args.telegramId = Number(argv[++i]);
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg === "--confirm") {
      args.confirm = true;
    } else if (arg === "--delay-ms" && argv[i + 1]) {
      args.delayMs = Number(argv[++i]);
    }
  }

  return args;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function assertProductionSupabaseUrl(supabaseUrl: string): void {
  let host: string;
  try {
    host = new URL(supabaseUrl).host;
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
  }

  if (host !== PRODUCTION_SUPABASE_HOST) {
    throw new Error(
      `Рассылка только в production. Получен ${host}. ` +
        "Запусти npm run broadcast:send:prod",
    );
  }
}

interface TelegramBotIdentity {
  id: number;
  username: string | null;
  first_name: string;
}

async function fetchBotIdentity(
  botToken: string,
): Promise<TelegramBotIdentity> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getMe`,
  );
  const payload = (await response.json()) as {
    ok: boolean;
    result?: TelegramBotIdentity;
    description?: string;
  };

  if (!response.ok || !payload.ok || !payload.result) {
    throw new Error(
      `Invalid TELEGRAM_BOT_TOKEN: ${payload.description ?? response.statusText}`,
    );
  }

  return payload.result;
}

function formatBotLabel(bot: TelegramBotIdentity): string {
  return bot.username ? `@${bot.username}` : bot.first_name;
}

async function sendTelegramPhoto(
  botToken: string,
  chatId: number,
  imagePath: string,
  caption: string,
  miniAppUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const appUrl = `${miniAppUrl.replace(/\/$/, "")}/matches`;
  const imageBytes = readFileSync(imagePath);

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append(
    "reply_markup",
    JSON.stringify({
      inline_keyboard: [[{ text: BUTTON_TEXT, web_app: { url: appUrl } }]],
    }),
  );
  form.append(
    "photo",
    new Blob([imageBytes], { type: "image/png" }),
    basename(imagePath),
  );

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: `${response.status}: ${body}` };
  }

  return { ok: true };
}

async function fetchRecipients(
  supabase: ReturnType<typeof createClient>,
  args: CliArgs,
): Promise<Recipient[]> {
  if (args.telegramId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, telegram_id")
      .eq("telegram_id", args.telegramId)
      .not("telegram_id", "is", null);

    if (error) throw error;
    return (data ?? []) as Recipient[];
  }

  if (args.to) {
    const needle = args.to.replace(/^@/, "");
    const patterns = new Set<string>([
      `%${needle}%`,
      `%@${needle}%`,
    ]);

    // "iarromanov" should also match "Iar Romanov"
    const spaced = needle.replace(/([a-z])([A-Z])/g, "$1 $2");
    if (spaced !== needle) patterns.add(`%${spaced}%`);

    const wordParts = needle.match(/[a-z]+/gi);
    if (wordParts && wordParts.length > 1) {
      patterns.add(`%${wordParts.join("%")}%`);
      patterns.add(`%${wordParts.join(" ")}%`);
    }

    // "iarromanov" -> also match "Iar Romanov"
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

    const orFilter = [...patterns]
      .map((pattern) => `display_name.ilike.${pattern}`)
      .join(",");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, telegram_id")
      .not("telegram_id", "is", null)
      .or(orFilter);

    if (error) throw error;
    return (data ?? []) as Recipient[];
  }

  if (args.all) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, telegram_id")
      .not("telegram_id", "is", null)
      .order("display_name");

    if (error) throw error;
    return (data ?? []) as Recipient[];
  }

  return [];
}

function printUsage(): void {
  console.log(`Usage:
  npm run broadcast:send:prod -- --to iarromanov
  npm run broadcast:send:prod -- --telegram-id 123456789
  npm run broadcast:send:prod -- --all
  npm run broadcast:send:prod -- --all --confirm
  npm run broadcast:send:prod -- --all --confirm --delay-ms 150

Production only (${PRODUCTION_SUPABASE_HOST}). Use broadcast:send:prod to pull
Vercel production env automatically.

Env:
  TELEGRAM_BOT_TOKEN          FIFA WC Predictor bot (same as Vercel production)
  NEXT_PUBLIC_SUPABASE_URL    production: ${PRODUCTION_SUPABASE_HOST}
  SUPABASE_SERVICE_ROLE_KEY   matching service role key
  EXPECTED_BOT_USERNAME       optional safety check, e.g. fifawc_forecast_bot
  BROADCAST_ENV_FILE          optional path to env file`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.to && !args.telegramId && !args.all) {
    printUsage();
    process.exit(1);
  }

  const botToken = getEnv("TELEGRAM_BOT_TOKEN");
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  assertProductionSupabaseUrl(supabaseUrl);
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const miniAppUrl = process.env.MINI_APP_URL ?? DEFAULT_MINI_APP_URL;
  const expectedBot = process.env.EXPECTED_BOT_USERNAME?.replace(/^@/, "");

  const bot = await fetchBotIdentity(botToken);
  const botLabel = formatBotLabel(bot);
  console.log(`Bot: ${botLabel} (${bot.first_name}, id=${bot.id})`);
  console.log(`Supabase: ${supabaseUrl}`);
  console.log(`Mini App: ${miniAppUrl}/matches`);

  if (expectedBot && bot.username !== expectedBot) {
    throw new Error(
      `Wrong bot: expected @${expectedBot}, got ${botLabel}. ` +
        "Use TELEGRAM_BOT_TOKEN from the FIFA WC Predictor bot (Vercel / BotFather), " +
        "not from another project's Supabase secrets.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const recipients = await fetchRecipients(supabase, args);

  if (recipients.length === 0) {
    console.error("No recipients found.");
    if (args.to) {
      console.error(
        `Could not find a profile matching "${args.to}". Try --telegram-id instead.`,
      );
    }
    process.exit(1);
  }

  if (args.all && recipients.length > 1 && !args.confirm) {
    console.log(`Dry run: ${recipients.length} recipients would receive the broadcast.`);
    for (const recipient of recipients) {
      console.log(
        `  - ${recipient.display_name} (telegram_id=${recipient.telegram_id})`,
      );
    }
    console.log("\nRe-run with --all --confirm to send.");
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const [index, recipient] of recipients.entries()) {
    const result = await sendTelegramPhoto(
      botToken,
      recipient.telegram_id,
      IMAGE_PATH,
      CAPTION,
      miniAppUrl,
    );

    if (result.ok) {
      sent++;
      console.log(
        `sent: ${recipient.display_name} (telegram_id=${recipient.telegram_id})`,
      );
    } else {
      failed++;
      console.error(
        `failed: ${recipient.display_name} (telegram_id=${recipient.telegram_id}) — ${result.error}`,
      );
    }

    if (index < recipients.length - 1 && args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  }

  console.log(`\nDone. Sent: ${sent}, failed: ${failed}, total: ${recipients.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
