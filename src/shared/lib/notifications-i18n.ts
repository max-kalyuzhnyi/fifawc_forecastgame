import type { Locale } from "@/shared/types/database";

export type NotificationLocale = Locale;

const defaultLocale: NotificationLocale = "en";

export function normalizeNotificationLocale(
  locale: string | null | undefined,
): NotificationLocale {
  if (locale === "ru" || locale === "pl") return locale;
  return defaultLocale;
}

export function toIntlLocale(locale: NotificationLocale): string {
  switch (locale) {
    case "ru":
      return "ru-RU";
    case "pl":
      return "pl-PL";
    default:
      return "en-GB";
  }
}

interface PickReminderCopy {
  title: string;
  introSingle: string;
  introMultiple: string;
  footer: string;
  button: string;
  todayAt: string;
  at: string;
}

const pickReminderMessages: Record<NotificationLocale, PickReminderCopy> = {
  en: {
    title: "⚽️ Prediction reminder",
    introSingle: "You haven't predicted this upcoming match:",
    introMultiple: "You haven't predicted these upcoming matches:",
    footer:
      "Kickoff time is shown in your local time. Predictions close at kickoff!",
    button: "⚡️ Make predictions",
    todayAt: "today at {time}",
    at: "{date} at {time}",
  },
  ru: {
    title: "⚽️ Напоминание о прогнозе",
    introSingle: "Вы ещё не сделали прогноз на этот матч:",
    introMultiple: "Вы ещё не сделали прогноз на эти матчи:",
    footer:
      "Время указано в вашем часовом поясе. Прогнозы закрываются с началом матча!",
    button: "⚡️ Сделать прогноз",
    todayAt: "сегодня в {time}",
    at: "{date} в {time}",
  },
  pl: {
    title: "⚽️ Przypomnienie o typie",
    introSingle: "Nie obstawiłeś tego nadchodzącego meczu:",
    introMultiple: "Nie obstawiłeś tych nadchodzących meczów:",
    footer:
      "Godzina podana w Twojej strefie czasowej. Typy zamykają się wraz z rozpoczęciem meczu!",
    button: "⚡️ Obstaw mecze",
    todayAt: "dziś o {time}",
    at: "{date} o {time}",
  },
};

export interface PickReminderMatchInput {
  home_team_name: string;
  away_team_name: string;
  round_display: string;
  group_name: string | null;
  kickoff_at: string;
}

function formatKickoffInTimezone(
  kickoffAt: string,
  timezone: string | null,
  locale: NotificationLocale,
): string {
  const date = new Date(kickoffAt);
  const tz = timezone?.trim() || "UTC";
  const intlLocale = toIntlLocale(locale);
  const copy = pickReminderMessages[locale];

  const dayFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const isToday = dayFormatter.format(date) === dayFormatter.format(new Date());

  const timeFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  const time = timeFormatter.format(date);

  if (isToday) {
    return copy.todayAt.replace("{time}", time);
  }

  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone: tz,
    day: "numeric",
    month: "short",
  });
  const dateLabel = dateFormatter.format(date);
  return copy.at.replace("{date}", dateLabel).replace("{time}", time);
}

export function buildPickReminderMessage(
  matches: PickReminderMatchInput[],
  locale: NotificationLocale,
  timezone: string | null,
): string {
  const copy = pickReminderMessages[locale];
  const intro = matches.length === 1 ? copy.introSingle : copy.introMultiple;
  const matchLines = matches.map((match) => {
    const roundLabel = match.group_name ?? match.round_display;
    const kickoffLabel = formatKickoffInTimezone(
      match.kickoff_at,
      timezone,
      locale,
    );
    return `• ${match.home_team_name} vs ${match.away_team_name} — ${roundLabel} — ${kickoffLabel}`;
  });

  return [copy.title, "", intro, "", ...matchLines, "", copy.footer].join("\n");
}

export function getPickReminderButton(locale: NotificationLocale): string {
  return pickReminderMessages[locale].button;
}

export async function sendTelegramPickReminder(
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
          inline_keyboard: [[{ text: buttonText, web_app: { url: appUrl } }]],
        },
      }),
    },
  );

  return response.ok;
}

export function getMiniAppUrl(): string {
  return (
    process.env.MINI_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://fifawcforecastgame.vercel.app"
  );
}
