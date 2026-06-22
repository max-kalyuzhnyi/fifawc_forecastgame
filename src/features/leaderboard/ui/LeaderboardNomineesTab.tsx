"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type {
  LeaderboardNominees,
  NomineeEntry,
} from "@/features/leaderboard/lib/buildAnalytics";
import { buildLeaderboardDisplayItems } from "@/features/leaderboard/lib/filterLeaderboardEntries";
import { LeaderboardRankCell } from "@/features/leaderboard/ui/LeaderboardRankCell";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type NomineeCategory = keyof LeaderboardNominees;

interface LeaderboardNomineesTabProps {
  nominees: LeaderboardNominees;
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
}

const NOMINEE_CATEGORIES: NomineeCategory[] = [
  "goldenBoot",
  "eagleEye",
  "boostHunter",
];

const SPECIALS_TOP_N = 3;

function NomineeEllipsisRow({ label }: { label: string }) {
  return (
    <div
      className="border-t border-white/[0.08] px-3 py-2 text-center text-[13px] font-medium text-muted-foreground"
      aria-hidden
    >
      {label}
    </div>
  );
}

function NomineeSection({
  category,
  entries,
  currentUserId,
  canSeePlayerNames,
}: {
  category: NomineeCategory;
  entries: NomineeEntry[];
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
}) {
  const t = useTranslations("leaderboard.nominees");
  const tLeaderboard = useTranslations("leaderboard");
  const tCommon = useTranslations("common");

  const displayItems = useMemo(
    () =>
      buildLeaderboardDisplayItems(entries, {
        topN: SPECIALS_TOP_N,
        currentUserId,
      }),
    [entries, currentUserId],
  );

  const rankLabels = useMemo(
    () => ({
      1: { emoji: "🥇", label: t("rank1") },
      2: { emoji: "🥈", label: t("rank2") },
      3: { emoji: "🥉", label: t("rank3") },
    }),
    [t],
  );

  return (
    <section className="flex flex-col">
      <div className="border-b border-white/[0.08] px-3 py-3">
        <h2 className="text-[13px] font-semibold text-foreground">
          {t(`${category}.title`)}
        </h2>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {t(`${category}.description`)}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-muted-foreground">
          {t("noNominees")}
        </p>
      ) : canSeePlayerNames ? (
        <>
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span className="text-center">#</span>
            <span>{t("player")}</span>
            <span className="text-right">{t(`${category}.valueLabel`)}</span>
          </div>

          {displayItems.map((item, index) => {
            if (item.type === "ellipsis") {
              return (
                <NomineeEllipsisRow
                  key={`ellipsis-${index}`}
                  label={tLeaderboard("rankGap")}
                />
              );
            }

            const entry = item.entry;
            const isCurrentUser = entry.user_id === currentUserId;

            return (
              <div
                key={entry.user_id}
                className="grid grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
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
                  {entry.value}
                </p>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div className="grid grid-cols-[2rem_1fr] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span className="text-center">#</span>
            <span className="text-right">{t(`${category}.valueLabel`)}</span>
          </div>

          {displayItems.map((item, index) => {
            if (item.type === "ellipsis") {
              return (
                <NomineeEllipsisRow
                  key={`ellipsis-${index}`}
                  label={tLeaderboard("rankGap")}
                />
              );
            }

            const entry = item.entry;

            return (
              <div
                key={entry.user_id}
                className="grid grid-cols-[2rem_1fr] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
              >
                <LeaderboardRankCell rank={entry.rank} labels={rankLabels} />
                <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
                  {entry.value}
                </p>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

export function LeaderboardNomineesTab({
  nominees,
  currentUserId,
  canSeePlayerNames,
}: LeaderboardNomineesTabProps) {
  const t = useTranslations("leaderboard.nominees");

  return (
    <div className="flex flex-col gap-4 pb-4">
      <p className="px-3 pt-2 text-[11px] leading-snug text-muted-foreground">
        {t("intro")}
      </p>

      {NOMINEE_CATEGORIES.map((category) => (
        <NomineeSection
          key={category}
          category={category}
          entries={nominees[category]}
          currentUserId={currentUserId}
          canSeePlayerNames={canSeePlayerNames}
        />
      ))}
    </div>
  );
}
