import { Suspense } from "react";
import { loadMatchesBundle } from "@/features/matches/lib/loadMatchesBundle";
import { MatchesView } from "@/features/matches/ui/MatchesView";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const bundle = await loadMatchesBundle();

  if (bundle.matches.length === 0) {
    return (
      <Empty className="glass corner-squircle mt-4 rounded-3xl border-0">
        <EmptyHeader>
          <EmptyTitle>No matches loaded yet</EmptyTitle>
          <EmptyDescription>
            An admin should run{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
              npm run import:schedule
            </code>
            .
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Suspense>
      <MatchesView
        serverMatches={bundle.matches}
        voterMap={bundle.voterMap}
        predictionMap={bundle.predictionMap}
        playersByMatch={bundle.playersByMatch}
        predictionsByMatch={bundle.predictionsByMatch}
        scorersByMatch={bundle.scorersByMatch}
        scorerPlayerIdsByMatch={bundle.scorerPlayerIdsByMatch}
        eventsByMatch={bundle.eventsByMatch}
        currentUserId={bundle.currentUserId}
        teamColors={bundle.teamColors}
        playerPhotosByTeam={bundle.playerPhotosByTeam}
        upsetMatchIds={bundle.upsetMatchIds}
        showPlayoffUi={bundle.showPlayoffUi}
        userTier={bundle.userTier}
      />
    </Suspense>
  );
}
