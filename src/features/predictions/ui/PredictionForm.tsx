"use client";

import { useActionState, useState } from "react";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { savePrediction } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TeamName } from "@/shared/ui/TeamFlag";

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
  const [scorerPlayerId, setScorerPlayerId] = useState(
    initial?.scorer_player_id ?? "",
  );
  const [boost, setBoost] = useState(String(initial?.boost_multiplier ?? 1));

  const homePlayers = players.filter((p) => p.team_id === homeTeamId);
  const awayPlayers = players.filter((p) => p.team_id === awayTeamId);

  if (locked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictions locked</CardTitle>
          {initial && (
            <CardDescription>
              Your pick: {initial.home_score}–{initial.away_score}
              {initial.scorer_name && ` · Scorer: ${initial.scorer_name}`}
              {initial.boost_multiplier > 1 && ` · x${initial.boost_multiplier}`}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="scorer_player_id" value={scorerPlayerId} />
      <input type="hidden" name="boost_multiplier" value={boost} />

      <FieldGroup>
        <div className="flex items-center gap-4">
          <Field className="flex-1">
            <Input
              id="home_score"
              name="home_score"
              type="number"
              min={0}
              max={20}
              defaultValue={initial?.home_score ?? 0}
              placeholder={homeTeamName}
              aria-label={homeTeamName}
              required
            />
          </Field>
          <span className="text-muted-foreground">:</span>
          <Field className="flex-1">
            <Input
              id="away_score"
              name="away_score"
              type="number"
              min={0}
              max={20}
              defaultValue={initial?.away_score ?? 0}
              placeholder={awayTeamName}
              aria-label={awayTeamName}
              required
            />
          </Field>
        </div>

        <Field>
          <Select
            value={scorerPlayerId || "none"}
            onValueChange={(value) =>
              setScorerPlayerId(value === "none" ? "" : value)
            }
          >
            <SelectTrigger className="w-full" aria-label="Goalscorer">
              <SelectValue placeholder="Goalscorer (+3)" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">None</SelectItem>
              </SelectGroup>
              {homePlayers.length > 0 && (
                <SelectGroup>
                  <SelectLabel>
                    <TeamName name={homeTeamName} />
                  </SelectLabel>
                  {homePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {awayPlayers.length > 0 && (
                <SelectGroup>
                  <SelectLabel>
                    <TeamName name={awayTeamName} />
                  </SelectLabel>
                  {awayPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          <Input
            name="scorer_name"
            type="text"
            placeholder="Or type a name manually"
            aria-label="Scorer name"
            defaultValue={initial?.scorer_name ?? ""}
            className="mt-2"
          />
        </Field>

        <Field>
          <ToggleGroup
            type="single"
            variant="outline"
            value={boost}
            onValueChange={(value) => {
              if (value) setBoost(value);
            }}
            aria-label="Boost"
          >
            {([1, 2, 3] as const).map((mult) => {
              const disabled =
                mult === 2
                  ? boostUsed.x2 && currentBoost !== 2
                  : mult === 3
                    ? boostUsed.x3 && currentBoost !== 3
                    : false;

              return (
                <ToggleGroupItem
                  key={mult}
                  value={String(mult)}
                  disabled={disabled}
                  aria-label={mult === 1 ? "No boost" : `Boost x${mult}`}
                >
                  {mult === 1 ? "None" : `x${mult}`}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          <FieldDescription>One x2 and one x3 boost per round.</FieldDescription>
        </Field>

        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state?.success && (
          <Alert>
            <AlertDescription>Prediction saved!</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save prediction"}
        </Button>
      </FieldGroup>
    </form>
  );
}
