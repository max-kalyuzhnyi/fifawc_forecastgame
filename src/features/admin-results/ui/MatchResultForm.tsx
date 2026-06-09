"use client";

import { useActionState } from "react";
import { saveMatchResult } from "../actions";

interface MatchResultFormProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialHome?: number | null;
  initialAway?: number | null;
  initialScorers?: string;
}

export function MatchResultForm({
  matchId,
  homeTeamName,
  awayTeamName,
  initialHome,
  initialAway,
  initialScorers = "",
}: MatchResultFormProps) {
  const [state, action, pending] = useActionState(saveMatchResult, null);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <input type="hidden" name="match_id" value={matchId} />
      <p className="text-sm font-medium">
        {homeTeamName} vs {awayTeamName}
      </p>
      <div className="flex gap-2">
        <input
          name="home_score"
          type="number"
          min={0}
          defaultValue={initialHome ?? 0}
          required
          className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="py-1">–</span>
        <input
          name="away_score"
          type="number"
          min={0}
          defaultValue={initialAway ?? 0}
          required
          className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <input
        name="scorers"
        type="text"
        placeholder="Scorers (comma-separated)"
        defaultValue={initialScorers}
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-emerald-600">Saved</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save result"}
      </button>
    </form>
  );
}
