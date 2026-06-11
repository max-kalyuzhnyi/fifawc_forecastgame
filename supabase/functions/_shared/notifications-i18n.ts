export type NotificationLocale = "en" | "ru" | "pl";

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

type GoalEventType = "goal" | "penalty" | "own_goal";

const goalTypeSuffix: Record<NotificationLocale, Record<GoalEventType, string>> = {
  en: {
    goal: "",
    penalty: " (penalty)",
    own_goal: " (own goal)",
  },
  ru: {
    goal: "",
    penalty: " (пенальти)",
    own_goal: " (автогол)",
  },
  pl: {
    goal: "",
    penalty: " (karny)",
    own_goal: " (samobój)",
  },
};

const goalMessages: Record<NotificationLocale, { title: string; button: string }> = {
  en: {
    title: "GOAL",
    button: "⚽️ Open matches",
  },
  ru: {
    title: "ГОЛ",
    button: "⚽️ Открыть матчи",
  },
  pl: {
    title: "GOL",
    button: "⚽️ Otwórz mecze",
  },
};

export function formatGoalTypeSuffix(
  type: GoalEventType,
  locale: NotificationLocale,
): string {
  return goalTypeSuffix[locale][type] ?? "";
}

interface GoalEventInput {
  type: GoalEventType;
  minute: number;
  injury_time: number | null;
  player_name: string;
  score_home: number | null;
  score_away: number | null;
}

interface MatchInfoInput {
  home_team_name: string;
  away_team_name: string;
  round_display: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
}

function formatEventMinute(minute: number, injuryTime: number | null): string {
  if (injuryTime != null && injuryTime > 0) {
    return `${minute}+${injuryTime}'`;
  }
  return `${minute}'`;
}

export function buildGoalMessage(
  event: GoalEventInput,
  match: MatchInfoInput,
  locale: NotificationLocale,
): string {
  const scoreHome = event.score_home ?? match.home_score ?? 0;
  const scoreAway = event.score_away ?? match.away_score ?? 0;
  const roundLabel = match.group_name ?? match.round_display;
  const minuteLabel = formatEventMinute(event.minute, event.injury_time);
  const typeSuffix = formatGoalTypeSuffix(event.type, locale);
  const { title } = goalMessages[locale];

  return [
    `⚽️ ${title} — ${match.home_team_name} ${scoreHome}:${scoreAway} ${match.away_team_name}`,
    roundLabel,
    `${minuteLabel} ${event.player_name}${typeSuffix}`,
  ].join("\n");
}

export function getGoalNotificationButton(
  locale: NotificationLocale,
): string {
  return goalMessages[locale].button;
}
