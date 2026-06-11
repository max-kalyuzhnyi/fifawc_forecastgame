import {
  getGroupMatchdayNumber,
  getStageLabelKey,
} from "@/entities/match/lib/roundKeyLabel";

type StageTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function formatStageLabel(
  roundKey: string,
  t: StageTranslator,
): string {
  const labelKey = getStageLabelKey(roundKey);

  if (labelKey === "groupMatchday") {
    const number = getGroupMatchdayNumber(roundKey);
    return t("groupMatchday", { number: number ?? 1 });
  }

  if (labelKey === "unknown") {
    return roundKey;
  }

  return t(labelKey);
}
