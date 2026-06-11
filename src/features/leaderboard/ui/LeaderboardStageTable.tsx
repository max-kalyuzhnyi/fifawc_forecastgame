"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  STAGE_ORDER,
  type LeaderboardOverallEntry,
  type LeaderboardStageEntry,
} from "@/features/leaderboard/lib/buildAnalytics";
import { formatStageLabel } from "@/features/leaderboard/lib/formatStageLabel";
import { LeaderboardRankCell } from "@/features/leaderboard/ui/LeaderboardRankCell";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface LeaderboardStageTableProps {
  stages: string[];
  perStage: Record<string, LeaderboardStageEntry[]>;
  overall: LeaderboardOverallEntry[];
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
}

function buildPreviewEntries(
  overall: LeaderboardOverallEntry[],
): LeaderboardStageEntry[] {
  return overall.map((entry) => ({
    user_id: entry.user_id,
    display_name: entry.display_name,
    photo_url: entry.photo_url,
    points: 0,
    picks: 0,
    rank: entry.rank,
  }));
}

export function LeaderboardStageTable({
  stages,
  perStage,
  overall,
  currentUserId,
  canSeePlayerNames,
}: LeaderboardStageTableProps) {
  const t = useTranslations("leaderboard");
  const tCommon = useTranslations("common");
  const tStages = useTranslations("leaderboard.stages");
  const isPreview = stages.length === 0;
  const displayStages = isPreview ? [...STAGE_ORDER] : stages;
  const [selectedStage, setSelectedStage] = useState(displayStages[0] ?? "");

  const rankLabels = useMemo(
    () => ({
      1: { emoji: "🥇", label: t("rank1") },
      2: { emoji: "🥈", label: t("rank2") },
      3: { emoji: "🥉", label: t("rank3") },
    }),
    [t],
  );

  const activeStage = displayStages.includes(selectedStage)
    ? selectedStage
    : displayStages[0]!;
  const stageEntries = perStage[activeStage];
  const entries =
    stageEntries && stageEntries.length > 0
      ? stageEntries
      : isPreview
        ? buildPreviewEntries(overall)
        : [];

  return (
    <div className="flex flex-col gap-3">
      {isPreview && (
        <p className="px-3 text-[11px] leading-snug text-muted-foreground">
          {t("previewHint")}
        </p>
      )}

      <div className="overflow-x-auto px-3 pb-1">
        <ToggleGroup
          type="single"
          value={activeStage}
          onValueChange={(value) => {
            if (value) setSelectedStage(value);
          }}
          variant="outline"
          size="sm"
          className="w-max min-w-full"
        >
          {displayStages.map((stageKey) => (
            <ToggleGroupItem
              key={stageKey}
              value={stageKey}
              className="shrink-0 px-3"
            >
              {formatStageLabel(stageKey, tStages)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {t("noStagePicks")}
        </p>
      ) : canSeePlayerNames ? (
        <>
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span className="text-center">#</span>
            <span>{t("player")}</span>
            <span className="text-right">{t("stagePoints")}</span>
            <span className="text-right">{t("stagePicks")}</span>
          </div>

          {entries.map((entry) => {
            const isCurrentUser = entry.user_id === currentUserId;

            return (
              <div
                key={entry.user_id}
                className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
              >
                <LeaderboardRankCell rank={entry.rank} labels={rankLabels} />
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm" className="shrink-0">
                    {entry.photo_url && (
                      <AvatarImage
                        src={entry.photo_url}
                        alt={entry.display_name}
                      />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(entry.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[13px] font-medium leading-tight">
                      {entry.display_name}
                    </p>
                    {isCurrentUser && (
                      <Badge
                        variant="secondary"
                        className="h-4 shrink-0 rounded-md px-1.5 text-[10px]"
                      >
                        {tCommon("you")}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
                  {entry.points}
                </p>
                <p className="text-right text-[12px] tabular-nums text-muted-foreground">
                  {entry.picks}
                </p>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div className="grid grid-cols-[2rem_1fr] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span className="text-center">#</span>
            <span className="text-right">{t("stagePoints")}</span>
          </div>

          {entries.map((entry) => (
            <div
              key={entry.user_id}
              className="grid grid-cols-[2rem_1fr] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
            >
              <LeaderboardRankCell rank={entry.rank} labels={rankLabels} />
              <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
                {entry.points}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
