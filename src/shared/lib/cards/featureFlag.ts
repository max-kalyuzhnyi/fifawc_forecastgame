export const CARDS_TELEGRAM_ALLOWLIST = [169900085, 113358751] as const;

export function cardsEnabledForTelegramId(
  telegramId: number | null | undefined,
): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  if (telegramId == null) {
    return false;
  }

  return (CARDS_TELEGRAM_ALLOWLIST as readonly number[]).includes(telegramId);
}
