"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LeaderboardAnalytics } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardNomineesTab } from "@/features/leaderboard/ui/LeaderboardNomineesTab";
import { LeaderboardOverallTable } from "@/features/leaderboard/ui/LeaderboardOverallTable";
import { LeaderboardPositionChart } from "@/features/leaderboard/ui/LeaderboardPositionChart";
import { LeaderboardStageTable } from "@/features/leaderboard/ui/LeaderboardStageTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("overall");

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex flex-col"
    >
      <div className="shrink-0 border-b border-white/[0.08] px-3 py-2">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overall">{t("tabOverall")}</TabsTrigger>
          <TabsTrigger value="stages">{t("tabStages")}</TabsTrigger>
          <TabsTrigger value="specials">{t("tabSpecials")}</TabsTrigger>
          <TabsTrigger value="chart">{t("tabChart")}</TabsTrigger>
        </TabsList>
      </div>

      <div className="mt-0">
        {activeTab === "overall" && (
          <LeaderboardOverallTable
            entries={analytics.overall}
            currentUserId={currentUserId}
            canSeePlayerNames={canSeePlayerNames}
          />
        )}
        {activeTab === "stages" && (
          <LeaderboardStageTable
            stages={analytics.stages}
            perStage={analytics.perStage}
            overall={analytics.overall}
            currentUserId={currentUserId}
            canSeePlayerNames={canSeePlayerNames}
          />
        )}
        {activeTab === "specials" && (
          <LeaderboardNomineesTab
            nominees={analytics.nominees}
            currentUserId={currentUserId}
            canSeePlayerNames={canSeePlayerNames}
          />
        )}
        {activeTab === "chart" && (
          <LeaderboardPositionChart
            analytics={analytics}
            currentUserId={currentUserId}
            canSeePlayerNames={canSeePlayerNames}
          />
        )}
      </div>
    </Tabs>
  );
}
