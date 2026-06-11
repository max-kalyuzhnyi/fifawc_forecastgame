"use client";

import { useTranslations } from "next-intl";
import type { LeaderboardAnalytics } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardOverallTable } from "@/features/leaderboard/ui/LeaderboardOverallTable";
import { LeaderboardPositionChart } from "@/features/leaderboard/ui/LeaderboardPositionChart";
import { LeaderboardStageTable } from "@/features/leaderboard/ui/LeaderboardStageTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardTabsProps {
  analytics: LeaderboardAnalytics;
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
}

export function LeaderboardTabs({
  analytics,
  currentUserId,
  canSeePlayerNames,
}: LeaderboardTabsProps) {
  const t = useTranslations("leaderboard");

  return (
    <Tabs defaultValue="overall" className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/[0.08] px-3 py-2">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overall">{t("tabOverall")}</TabsTrigger>
          <TabsTrigger value="stages">{t("tabStages")}</TabsTrigger>
          <TabsTrigger value="chart">{t("tabChart")}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="overall"
        className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <LeaderboardOverallTable
          entries={analytics.overall}
          canSeePlayerNames={canSeePlayerNames}
        />
      </TabsContent>

      <TabsContent
        value="stages"
        className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <LeaderboardStageTable
          stages={analytics.stages}
          perStage={analytics.perStage}
          overall={analytics.overall}
          currentUserId={currentUserId}
          canSeePlayerNames={canSeePlayerNames}
        />
      </TabsContent>

      <TabsContent
        value="chart"
        className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <LeaderboardPositionChart
          analytics={analytics}
          currentUserId={currentUserId}
          canSeePlayerNames={canSeePlayerNames}
        />
      </TabsContent>
    </Tabs>
  );
}
