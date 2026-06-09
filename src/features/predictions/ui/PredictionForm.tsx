"use client";

import { useActionState } from "react";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { savePrediction } from "../actions";

interface PlayerOption {
  id: string;
  name: string;
  team_id: string;
}

interface PredictionFormProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  players: PlayerOption[];
  initial?: {
    home_score: number;
    away_score: number;
    scorer_player_id: string | null;
    scorer_name: string | null;
    boost_multiplier: BoostMultiplier;
  };
  locked: boolean;
  boostUsed: { x2: boolean; x3: boolean };
  currentBoost: BoostMultiplier;
}

export function PredictionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  players,
  initial,
  locked,
  boostUsed,
  currentBoost,
}: PredictionFormProps) {
  const [state, action, pending] = useActionState(savePrediction, null);

  const homePlayers = players.filter((p) => p.team_id === homeTeamId);
  const awayPlayers = players.filter((p) => p.team_id === awayTeamId);

  if (locked) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="font-medium">Predictions locked</p>
        {initial && (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your pick: {initial.home_score}–{initial.away_score}
            {initial.scorer_name && ` · Scorer: ${initial.scorer_name}`}
            {initial.boost_multiplier > 1 && ` · x${initial.boost_multiplier}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="match_id" value={matchId} />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            {homeTeamName}
          </label>
          <input
            name="home_score"
            type="number"
            min={0}
            max={20}
            defaultValue={initial?.home_score ?? 0}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <span className="pt-5 text-zinc-400">:</span>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            {awayTeamName}
          </label>
          <input
            name="away_score"
            type="number"
            min={0}
            max={20}
            defaultValue={initial?.away_score ?? 0}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Goalscorer (+3)</label>
        <select
          name="scorer_player_id"
          defaultValue={initial?.scorer_player_id ?? ""}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">None</option>
          {homePlayers.length > 0 && (
            <optgroup label={homeTeamName}>
              {homePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
          {awayPlayers.length > 0 && (
            <optgroup label={awayTeamName}>
              {awayPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <input
          name="scorer_name"
          type="text"
          placeholder="Or type a name manually"
          defaultValue={initial?.scorer_name ?? ""}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Boost</label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((mult) => {
            const disabled =
              mult === 2
                ? boostUsed.x2 && currentBoost !== 2
                : mult === 3
                  ? boostUsed.x3 && currentBoost !== 3
                  : false;
            return (
              <label
                key={mult}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  disabled ? "cursor-not-allowed opacity-40" : ""
                }`}
              >
                <input
                  type="radio"
                  name="boost_multiplier"
                  value={mult}
                  defaultChecked={(initial?.boost_multiplier ?? 1) === mult}
                  disabled={disabled}
                />
                {mult === 1 ? "None" : `x${mult}`}
              </label>
            );
          })}
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-emerald-600">Prediction saved!</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save prediction"}
      </button>
    </form>
  );
}
