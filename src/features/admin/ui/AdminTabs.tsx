"use client";

import { useTranslations } from "next-intl";
import type { NextMatchPickers, UserWithPicks } from "@/features/admin/lib/types";
import type {
  AdminMatch,
  AdminPlayer,
  AdminPrediction,
  AdminProfile,
  AdminTeam,
} from "@/features/admin/lib/types";
import { CommunicationsTab } from "@/features/admin/ui/CommunicationsTab";
import { ResultsTab } from "@/features/admin/ui/ResultsTab";
import { UsersTab } from "@/features/admin/ui/UsersTab";
import { PicksTab } from "@/features/admin/ui/PicksTab";
import { TeamsTab } from "@/features/admin/ui/TeamsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminTabsProps {
  teams: AdminTeam[];
  matches: AdminMatch[];
  players: AdminPlayer[];
  scorersByMatch: Record<string, string[]>;
  users: UserWithPicks[];
  profiles: AdminProfile[];
  predictions: AdminPrediction[];
  pickers: NextMatchPickers | null;
  currentUserId: string | null;
}

export function AdminTabs({
  teams,
  matches,
  players,
  scorersByMatch,
  users,
  profiles,
  predictions,
  pickers,
  currentUserId,
}: AdminTabsProps) {
  const t = useTranslations("admin");

  return (
    <Tabs defaultValue="picks" className="flex min-h-0 flex-1 flex-col gap-4">
      <TabsList className="w-full overflow-x-auto">
        <TabsTrigger value="communications">{t("tabs.communications")}</TabsTrigger>
        <TabsTrigger value="picks">{t("tabs.picks")}</TabsTrigger>
        <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
        <TabsTrigger value="teams">{t("tabs.teams")}</TabsTrigger>
        <TabsTrigger value="results">{t("tabs.results")}</TabsTrigger>
      </TabsList>

      <TabsContent value="communications" className="min-h-0 overflow-y-auto">
        <CommunicationsTab
          profiles={profiles}
          predictions={predictions}
          matches={matches}
        />
      </TabsContent>

      <TabsContent value="picks" className="min-h-0 overflow-y-auto">
        <PicksTab pickers={pickers} />
      </TabsContent>

      <TabsContent value="users" className="min-h-0 overflow-y-auto">
        <UsersTab users={users} currentUserId={currentUserId} />
      </TabsContent>

      <TabsContent value="teams" className="min-h-0 overflow-y-auto">
        <TeamsTab teams={teams} players={players} />
      </TabsContent>

      <TabsContent value="results" className="min-h-0 overflow-y-auto">
        <ResultsTab
          teams={teams}
          matches={matches}
          scorersByMatch={scorersByMatch}
        />
      </TabsContent>
    </Tabs>
  );
}
