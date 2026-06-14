/**
 * Deletes recent broadcast photo messages sent by the bot.
 * Uses a probe message to discover message_id, then deletes preceding bot messages.
 */

const BROADCAST_RECIPIENTS = [
  2117382130, // Boris Dimenstein
  5671367359, // Danya Take The L
  760823, // Denis Spirin
  169900085, // Iar Romanov (test + full broadcast)
  8525810239, // Nik | Makina
  200640013, // Nikita Shamakov
  443858493, // Roman
  5735404801, // Денис Пынзару
];

const LOOKBACK = 12;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function telegramApi(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; result?: { message_id: number }; description?: string }> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<{
    ok: boolean;
    result?: { message_id: number };
    description?: string;
  }>;
}

async function deleteRecentBroadcasts(
  botToken: string,
  chatId: number,
): Promise<number> {
  const probe = await telegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: ".",
  });

  if (!probe.ok || !probe.result) {
    throw new Error(probe.description ?? "sendMessage failed");
  }

  const probeId = probe.result.message_id;
  let deleted = 0;

  for (let id = probeId - 1; id >= probeId - LOOKBACK && id > 0; id--) {
    const result = await telegramApi(botToken, "deleteMessage", {
      chat_id: chatId,
      message_id: id,
    });
    if (result.ok) deleted++;
  }

  await telegramApi(botToken, "deleteMessage", {
    chat_id: chatId,
    message_id: probeId,
  });

  return deleted;
}

async function main() {
  const botToken = getEnv("TELEGRAM_BOT_TOKEN");
  let totalDeleted = 0;

  for (const chatId of BROADCAST_RECIPIENTS) {
    try {
      const deleted = await deleteRecentBroadcasts(botToken, chatId);
      totalDeleted += deleted;
      console.log(`chat ${chatId}: deleted ${deleted} message(s)`);
    } catch (error) {
      console.error(
        `chat ${chatId}: failed — ${error instanceof Error ? error.message : error}`,
      );
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nTotal deleted: ${totalDeleted}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
